// controllers/moderationController.js
const mongoose = require("mongoose");

const Report = require("../models/Report");
const User = require("../models/User");

// Targets (adjust paths/names to match your actual project)
const Post = require("../models/Post");
const Chat = require("../models/Chat");
const Hub = require("../models/Hub");
const Group = require("../models/Group");
const Voice = require("../models/Voice");
// const Comment = require("../models/Comment"); // if you have it

/* =====================================================
   HELPERS (match your style)
===================================================== */

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ok = (res, data = null, message = null, extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const created = (res, data = null, message = null, extra = {}) =>
  res.status(201).json({ success: true, message, data, ...extra });

const bad = (res, message = "Bad request", extra = {}) =>
  res.status(400).json({ success: false, message, ...extra });

const notFound = (res, message = "Not found", extra = {}) =>
  res.status(404).json({ success: false, message, ...extra });

const forbidden = (res, message = "Forbidden", extra = {}) =>
  res.status(403).json({ success: false, message, ...extra });

const serverError = (res, err, message = "Server error") =>
  res.status(500).json({
    success: false,
    message,
    error: err?.message || String(err),
  });

/* =====================================================
   MODEL MAP: targetType -> Mongoose Model
   (works with your current targetType values)
===================================================== */

const TARGET_MODEL_MAP = {
  post: Post,
  chat: Chat,
  hub: Hub,
  group: Group,
  voice: Voice,
  user: User,
  // comment: Comment,
};

const TARGET_LABELS = {
  post: "Post",
  chat: "Chat",
  hub: "Hub",
  group: "Group",
  voice: "Voice",
  user: "User",
  // comment: "Comment",
};

/* =====================================================
   TARGET PREVIEW MAPPER
   Normalize returned payload for the admin UI
===================================================== */
const buildTargetPreview = (targetType, doc) => {
  if (!doc) {
    return {
      type: targetType,
      label: TARGET_LABELS[targetType] || targetType,
      exists: false,
      preview: null,
    };
  }

  // Provide safe preview fields per type (adapt to your schemas)
  switch (targetType) {
    case "post":
      return {
        type: "post",
        label: "Post",
        exists: true,
        id: doc._id,
        preview: {
          text:
            doc?.content?.text ||
            doc?.text ||
            doc?.caption ||
            doc?.description ||
            "",
          media:
            doc?.content?.media ||
            doc?.media ||
            doc?.images ||
            doc?.video ||
            null,
          author: doc?.author || doc?.user || doc?.createdBy || null,
          createdAt: doc?.createdAt,
          isDeleted: Boolean(doc?.isDeleted || doc?.deleted),
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
        },
      };

    case "chat": {
      const participants = Array.isArray(doc?.participants)
        ? doc.participants
        : [];

      let reportedUser = null;

      // If DM → show only the OTHER participant (not reporter)
      if (doc?.type === "dm" && participants.length === 2) {
        reportedUser = participants.find(
          (p) => String(p?._id) !== String(doc?.reporter)
        );
      }

      // fallback safety
      if (!reportedUser && participants.length > 0) {
        reportedUser = participants[0];
      }

      return {
        type: "chat",
        label: doc?.type === "dm" ? "Direct Message" : "Chat",
        exists: true,
        id: doc._id,
        preview: {
          type: doc?.type || "chat",

          // 🔥 ONLY REPORTED USER
          reportedUser: reportedUser
            ? {
              _id: reportedUser._id,
              fullName:
                reportedUser?.profile?.fullName ||
                reportedUser?.fullName ||
                "",

              // ✅ Avatar support (handles both formats)
              avatar:
                reportedUser?.profile?.avatar?.url ||
                reportedUser?.profile?.avatar ||
                reportedUser?.avatar?.url ||
                reportedUser?.avatar ||
                null,

              email: reportedUser?.email || "",
              phone: reportedUser?.phone || "",
            }
            : null,

          createdAt: doc?.createdAt,
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
        },
      };
    }

    case "hub":
      return {
        type: "hub",
        label: "Hub",
        exists: true,
        id: doc._id,
        preview: {
          title: doc?.title || doc?.name || "",
          description: doc?.description || doc?.bio || "",
          owner: doc?.owner || doc?.createdBy || doc?.admin || null,
          membersCount:
            doc?.membersCount ||
            (Array.isArray(doc?.members) ? doc.members.length : undefined),
          createdAt: doc?.createdAt,
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
        },
      };

    case "group":
      return {
        type: "group",
        label: "Group",
        exists: true,
        id: doc._id,
        preview: {
          name: doc?.name || doc?.title || "",
          about: doc?.about || doc?.description || "",
          privacy: doc?.privacy || doc?.type || "",
          owner: doc?.owner || doc?.createdBy || doc?.admin || null,
          membersCount:
            doc?.membersCount ||
            (Array.isArray(doc?.members) ? doc.members.length : undefined),
          createdAt: doc?.createdAt,
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
        },
      };

    case "voice":
      return {
        type: "voice",
        label: "Voice",
        exists: true,
        id: doc._id,
        preview: {
          title: doc?.title || doc?.name || "",
          host: doc?.host || doc?.owner || null,
          createdAt: doc?.createdAt,
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
        },
      };

    case "user":
      return {
        type: "user",
        label: "User",
        exists: true,
        id: doc._id,
        preview: {
          fullName: doc?.profile?.fullName || doc?.fullName || doc?.name || "",
          email: doc?.email || "",
          phone: doc?.phone || "",
          avatar: doc?.profile?.avatar || doc?.avatar || null,
          isActive:
            doc?.isActive ??
            doc?.active ??
            (doc?.disabled != null ? !doc.disabled : undefined),
          suspendedUntil: doc?.suspendedUntil || doc?.suspensionEnd || null,
        },
      };

    default:
      return {
        type: targetType,
        label: TARGET_LABELS[targetType] || targetType,
        exists: true,
        id: doc._id,
        preview: doc,
      };
  }
};

/* =====================================================
   INTERNAL: fetch target document safely
===================================================== */
async function fetchTargetDoc(targetType, targetId) {
  const Model = TARGET_MODEL_MAP[targetType];
  if (!Model) return null;

  let q = Model.findById(targetId);

  // ✅ Prevent StrictPopulateError
  const safePopulate = (query, path, select) => {
    try {
      const schemaPaths = query?.model?.schema?.paths || {};
      if (schemaPaths[path]) {
        return query.populate(path, select);
      }
      return query;
    } catch (e) {
      return query;
    }
  };

  const userSelect = "profile.fullName profile.avatar email phone";

  if (targetType === "post") {
    // try common author fields safely
    q = safePopulate(q, "author", userSelect);
    q = safePopulate(q, "user", userSelect);
    q = safePopulate(q, "createdBy", userSelect);
  }

  if (targetType === "hub") {
    // try common owner fields safely
    q = safePopulate(q, "owner", userSelect);
    q = safePopulate(q, "createdBy", userSelect);
    q = safePopulate(q, "admin", userSelect);
  }

  if (targetType === "group") {
    q = safePopulate(q, "owner", userSelect);
    q = safePopulate(q, "createdBy", userSelect);
    q = safePopulate(q, "admin", userSelect);
  }

  if (targetType === "chat") {
    q = safePopulate(q, "participants", userSelect);
  }

  return q.lean();
}

/* =====================================================
   INTERNAL: apply moderation actions
   (safe defaults + easy to extend)
===================================================== */

async function softDisableDoc(Model, id, adminId) {
  const doc = await Model.findById(id);
  if (!doc) return { ok: false, reason: "Target not found" };

  // attempt to set a disable flag using whichever exists
  if ("disabled" in doc) doc.disabled = true;
  else if ("isDisabled" in doc) doc.isDisabled = true;
  else if ("active" in doc) doc.active = false;
  else if ("isActive" in doc) doc.isActive = false;
  else if ("status" in doc) doc.status = "disabled"; // if you use string status
  else {
    // fallback: add a generic field (won't persist if schema strict)
    doc.set("disabled", true);
  }

  // optional audit fields if exist
  if ("disabledBy" in doc) doc.disabledBy = adminId;
  if ("disabledAt" in doc) doc.disabledAt = new Date();

  await doc.save();
  return { ok: true };
}

async function deleteDoc(Model, id) {
  // Choose “soft delete” if schema has fields; else hard delete
  const doc = await Model.findById(id);
  if (!doc) return { ok: false, reason: "Target not found" };

  if ("isDeleted" in doc) {
    doc.isDeleted = true;
    if ("deletedAt" in doc) doc.deletedAt = new Date();
    await doc.save();
    return { ok: true, mode: "soft" };
  }

  await Model.deleteOne({ _id: id });
  return { ok: true, mode: "hard" };
}

async function suspendUser(userId, { days = 7 } = {}) {
  const user = await User.findById(userId);
  if (!user) return { ok: false, reason: "User not found" };

  const until = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);

  // common patterns
  if ("suspendedUntil" in user) user.suspendedUntil = until;
  else if ("suspensionEnd" in user) user.suspensionEnd = until;
  else {
    user.set("suspendedUntil", until);
  }

  if ("isActive" in user) user.isActive = false;
  else if ("active" in user) user.active = false;

  await user.save();
  return { ok: true, suspendedUntil: until };
}

