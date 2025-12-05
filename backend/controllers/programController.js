const mongoose = require("mongoose");
const Program = require("../models/Program");
const User = require("../models/User");
const Notification = require("../models/Notification");

// ========================================================================
// INTERNAL HELPER: CREATE PROGRAM NOTIFICATIONS (Organizer + Participant)
// ========================================================================
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
      page = 1,
      limit = 10,
      featured = false,
    } = req.query;

    let query = {};

    if (category && category !== "All") query.category = category;
    if (status) query.status = status;

    if (featured === "true") query.featured = true;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const programs = await Program.find(query)
      .populate(
        "organizer",
        "profile.fullName profile.avatar"
      )
      .populate(
        "participants.user",
        "profile.fullName profile.avatar"
      )
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Program.countDocuments(query);

    res.json({
      success: true,
      data: {
        programs,
        pagination: {
          total,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("getAllPrograms ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
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

    return res.json({
      success: true,
      data: {
        program,
        isEnrolled,
        userProgress,
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
// LEAVE PROGRAM
// ========================================================================
exports.leaveProgram = async (req, res) => {
  try {
    const programId = req.params.id;
    const userId = req.user.id;

    // Ensure program exists
    const program = await Program.findById(programId);
    if (!program) {
      return res.status(404).json({
        success: false,
        message: "Program not found",
      });
    }

    /* ============================================================
       ATOMIC REMOVE → Prevent double-leave, race conditions
    ============================================================ */
    const updatedProgram = await Program.findOneAndUpdate(
      {
        _id: programId,
        "participants.user": userId, // only update if user is actually enrolled
      },
      {
        $pull: { participants: { user: userId } },
        $inc: { "analytics.enrollments": -1 },
      },
      { new: true }
    );

    /* ============================================================
       If null → user was not enrolled
    ============================================================ */
    if (!updatedProgram) {
      return res.status(400).json({
        success: false,
        message: "You are not enrolled in this program",
      });
    }

    /* ============================================================
       NOTIFICATION: User left program
    ============================================================ */
    const fullName =
      req.user?.profile?.fullName ||
      req.user?.fullName ||
      "Someone";

    await createProgramNotifications({
      program: updatedProgram,
      user: req.user,
      type: "system_alert",
      title: "Program Left",
      message: `${fullName} left ${updatedProgram.title}.`,
    });

    return res.status(200).json({
      success: true,
      message: "You have left the program",
      isEnrolled: false,
      totalParticipants: updatedProgram.participants.length,
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

    // Normalize ObjectId comparison
    const normalize = (v) => (v?._id ? v._id.toString() : v?.toString());

    const participant = program.participants.find(
      (p) => normalize(p.user) === normalize(userId)
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
    const progress = Math.round((completedCount / totalModules) * 100);

    participant.progress = progress;

    // ============================================================
    // 🎓 ISSUE CERTIFICATE IF COMPLETED
    // ============================================================
    if (progress === 100 && !participant.certificateIssued) {
      const certId = new mongoose.Types.ObjectId().toString();
      const certificateUrl = `${process.env.FRONTEND_URL}/certificate/${certId}`;

      participant.certificateIssued = true;
      participant.completedAt = new Date();

      // Store certificate object as defined in schema
      participant.certificate = {
        id: certId,
        issuedAt: new Date(),
        downloadUrl: certificateUrl,
        verified: true,
      };

      // Send completion notification
      await createProgramNotifications({
        program,
        user: req.user,
        type: "program_certificate",
        title: "Certificate Awarded",
        message: `Congratulations! You earned a certificate for completing ${program.title}.`,
      });
    }

    await program.save();

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



// ADD MODULE
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
      completedBy: [],
    };

    program.modules.push(newModule);
    await program.save();

    console.log("PARTICIPANT LIST:", program.participants);
    console.log("USER ID:", userId);

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
// ADD REVIEW
// ========================================================================
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

    // Check if user already reviewed
    const exists = program.reviews.some(
      (r) => r.user.toString() === req.user.id
    );
    if (exists) {
      return res
        .status(400)
        .json({ success: false, message: "Already reviewed" });
    }

    // Add review
    program.reviews.push({
      user: req.user.id,
      rating,
      reviewText,
    });

    // Update analytics
    const sum = program.reviews.reduce((a, b) => a + b.rating, 0);
    program.analytics.averageRating = sum / program.reviews.length;
    program.analytics.totalRatings = program.reviews.length;

    await program.save();

    // SAFELY handle user name
    const reviewerName =
      req.user?.profile?.fullName ||
      req.user?.fullName ||
      req.user?.name ||
      "Someone";

    // Send notification
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

    // CHECK PARTICIPANT MEMBERSHIP
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



// DELETE COMMENT
// ========================================================================
// DELETE COMMENT + REPLIES (FULLY FIXED)
// ========================================================================
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

    // Check if user is participant
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

    // Find comment
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
// GET MY PROGRAMS (ALL ENROLLED)
// ========================================================================
exports.getMyPrograms = async (req, res) => {
  try {
    const programs = await Program.find({
      "participants.user": req.user.id,
    })
      .populate(
        "organizer",
        "profile.fullName profile.avatar"
      )
      .sort({ createdAt: -1 });

    const enriched = programs.map((p) => {
      const participant = p.participants.find(
        (pp) => pp.user.toString() === req.user.id
      );
      return { ...p.toObject(), participantData: participant };
    });

    res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error("getMyPrograms ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET CONTINUE PROGRAMS (progress between 1–99%)
// ========================================================================
exports.getContinuePrograms = async (req, res) => {
  try {
    const programs = await Program.find({
      "participants.user": req.user.id,
      "participants.progress": { $gt: 0, $lt: 100 },
    });

    res.json({ success: true, data: programs });
  } catch (error) {
    console.error("getContinuePrograms ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========================================================================
// GET COMPLETED PROGRAMS (progress = 100)
// ========================================================================
exports.getCompletedPrograms = async (req, res) => {
  try {
    const programs = await Program.find({
      "participants.user": req.user.id,
      "participants.progress": 100,
    });

    res.json({ success: true, data: programs });
  } catch (error) {
    console.error("getCompletedPrograms ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
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

    // Only organizer or admin can view participants
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

    // Text search
    if (query) searchQuery.$text = { $search: query };

    if (category) searchQuery.category = category;
    if (difficulty) searchQuery.difficulty = difficulty;
    if (status) searchQuery.status = status;
    if (featured !== undefined)
      searchQuery.featured = featured === "true";

    // Duration filter
    if (minDuration || maxDuration) {
      searchQuery["duration.value"] = {};
      if (minDuration) searchQuery["duration.value"].$gte = Number(minDuration);
      if (maxDuration) searchQuery["duration.value"].$lte = Number(maxDuration);
    }

    // Price range
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
      .populate(
        "organizer",
        "profile.fullName profile.avatar"
      )
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

    // Match user's interests first
    if (interests.length > 0) {
      recommended = await Program.find({
        category: { $in: interests },
        status: "active",
        "participants.user": { $ne: req.user.id }, // not already enrolled
      })
        .populate(
          "organizer",
          "profile.fullName profile.avatar"
        )
        .sort({ "analytics.enrollments": -1 })
        .limit(6);
    }

    // Supplement with popular programs if not enough results
    if (recommended.length < 6) {
      const popular = await Program.find({
        status: "active",
        "participants.user": { $ne: req.user.id },
        _id: { $nin: recommended.map((p) => p._id) },
      })
        .populate(
          "organizer",
          "profile.fullName profile.avatar"
        )
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
