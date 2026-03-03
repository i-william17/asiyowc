const mongoose = require("mongoose");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const Program = require("../models/Program");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { sendExpoPushToUser } = require("../utils/push");

/* ========================================================================
   GAMIFICATION (User.gamification) — SAFE, ATOMIC, NON-BREAKING
   - Awards milestones + XP into User.gamification
   - Prevents duplicates (key + program)
   - Awards only ONE program badge: "growth"
======================================================================== */

const XP_PER_LEVEL = 200; // tweak freely

const MILESTONES = [
  { key: "FIRST_ENROLLMENT", title: "First Step Taken", xp: 20, scope: "global" },
  { key: "FIRST_MODULE", title: "Momentum Started", xp: 30, scope: "global" },
  { key: "HALF_PROGRESS", title: "Halfway There", xp: 50, scope: "program" },
  { key: "PROGRAM_COMPLETE", title: "Program Conqueror", xp: 100, scope: "program" },
  { key: "FIVE_PROGRAMS", title: "Growth Champion", xp: 300, scope: "global" },
  { key: "TEN_MODULES", title: "Knowledge Builder", xp: 120, scope: "global" },
  { key: "FIRST_REVIEW", title: "Voice of Impact", xp: 25, scope: "global" },
  // Not implemented here: CONSISTENT_LEARNER (needs streak tracking)
  // Not implemented here: HIGH_ACHIEVER (needs quiz endpoint/grades)
  { key: "COMMUNITY_CONTRIBUTOR", title: "Community Builder", xp: 70, scope: "global" },
];

const getMilestoneDef = (key) => MILESTONES.find((m) => m.key === key) || null;

const normalizeObjectId = (v) => (v?._id ? v._id.toString() : v?.toString());

const awardMilestone = async ({ userId, key, programId = null }) => {
  try {
    const def = getMilestoneDef(key);
    if (!def) return { awarded: false, reason: "Unknown milestone" };

    const uid = new mongoose.Types.ObjectId(userId);
    const programValue = programId ? new mongoose.Types.ObjectId(programId) : null;

    const filter = {
      _id: uid,
      "gamification.milestones": {
        $not: {
          $elemMatch: programId
            ? { key, program: programValue }
            : { key, $or: [{ program: null }, { program: { $exists: false } }] },
        },
      },
    };

    const updatePipeline = [
      {
        $set: {
          _gx: { $ifNull: ["$gamification.xp", 0] },
          _gm: { $ifNull: ["$gamification.milestones", []] },
        },
      },
      {
        $set: {
          "gamification.xp": { $add: ["$_gx", def.xp] },
          "gamification.milestones": {
            $concatArrays: [
              "$_gm",
              [{ key, program: programValue, points: def.xp, achievedAt: "$$NOW" }],
            ],
          },
        },
      },
      {
        $set: {
          "gamification.level": {
            $add: [1, { $floor: { $divide: ["$gamification.xp", XP_PER_LEVEL] } }],
          },
        },
      },
      { $unset: ["_gx", "_gm"] },
    ];

    const result = await User.updateOne(filter, updatePipeline);
    const awarded = result.modifiedCount === 1;

    // ✅ If milestone was actually awarded, send push
    if (awarded) {
      const user = await User.findById(uid).select("pushTokens gamification profile.fullName");

      await sendExpoPushToUser(user, {
        title: "🎉 Milestone Achieved!",
        body: `${def.title} (+${def.xp} XP)`,
        data: {
          type: "milestone",
          milestone: key,
          programId: programId ? programId.toString() : null,
        },
      });
    }

    return { awarded, xp: def.xp, key };
  } catch (e) {
    console.error("awardMilestone ERROR:", e);
    return { awarded: false, reason: "awardMilestone error" };
  }
};

const awardGrowthBadge = async (userId) => {
  try {
    await User.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $addToSet: { badges: "growth" } } // your rule: only ONE program badge
    );
  } catch (e) {
    console.error("awardGrowthBadge ERROR:", e);
  }
};

const countCompletedPrograms = async (userId) => {
  try {
    return Program.countDocuments({
      participants: { $elemMatch: { user: new mongoose.Types.ObjectId(userId), progress: 100 } },
    });
  } catch (e) {
    console.error("countCompletedPrograms ERROR:", e);
    return 0;
  }
};

