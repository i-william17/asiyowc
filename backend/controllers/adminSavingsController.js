// controllers/adminSavingsController.js

const mongoose = require("mongoose");
const SavingsPod = require("../models/SavingsPod");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ok = (res, data = null, message = null, extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const bad = (res, message = "Bad request", extra = {}) =>
  res.status(400).json({ success: false, message, ...extra });

const notFound = (res, message = "Not found", extra = {}) =>
  res.status(404).json({ success: false, message, ...extra });

const serverError = (res, err, message = "Server error") =>
  res.status(500).json({
    success: false,
    message,
    error: err?.message || String(err),
  });

/* =====================================================
   1️⃣ LIST PODS (Admin)
   GET /admin/savings/pods
===================================================== */
exports.listPods = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { search, status, category } = req.query;

    const q = {};

    if (status) q.status = status;
    if (category) q.category = category;

    if (search) {
      q.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [total, pods] = await Promise.all([
      SavingsPod.countDocuments(q),
      SavingsPod.find(q)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("creator", "profile.fullName profile.avatar.url email phone username")
        .lean(),
    ]);

    return ok(
      res,
      pods,
      "Savings pods fetched",
      {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    );
  } catch (err) {
    return serverError(res, err, "Failed to fetch savings pods");
  }
};

/* =====================================================
   2️⃣ GET POD DETAILS (Deep Populate)
   GET /admin/savings/pods/:id
===================================================== */
exports.getPodById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return bad(res, "Invalid pod id");

    const pod = await SavingsPod.findById(id)
      .populate("creator", "profile.fullName profile.avatar.url email phone username")
      .populate("members.user", "profile.fullName profile.avatar.url email phone username")
      .populate("contributions.member", "profile.fullName profile.avatar.url email phone username")
      .populate("withdrawals.member", "profile.fullName profile.avatar.url email phone username")
      .populate("withdrawals.approvedBy", "profile.fullName profile.avatar.url email phone username")
      .lean({ virtuals: true });

    if (!pod) return notFound(res, "Savings pod not found");

    return ok(res, pod, "Savings pod fetched");
  } catch (err) {
    return serverError(res, err, "Failed to fetch savings pod");
  }
};