/* =====================================================
   CONTROLLER
===================================================== */

/**
 * GET /admin/reports
 * Query:
 * - resolved=true|false (optional)
 * - targetType=post|hub|group|chat|user|voice (optional)
 * - search (reason contains) (optional)
 * - page, limit
 */
exports.listReports = async (req, res) => {
  try {
    const {
      resolved,
      targetType,
      search,
      page = 1,
      limit = 20,
      sort = "newest", // newest|oldest
    } = req.query;

    const q = {};

    if (resolved === "true") q.resolved = true;
    if (resolved === "false") q.resolved = false;

    if (targetType) q.targetType = targetType;

    if (search) {
      q.reason = { $regex: String(search).trim(), $options: "i" };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const sortObj = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

    const [total, reports] = await Promise.all([
      Report.countDocuments(q),
      Report.find(q)
        .sort(sortObj)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("reporter", "profile.fullName profile.avatar email phone")
        .populate("resolvedBy", "profile.fullName profile.avatar email phone")
        .lean(),
    ]);

    // attach target preview (best effort)
    const enriched = await Promise.all(
      reports.map(async (r) => {
        try {
          const target = await fetchTargetDoc(r.targetType, r.targetId);
          return {
            ...r,
            status: r.resolved ? "resolved" : "pending",
            target: buildTargetPreview(r.targetType, {
              ...target,
              reporter: r.reporter?._id,
            }),
          };
        } catch (e) {
          console.error("⚠️ target fetch failed:", r._id, r.targetType, r.targetId, e?.message);
          return {
            ...r,
            status: r.resolved ? "resolved" : "pending",
            target: buildTargetPreview(r.targetType, null),
          };
        }
      })
    );

    return ok(
      res,
      enriched,
      "Reports fetched",
      {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      }
    );
  } catch (err) {
    return serverError(res, err, "Failed to fetch reports");
  }
};

/**
 * GET /admin/reports/:reportId
 * Returns full report details + target preview
 */
exports.getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;

    if (!isValidObjectId(reportId)) {
      return bad(res, "Invalid reportId");
    }

    const report = await Report.findById(reportId)
      .populate("reporter", "profile.fullName profile.avatar email phone")
      .populate("resolvedBy", "profile.fullName profile.avatar email phone")
      .lean();

    if (!report) return notFound(res, "Report not found");

    const target = await fetchTargetDoc(report.targetType, report.targetId);

    return ok(res, {
      ...report,
      status: report.resolved ? "resolved" : "pending",
      target: buildTargetPreview(report.targetType, target),
    });
  } catch (err) {
    return serverError(res, err, "Failed to fetch report");
  }
};