const countCompletedModules = async (userId) => {
  try {
    const uid = new mongoose.Types.ObjectId(userId);

    const agg = await Program.aggregate([
      { $match: { "participants.user": uid } },
      { $unwind: "$participants" },
      { $match: { "participants.user": uid } },
      {
        $project: {
          cnt: { $size: { $ifNull: ["$participants.completedModules", []] } },
        },
      },
      { $group: { _id: null, total: { $sum: "$cnt" } } },
    ]);

    return agg?.[0]?.total || 0;
  } catch (e) {
    console.error("countCompletedModules ERROR:", e);
    return 0;
  }
};

const countProgramCommentsByUser = async (userId) => {
  try {
    const uid = new mongoose.Types.ObjectId(userId);
    const agg = await Program.aggregate([
      { $match: { "comments.user": uid } },
      { $unwind: "$comments" },
      { $match: { "comments.user": uid } },
      { $group: { _id: null, total: { $sum: 1 } } },
    ]);
    return agg?.[0]?.total || 0;
  } catch (e) {
    console.error("countProgramCommentsByUser ERROR:", e);
    return 0;
  }
};

/* ========================================================================
   INTERNAL HELPER: CREATE PROGRAM NOTIFICATIONS (Organizer + Participant)
======================================================================== */
const createProgramNotifications = async ({
  program,
  user,
  type,
  title,
  message,
  priority = "medium",
}) => {
  try {
    if (!program || !user) return;

    const recipients = new Set();

    if (program.organizer) {
      recipients.add(program.organizer.toString());
    }
    if (user._id) {
      recipients.add(user._id.toString());
    }

    if (recipients.size === 0) return;

    const notifications = Array.from(recipients).map((recipient) => ({
      recipient,
      type,
      title,
      message,
      data: {
        programId: program._id,
        userId: user._id,
      },
      priority,
    }));

    await Notification.insertMany(notifications);
  } catch (err) {
    console.error("Notification ERROR:", err);
  }
};