/**
 * PATCH /admin/reports/:reportId/resolve
 * body: { resolved: true|false }
 * Sets resolvedBy/resolvedAt
 */
exports.setResolved = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { resolved } = req.body;

    if (!isValidObjectId(reportId)) return bad(res, "Invalid reportId");
    if (typeof resolved !== "boolean")
      return bad(res, "resolved must be boolean");

    const report = await Report.findById(reportId);
    if (!report) return notFound(res, "Report not found");

    report.resolved = resolved;

    if (resolved) {
      report.resolvedBy = req.user?._id || null;
      report.resolvedAt = new Date();
    } else {
      report.resolvedBy = null;
      report.resolvedAt = null;
    }

    await report.save();

    return ok(res, report, resolved ? "Report resolved" : "Report reopened");
  } catch (err) {
    return serverError(res, err, "Failed to update report");
  }
};

/**
 * POST /admin/reports/:reportId/action
 * body: {
 *   action: "delete_target" | "disable_target" | "suspend_user" | "ban_user" | "none",
 *   days?: number, // for suspend_user
 *   note?: string  // optional
 * }
 *
 * Applies moderation + auto-resolves the report.
 */
exports.takeAction = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action = "none", days = 7, note = "" } = req.body || {};

    if (!isValidObjectId(reportId)) return bad(res, "Invalid reportId");

    const report = await Report.findById(reportId);
    if (!report) return notFound(res, "Report not found");

    const targetType = report.targetType;
    const targetId = report.targetId;

    const Model = TARGET_MODEL_MAP[targetType];
    if (!Model) return bad(res, `Unsupported targetType: ${targetType}`);

    const adminId = req.user?._id || null;

    let result = { ok: true, action };
    let enforcement = null;

    // === Moderation actions ===
    if (action === "none") {
      enforcement = { ok: true, message: "No enforcement applied" };
    }

    // delete the target object (post/hub/group/chat/voice)
    else if (action === "delete_target") {
      const delRes = await deleteDoc(Model, targetId);
      enforcement = delRes;
      if (!delRes.ok) return bad(res, delRes.reason || "Delete failed");
    }

    // disable the target object (hub/group/chat/voice/post)
    else if (action === "disable_target") {
      const disRes = await softDisableDoc(Model, targetId, adminId);
      enforcement = disRes;
      if (!disRes.ok) return bad(res, disRes.reason || "Disable failed");
    }

    // suspend a user (if targetType=user, suspend that user; otherwise try derive from target)
    else if (action === "suspend_user") {
      let userId = null;

      if (targetType === "user") userId = targetId;

      // try to derive from target doc if it has author/owner
      if (!userId) {
        const target = await Model.findById(targetId).lean();
        userId =
          target?.author ||
          target?.owner ||
          target?.createdBy ||
          target?.user ||
          null;
      }

      if (!userId) return bad(res, "Could not determine user to suspend");

      const susRes = await suspendUser(userId, { days });
      enforcement = susRes;
      if (!susRes.ok) return bad(res, susRes.reason || "Suspend failed");
    }

    // ban user (placeholder — depends on your user schema)
    else if (action === "ban_user") {
      // implement based on your schema, example:
      // - set user.banned = true
      // - user.active = false
      // - user.bannedAt = new Date()
      let userId = null;

      if (targetType === "user") userId = targetId;

      if (!userId) {
        const target = await Model.findById(targetId).lean();
        userId =
          target?.author ||
          target?.owner ||
          target?.createdBy ||
          target?.user ||
          null;
      }

      if (!userId) return bad(res, "Could not determine user to ban");

      const user = await User.findById(userId);
      if (!user) return bad(res, "User not found");

      if ("banned" in user) user.banned = true;
      else user.set("banned", true);

      if ("bannedAt" in user) user.bannedAt = new Date();
      if ("isActive" in user) user.isActive = false;
      if ("active" in user) user.active = false;

      await user.save();
      enforcement = { ok: true, banned: true };
    } else {
      return bad(res, "Invalid action");
    }

    // === Resolve report after action ===
    report.resolved = true;
    report.resolvedBy = adminId;
    report.resolvedAt = new Date();

    // Optional future-proof: store moderation meta if you later add fields
    // (this won't break anything now; strict schemas may ignore)
    report.set("moderationAction", action);
    report.set("moderationNote", note);

    await report.save();

    const target = await fetchTargetDoc(report.targetType, report.targetId);

    return ok(
      res,
      {
        report: {
          ...report.toObject(),
          status: report.resolved ? "resolved" : "pending",
          target: buildTargetPreview(report.targetType, target),
        },
        enforcement,
      },
      "Moderation action applied"
    );
  } catch (err) {
    return serverError(res, err, "Failed to apply moderation action");
  }
};

/**
 * DELETE /admin/reports/:reportId
 * Optional: remove a report record (rarely needed; usually resolve instead)
 */
exports.deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    if (!isValidObjectId(reportId)) return bad(res, "Invalid reportId");

    const report = await Report.findById(reportId);
    if (!report) return notFound(res, "Report not found");

    await Report.deleteOne({ _id: reportId });

    return ok(res, null, "Report deleted");
  } catch (err) {
    return serverError(res, err, "Failed to delete report");
  }
};