// ========================================================================
// GET ALL PROGRAMS (Search handled on frontend after fetch)
// ========================================================================
exports.getAllPrograms = async (req, res) => {
  try {
    const {
      category,
      status,
      search,
      featured = "false",
      page = 1,
      limit = 12,
    } = req.query;

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (category && category !== "All") query.category = category;
    if (status) query.status = status;
    if (featured === "true") query.featured = true;

    // ✅ Prefer TEXT search (you already have text index)
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // ✅ limit+1 trick -> hasNextPage, no countDocuments needed
    const docs = await Program.find(query)
      .select([
        "title",
        "shortDescription",
        "image",
        "category",
        "difficulty",
        "duration",
        "price",
        "featured",
        "status",
        "analytics.averageRating",
        "analytics.totalRatings",
        "analytics.enrollments",
        "createdAt",
        "organizer",
        "participants", // we use it ONLY to derive count, then strip it
      ])
      .populate("organizer", "profile.fullName profile.avatar")
      .sort(
        query.$text
          ? { score: { $meta: "textScore" }, createdAt: -1 }
          : { createdAt: -1 }
      )
      .skip(skip)
      .limit(limitNum + 1)
      .lean();

    const hasNextPage = docs.length > limitNum;
    const pageDocs = hasNextPage ? docs.slice(0, limitNum) : docs;

    const programs = pageDocs.map((p) => ({
      _id: p._id,
      title: p.title,
      shortDescription: p.shortDescription,
      image: p.image,
      category: p.category,
      difficulty: p.difficulty,
      duration: p.duration,
      price: p.price,
      featured: p.featured,
      status: p.status,
      analytics: p.analytics,
      organizer: p.organizer,
      createdAt: p.createdAt,

      // ✅ derived field
      participantsCount: Array.isArray(p.participants) ? p.participants.length : 0,
    }));

    return res.json({
      success: true,
      data: {
        programs,
        pagination: {
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    console.error("getAllPrograms ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET SINGLE PROGRAM (+ user enrollment & progress)
// ========================================================================
exports.getProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id)
      .populate("organizer", "profile.fullName profile.avatar")
      .populate("participants.user", "profile.fullName profile.avatar")
      .populate("reviews.user", "profile.fullName profile.avatar")
      .populate("comments.user", "profile.fullName profile.avatar");

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Clean null users
    program.participants = program.participants.filter((p) => p.user);

    const extractId = (u) => {
      if (!u) return null;
      if (u._id) return u._id.toString();
      return u.toString();
    };

    const userId = req.user?.id?.toString() || null;

    let isEnrolled = false;
    let userProgress = null;

    if (userId) {
      for (const p of program.participants) {
        if (extractId(p.user) === userId) {
          isEnrolled = true;
          userProgress = p;
          break;
        }
      }
    }

    // ✅ ALSO RETURN USER GAMIFICATION (optional)
    const userGamification = userId
      ? await User.findById(userId).select("gamification badges profile.fullName")
      : null;

    return res.json({
      success: true,
      data: {
        program,
        isEnrolled,
        userProgress,
        userGamification,
      },
    });
  } catch (error) {
    console.error("getProgram ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================================================
// CREATE PROGRAM
// ========================================================================
exports.createProgram = async (req, res) => {
  try {
    const program = await Program.create({
      ...req.body,
      image: req.file ? req.file.path : req.body.image,
      organizer: req.user.id,
      participants: [],
    });

    res.status(201).json({
      success: true,
      message: "Program created successfully",
      data: { program },
    });
  } catch (error) {
    console.error("createProgram ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// UPDATE PROGRAM
// ========================================================================
exports.updateProgram = async (req, res) => {
  try {
    let program = await Program.findById(req.params.id);

    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    // Only organizer or admin can update
    if (
      program.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    program = await Program.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Program updated successfully",
      data: { program },
    });
  } catch (error) {
    console.error("updateProgram ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// DELETE PROGRAM
// ========================================================================
exports.deleteProgram = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    if (
      program.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await program.remove();

    res.json({
      success: true,
      message: "Program deleted successfully",
    });
  } catch (error) {
    console.error("deleteProgram ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// ENROLL (FREE PROGRAMS ONLY)
// ========================================================================
exports.enrollInProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;

    // Add user only if NOT already in participants
    const updated = await Program.findOneAndUpdate(
      {
        _id: programId,
        "participants.user": { $ne: userId }
      },
      {
        $push: {
          participants: {
            user: userId,
            progress: 0,
            enrolledAt: new Date()
          }
        }
      },
      { new: true }
    ).populate(
      "participants.user",
      "profile.fullName profile.avatar"
    );

    // CASE 1 — USER ALREADY ENROLLED
    if (!updated) {
      const program = await Program.findById(programId).populate(
        "participants.user",
        "profile.fullName profile.avatar"
      );

      if (!program) {
        return res.status(404).json({
          success: false,
          message: "Program not found"
        });
      }

      const existing = program.participants.find(
        (p) => p.user.toString() === userId
      );

      return res.status(200).json({
        success: true,
        data: {
          program,
          isEnrolled: true,
          userProgress: existing || { progress: 0 }
        }
      });
    }

    // CASE 2 — SUCCESSFUL ENROLLMENT
    const userProgress = { progress: 0 };

    // Create notification
    const fullName = req.user?.profile?.fullName || req.user?.fullName || "User";
    await createProgramNotifications({
      program: updated,
      user: req.user,
      type: "program_enrollment",
      title: "New Enrollment",
      message: `${fullName} enrolled in ${updated.title}.`
    });

    // ✅ GAMIFICATION: FIRST_ENROLLMENT (global, once)
    await awardMilestone({ userId, key: "FIRST_ENROLLMENT" });

    // ⭐ IMPORTANT: MATCH getProgram() RESPONSE STRUCTURE
    return res.status(201).json({
      success: true,
      data: {
        program: updated,
        isEnrolled: true,
        userProgress
      }
    });
  } catch (err) {
    console.error("Enroll ERROR:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ========================================================================
// BUY PROGRAM (PAID)
// ========================================================================
exports.buyProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;

    // Check program existence first
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    // Can't buy free programs
    if (program.price.amount === 0) {
      return res.status(400).json({
        success: false,
        message: "Program is free. Use enroll() instead.",
      });
    }

    /* ============================================================
       ATOMIC UPDATE → PREVENT DUPLICATES
       Adds participant ONLY IF they don't already exist
    ============================================================ */
    const updatedProgram = await Program.findOneAndUpdate(
      {
        _id: programId,
        "participants.user": { $ne: userId }, // ensure user is not already enrolled
      },
      {
        $addToSet: {
          participants: {
            user: userId,
            purchaseStatus: "paid",
            progress: 0,
            enrolledAt: new Date(),
          },
        },
        $inc: { "analytics.enrollments": 1 },
      },
      { new: true }
    );

    /* ============================================================
       IF updatedProgram == null → user already purchased/enrolled
    ============================================================ */
    if (!updatedProgram) {
      return res.status(400).json({
        success: false,
        message: "Already purchased or enrolled.",
      });
    }

    /* ============================================================
       SEND NOTIFICATION
    ============================================================ */
    const fullName =
      req.user?.profile?.fullName ||
      req.user?.fullName ||
      "Someone";

    await createProgramNotifications({
      program: updatedProgram,
      user: req.user,
      type: "program_enrollment",
      title: "Program Purchased",
      message: `${fullName} purchased and enrolled in ${updatedProgram.title}.`,
    });

    // ✅ GAMIFICATION: FIRST_ENROLLMENT (global, once)
    await awardMilestone({ userId, key: "FIRST_ENROLLMENT" });

    return res.status(200).json({
      success: true,
      message: "Program purchased successfully",
      isEnrolled: true,
      purchaseStatus: "paid",
      totalParticipants: updatedProgram.participants.length,
    });
  } catch (error) {
    console.error("buyProgram ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// LEAVE PROGRAM (BUT DO NOT REMOVE IF COMPLETED)
// ========================================================================
exports.leaveProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    const participant = program.participants.find(
      (p) => p.user.toString() === userId
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: "You are not enrolled in this program",
      });
    }

    // 🚫 If user completed program, prevent removal of history
    if (participant.progress === 100) {
      return res.status(400).json({
        success: false,
        completed: true,
        message:
          "You have completed this program. Certificate remains available, unenrollment is disabled.",
      });
    }

    // ✅ Otherwise allow unenrollment normally
    const updated = await Program.findOneAndUpdate(
      {
        _id: programId,
        "participants.user": userId,
      },
      {
        $pull: { participants: { user: userId } },
        $inc: { "analytics.enrollments": -1 },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "You have left the program",
      isEnrolled: false,
      totalParticipants: updated.participants.length,
    });

  } catch (error) {
    console.error("leaveProgram ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// COMPLETE MODULE (SCHEMA-COMPLIANT)
// ========================================================================
exports.completeModule = async (req, res) => {
  try {
    const programId = req.params.id;
    const moduleOrder = parseInt(req.params.moduleOrder, 10);
    const userId = req.user.id;

    const program = await Program.findById(programId)
      .populate("participants.user", "profile.fullName profile.avatar");

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    const participant = program.participants.find(
      (p) => normalizeObjectId(p.user) === normalizeObjectId(userId)
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: "User is not enrolled in this program",
      });
    }

    const totalModules = program.modules.length;
    const moduleIndex = moduleOrder - 1;

    if (moduleIndex < 0 || moduleIndex >= totalModules) {
      return res.status(400).json({
        success: false,
        message: "Invalid module order",
      });
    }

    // Check if module already completed
    const alreadyDone = participant.completedModules.some(
      (m) => m.moduleOrder === moduleOrder
    );

    if (!alreadyDone) {
      participant.completedModules.push({
        moduleOrder,
        completedAt: new Date(),
      });
    }

    // Compute progress
    const completedCount = participant.completedModules.length;
    const progress =
      totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    participant.progress = progress;

    // ============================================================
    // 🎓 ISSUE CERTIFICATE IF COMPLETED
    // ============================================================
    if (progress === 100 && !participant.certificateIssued) {
      const certId = new mongoose.Types.ObjectId().toString();
      const certificateUrl = `${process.env.FRONTEND_URL}/certificate/${certId}`;

      participant.certificateIssued = true;
      participant.completedAt = new Date();

      participant.certificate = {
        id: certId,
        issuedAt: new Date(),
        downloadUrl: certificateUrl,
        verified: true,
      };

      await createProgramNotifications({
        program,
        user: req.user,
        type: "program_certificate",
        title: "Certificate Awarded",
        message: `Congratulations! You earned a certificate for completing ${program.title}.`,
      });
    }

    await program.save();

    /* ============================================================
       ✅ GAMIFICATION AWARDS (after save)
       - FIRST_MODULE (global) when first-ever new module completion happens
       - HALF_PROGRESS (per program) when progress >= 50
       - PROGRAM_COMPLETE (per program) when progress == 100
       - FIVE_PROGRAMS (global) when completed programs >= 5
       - TEN_MODULES (global) when total modules >= 10
    ============================================================ */

    // FIRST_MODULE (global, once) — only when this call actually added a module completion
    if (!alreadyDone) {
      await awardMilestone({ userId, key: "FIRST_MODULE" });
    }

    // HALF_PROGRESS (per program, once)
    if (participant.progress >= 50) {
      await awardMilestone({ userId, key: "HALF_PROGRESS", programId });
    }

    // PROGRAM_COMPLETE (per program, once)
    if (participant.progress === 100) {
      const completion = await awardMilestone({
        userId,
        key: "PROGRAM_COMPLETE",
        programId,
      });

      // Award the ONLY program badge you want
      if (completion.awarded) {
        await awardGrowthBadge(userId);
      }

      // FIVE_PROGRAMS (global, once)
      const completedPrograms = await countCompletedPrograms(userId);
      if (completedPrograms >= 5) {
        await awardMilestone({ userId, key: "FIVE_PROGRAMS" });
      }
    }

    // TEN_MODULES (global, once)
    const completedModulesTotal = await countCompletedModules(userId);
    if (completedModulesTotal >= 10) {
      await awardMilestone({ userId, key: "TEN_MODULES" });
    }

    return res.status(200).json({
      success: true,
      data: {
        completedModules: participant.completedModules,
        progress: participant.progress,
        isCompleted: progress === 100,
        certificate: participant.certificateIssued ? participant.certificate : null,
      },
    });

  } catch (err) {
    console.error("Complete Module ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// ========================================================================
// ADD MODULE
// ========================================================================
exports.addModule = async (req, res) => {
  try {
    const { programId } = req.params;
    const { title, description, contentUrl } = req.body;

    const program = await Program.findById(programId);
    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    const newModule = {
      title,
      description,
      contentUrl,
      completedBy: [], // NOTE: you said this is removed in schema, but leaving as-is to avoid structure change
    };

    program.modules.push(newModule);
    await program.save();

    console.log("PARTICIPANT LIST:", program.participants);
    // ✅ FIX: userId was undefined here (remove to avoid breaking)
    // console.log("USER ID:", userId);

    res.status(201).json({
      success: true,
      message: "Module added successfully",
      data: program.modules,
    });
  } catch (error) {
    console.error("ADD MODULE ERROR:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// ADD REVIEW (SAFE FULLNAME HANDLING)
// ========================================================================
exports.addReview = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program)
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });

    const { rating, reviewText } = req.body;

    const exists = program.reviews.some(
      (r) => r.user.toString() === req.user.id
    );
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Already reviewed" });
    }

    program.reviews.push({
      user: req.user.id,
      rating,
      reviewText,
    });

    const sum = program.reviews.reduce((a, b) => a + b.rating, 0);
    program.analytics.averageRating = sum / program.reviews.length;
    program.analytics.totalRatings = program.reviews.length;

    await program.save();

    const reviewerName =
      req.user?.profile?.fullName ||
      req.user?.fullName ||
      req.user?.name ||
      "Someone";

    await Notification.create({
      recipient: program.organizer,
      type: "system_alert",
      title: "New Review",
      message: `${reviewerName} reviewed your program.`,
      data: {
        programId: program._id,
        userId: req.user._id,
      },
      priority: "medium",
    });

    // ✅ GAMIFICATION: FIRST_REVIEW (global, once)
    await awardMilestone({ userId: req.user.id, key: "FIRST_REVIEW" });

    res.json({ success: true, message: "Review submitted" });
  } catch (error) {
    console.error("addReview ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// ADD COMMENT (threaded comments)
// ========================================================================
exports.addComment = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);
    if (!program)
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });

    program.comments.push({
      user: req.user.id,
      text: req.body.text,
      parent: req.body.parent || null,
    });

    await program.save();

    // ✅ GAMIFICATION: COMMUNITY_CONTRIBUTOR once user has >= 5 comments across programs
    const totalComments = await countProgramCommentsByUser(req.user.id);
    if (totalComments >= 5) {
      await awardMilestone({ userId: req.user.id, key: "COMMUNITY_CONTRIBUTOR" });
    }

    res.json({ success: true, message: "Comment added" });
  } catch (error) {
    console.error("addComment ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE REVIEW (User must be program participant)
exports.deleteReview = async (req, res) => {
  try {
    const { id, reviewId } = req.params;

    console.log("\n===================== DELETE REVIEW =====================");
    console.log("🗑️ DELETE REVIEW REQUEST:", {
      programId: id,
      reviewId,
      user: req.user?._id,
      role: req.user?.role
    });

    if (!req.user?._id) {
      console.log("❌ req.user missing → auth middleware not applied");
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const userId = req.user._id.toString();
    const program = await Program.findById(id);
    if (!program) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    console.log("📌 TOTAL REVIEWS BEFORE:", program.reviews.length);

    const isParticipant = program.participants.some(
      (p) => p.user.toString() === userId
    );
    console.log("👥 Is Participant?:", isParticipant);

    if (!isParticipant) {
      console.log("❌ User is NOT a participant → cannot delete");
      return res.status(403).json({
        success: false,
        message: "Only enrolled participants can delete reviews"
      });
    }

    const review = program.reviews.id(reviewId);
    if (!review) {
      console.log("❌ Review not found");
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    console.log("🗑️ Deleting review...");
    review.deleteOne();
    await program.save();

    console.log("📌 TOTAL REVIEWS AFTER:", program.reviews.length);
    console.log("✅ REVIEW DELETED SUCCESSFULLY\n");

    return res.json({
      success: true,
      message: "Review deleted",
      data: { reviewId, reviews: program.reviews }
    });

  } catch (err) {
    console.error("🔥 DELETE REVIEW ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE COMMENT + REPLIES (FULLY FIXED)
exports.deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    console.log("\n===================== DELETE COMMENT =====================");
    console.log("🗑️ REQUEST:", {
      programId: id,
      commentId,
      userId: req.user?._id,
      role: req.user?.role
    });

    const program = await Program.findById(id);
    if (!program) {
      console.log("❌ Program not found");
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    console.log("📌 TOTAL COMMENTS BEFORE:", program.comments.length);

    const requester = req.user?._id?.toString();
    const participantIds = program.participants.map(p => p.user.toString());

    console.log("👥 Participants:", participantIds);
    console.log("👤 Request User:", requester);

    const isParticipant = participantIds.includes(requester);
    console.log("🔐 Participant Check:", isParticipant);

    if (!isParticipant) {
      console.log("❌ Not a participant");
      return res.status(403).json({
        success: false,
        message: "Only participants can delete comments"
      });
    }

    const comment = program.comments.id(commentId);
    if (!comment) {
      console.log("❌ Comment not found");
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    console.log("🗑️ Removing comment and replies for:", commentId);

    const targetId = commentId.toString();
    program.comments = program.comments.filter(c => {
      const remove = c._id.toString() === targetId || c.parent?.toString() === targetId;
      if (remove) console.log("❌ Removing:", c._id.toString(), "Parent:", c.parent);
      return !remove;
    });

    await program.save();

    console.log("📌 TOTAL COMMENTS AFTER:", program.comments.length);
    console.log("✅ Comment deleted\n");

    return res.json({
      success: true,
      message: "Comment deleted",
      data: {
        commentId,
        comments: program.comments
      }
    });

  } catch (err) {
    console.error("🔥 DELETE COMMENT ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ========================================================================
// GET MY PROGRAMS (All enrolled programs)
// ========================================================================
exports.getMyPrograms = async (req, res) => {
  try {
    const userId = req.user.id;

    const programs = await Program.find({
      participants: {
        $elemMatch: { user: userId }
      }
    })
      .populate("organizer", "profile.fullName profile.avatar")
      .populate("participants.user", "profile.fullName profile.avatar")
      .sort({ createdAt: -1 });

    const enriched = programs.map((p) => {
      const participant = p.participants.find(
        (pp) => pp.user.toString() === userId
      );

      return {
        ...p.toObject(),
        participantData: participant,
      };
    });

    return res.json({
      success: true,
      data: enriched,
    });

  } catch (error) {
    console.error("getMyPrograms ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET CONTINUE PROGRAMS (progress between 1–99% for THIS user only)
// ========================================================================
exports.getContinuePrograms = async (req, res) => {
  try {
    const userId = req.user.id;

    const programs = await Program.find({
      participants: {
        $elemMatch: {
          user: userId,
          progress: { $gt: 0, $lt: 100 }
        }
      }
    })
      .populate("organizer", "profile.fullName profile.avatar")
      .populate("participants.user", "profile.fullName profile.avatar")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: programs
    });

  } catch (error) {
    console.error("getContinuePrograms ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET COMPLETED PROGRAMS (progress = 100 for THIS user only)
// ========================================================================
exports.getCompletedPrograms = async (req, res) => {
  try {
    const userId = req.user.id;

    const programs = await Program.find({
      participants: {
        $elemMatch: {
          user: userId,
          progress: 100
        }
      }
    })
      .populate("organizer", "profile.fullName profile.avatar")
      .populate("participants.user", "profile.fullName profile.avatar")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: programs
    });

  } catch (error) {
    console.error("getCompletedPrograms ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load completed programs"
    });
  }
};

// ========================================================================
// GET PROGRAM STATISTICS (updated to new schema)
// ========================================================================
exports.getProgramStats = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    if (
      program.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const totalEnrollments = program.participants.length;
    const completed = program.participants.filter(
      (p) => p.progress === 100
    ).length;
    const inProgress = program.participants.filter(
      (p) => p.progress > 0 && p.progress < 100
    ).length;
    const averageProgress =
      totalEnrollments > 0
        ? program.participants.reduce(
          (sum, p) => sum + (p.progress || 0),
          0
        ) / totalEnrollments
        : 0;

    res.json({
      success: true,
      data: {
        totalEnrollments,
        completed,
        inProgress,
        averageProgress,
        completionRate: program.analytics.completionRate,
      },
    });
  } catch (error) {
    console.error("getProgramStats ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET PROGRAM PARTICIPANTS (full list with progress & profile data)
// ========================================================================
exports.getProgramParticipants = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate(
      "participants.user",
      "profile.fullName profile.avatar profile.badges"
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    if (
      program.organizer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view participants",
      });
    }

    const participants = program.participants.map((p) => ({
      user: p.user,
      progress: p.progress,
      enrolledAt: p.enrolledAt,
      purchaseStatus: p.purchaseStatus,
      completedModules: p.completedModules,
      certificateIssued: p.certificateIssued || false,
    }));

    res.json({
      success: true,
      count: participants.length,
      data: participants,
    });
  } catch (error) {
    console.error("getProgramParticipants ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========================================================================
// GENERATE CERTIFICATE (real certificate logic can be added)
// ========================================================================
exports.generateCertificate = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id);

    if (!program) {
      return res
        .status(404)
        .json({ success: false, message: "Program not found" });
    }

    const participant = program.participants.find(
      (p) => p.user.toString() === req.user.id
    );

    if (!participant || !participant.certificateIssued) {
      return res.status(400).json({
        success: false,
        message: "Certificate not available — complete the program first.",
      });
    }

    const certificate = {
      certificateId: participant.certificate?.id,
      title: program.title,
      issuedAt: participant.certificate?.issuedAt,
      userName: `${req.user.profile.fullName}`,
      downloadUrl: participant.certificate?.downloadUrl,
    };

    res.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    console.error("generateCertificate ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCertificate = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;

    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({ success: false, message: "Program not found" });
    }

    const participant = program.participants.find(
      (p) => p.user.toString() === userId
    );

    if (!participant || !participant.certificateIssued) {
      return res.status(400).json({
        success: false,
        message: "Certificate not issued yet",
      });
    }

    return res.status(200).json({
      success: true,
      data: participant.certificate,
    });
  } catch (error) {
    console.error("Certificate Fetch ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadCertificate = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;
    const { verificationUrl } = req.body;

    console.log("📌 DOWNLOAD CERTIFICATE REQUEST");

    const program = await Program.findById(programId).populate(
      "participants.user",
      "profile.fullName"
    );

    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    const participant = program.participants.find(
      (p) => p.user._id.toString() === userId
    );

    if (!participant || participant.progress !== 100) {
      return res.status(403).json({
        success: false,
        message: "Certificate not available",
      });
    }

    if (!participant.certificate?.id) {
      return res.status(400).json({
        success: false,
        message: "Certificate record missing",
      });
    }

    const certificateId = participant.certificate.id;

    let finalVerificationUrl;

    if (
      verificationUrl &&
      typeof verificationUrl === "string" &&
      verificationUrl.includes(certificateId)
    ) {
      finalVerificationUrl = verificationUrl;
    } else {
      finalVerificationUrl = `${process.env.FRONTEND_URL}/verify-certificate/${certificateId}`;
    }

    const sealPath = path.join(
      __dirname,
      "../assets/certificates/seal.png"
    );

    const signaturePath = path.join(
      __dirname,
      "../assets/certificates/signature.png"
    );

    const sealBase64 = fs.readFileSync(sealPath, { encoding: "base64" });
    const signatureBase64 = fs.readFileSync(signaturePath, {
      encoding: "base64",
    });

    const qrCodeBase64 = await QRCode.toDataURL(finalVerificationUrl);

    const certData = {
      participantName: participant.user.profile.fullName,
      programTitle: program.title,
      issuedAt: participant.certificate.issuedAt.toDateString(),
      certificateId,

      sealImage: `data:image/png;base64,${sealBase64}`,
      signatureImage: `data:image/png;base64,${signatureBase64}`,
      qrCodeImage: qrCodeBase64,
    };

    const templatePath = path.join(
      __dirname,
      "../templates/certificate.html"
    );

    let html = fs.readFileSync(templatePath, "utf8");

    Object.entries(certData).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), value);
    });

    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0",
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=certificate-${certificateId}.pdf`,
      "Content-Length": pdf.length,
      "Cache-Control": "no-store",
    });

    return res.end(pdf);
  } catch (error) {
    console.error("❌ DOWNLOAD CERTIFICATE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate certificate",
    });
  }
};

// @desc    Advanced search for programs
// @route   GET /api/programs/search/advanced
// @access  Private
exports.searchAdvancedHandler = async (req, res) => {
  try {
    const {
      query,
      category,
      difficulty,
      minDuration,
      maxDuration,
      minPrice,
      maxPrice,
      status,
      featured,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    let searchQuery = {};

    if (query) searchQuery.$text = { $search: query };

    if (category) searchQuery.category = category;
    if (difficulty) searchQuery.difficulty = difficulty;
    if (status) searchQuery.status = status;
    if (featured !== undefined)
      searchQuery.featured = featured === "true";

    if (minDuration || maxDuration) {
      searchQuery["duration.value"] = {};
      if (minDuration) searchQuery["duration.value"].$gte = Number(minDuration);
      if (maxDuration) searchQuery["duration.value"].$lte = Number(maxDuration);
    }

    if (minPrice || maxPrice) {
      searchQuery["price.amount"] = {};
      if (minPrice)
        searchQuery["price.amount"].$gte = Number(minPrice);
      if (maxPrice)
        searchQuery["price.amount"].$lte = Number(maxPrice);
    }

    const sortOptions = {
      [sortBy]: sortOrder === "desc" ? -1 : 1,
    };

    const programs = await Program.find(searchQuery)
      .populate("organizer", "profile.fullName profile.avatar")
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Program.countDocuments(searchQuery);

    return res.json({
      success: true,
      data: {
        programs,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
          hasNextPage: Number(page) * limit < total,
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Search Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};

// @desc    Personalized program recommendations
// @route   GET /api/programs/recommendations/for-you
// @access  Private
exports.recommendationsHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const interests = user?.profile?.interests || [];

    let recommended = [];

    if (interests.length > 0) {
      recommended = await Program.find({
        category: { $in: interests },
        status: "active",
        "participants.user": { $ne: req.user.id },
      })
        .populate("organizer", "profile.fullName profile.avatar")
        .sort({ "analytics.enrollments": -1 })
        .limit(6);
    }

    if (recommended.length < 6) {
      const popular = await Program.find({
        status: "active",
        "participants.user": { $ne: req.user.id },
        _id: { $nin: recommended.map((p) => p._id) },
      })
        .populate("organizer", "profile.fullName profile.avatar")
        .sort({ "analytics.enrollments": -1 })
        .limit(6 - recommended.length);

      recommended = [...recommended, ...popular];
    }

    return res.json({
      success: true,
      data: {
        recommendedPrograms: recommended,
      },
    });
  } catch (error) {
    console.error("Recommendation Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message });
  }
};