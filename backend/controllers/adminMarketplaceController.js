// controllers/adminMarketplaceController.js
const mongoose = require("mongoose");

const Product = require("../models/Product");
const Job = require("../models/Job");
const Funding = require("../models/Funding");
const Skill = require("../models/Skill");
const Order = require("../models/Order");
const PaymentIntent = require("../models/PaymentIntent");
const User = require("../models/User");

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ok = (res, data = null, message = null, extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const created = (res, data = null, message = null, extra = {}) =>
  res.status(201).json({ success: true, message, data, ...extra });

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

/* =========================
   Helpers
========================= */
function toPage(v, def = 1) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}
function toLimit(v, def = 20, max = 100) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(1, n));
}
function containsRegex(q) {
  if (!q) return null;
  return { $regex: String(q).trim(), $options: "i" };
}

/* =========================
   MODEL MAP
========================= */
const MAP = {
  products: {
    Model: Product,
    label: "Product",
    defaultSort: { createdAt: -1 },
    populate: [{ path: "seller", select: "profile.fullName profile.avatar.url email phone username" }],
  },
  jobs: {
    Model: Job,
    label: "Job",
    defaultSort: { createdAt: -1 },
    populate: [{ path: "postedBy", select: "profile.fullName profile.avatar.url email phone username" }],
  },
  funding: {
    Model: Funding,
    label: "Funding",
    defaultSort: { createdAt: -1 },
    populate: [{ path: "providerId", select: "profile.fullName profile.avatar.url email phone username" }],
  },
  skills: {
    Model: Skill,
    label: "Skill",
    defaultSort: { createdAt: -1 },
    populate: [{ path: "user", select: "profile.fullName profile.avatar.url email phone username" }],
  },
  orders: {
    Model: Order,
    label: "Order",
    defaultSort: { createdAt: -1 },
    populate: [
      { path: "buyer", select: "profile.fullName profile.avatar.url email phone username" },
      { path: "items.product", select: "title images price seller sellerName status" },
      { path: "items.seller", select: "profile.fullName profile.avatar.url email phone username" },
    ],
  },
  intents: {
    Model: PaymentIntent,
    label: "Payment Intent",
    defaultSort: { createdAt: -1 },
    populate: [{ path: "userId", select: "profile.fullName profile.avatar.url email phone username" }],
  },
};

/* =====================================================
   1) LIST (pagination + search + filters)
   GET /admin/marketplace/:entity
===================================================== */
exports.list = async (req, res) => {
  try {
    const { entity } = req.params;
    const def = MAP[entity];
    if (!def) return bad(res, "Invalid entity");

    const { page, limit, search, status, category, sort } = req.query;

    const pageNum = toPage(page, 1);
    const limitNum = toLimit(limit, 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const q = {};

    // status filters (each model has slightly different names)
    if (entity === "products") {
      if (status) q.status = status;
      if (category) q.category = category;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ title: rx }, { description: rx }, { tags: rx }];
      }
    }

    if (entity === "jobs") {
      if (status) q.status = status;
      if (category) q.category = category;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ title: rx }, { company: rx }, { description: rx }, { skills: rx }];
      }
    }

    if (entity === "funding") {
      if (status) q.status = status;
      if (category) q.category = category;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ title: rx }, { provider: rx }, { description: rx }, { focusAreas: rx }];
      }
    }

    if (entity === "skills") {
      if (status) q.status = status;
      if (category) q.category = category;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ skill: rx }, { offer: rx }, { exchangeFor: rx }, { tags: rx }];
      }
    }

    if (entity === "orders") {
      if (status) q.status = status;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ orderNumber: rx }, { transactionId: rx }, { paymentIntentId: rx }];
      }
    }

    if (entity === "intents") {
      if (status) q.status = status;
      if (search) {
        const rx = containsRegex(search);
        q.$or = [{ intentId: rx }, { accountReference: rx }, { mpesaReceiptNumber: rx }];
      }
    }

    const sortObj =
      sort === "oldest" ? { createdAt: 1 } : def.defaultSort || { createdAt: -1 };

    const [total, rows] = await Promise.all([
      def.Model.countDocuments(q),
      def.Model.find(q)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(def.populate || [])
        .lean(),
    ]);

    return ok(res, rows, `${def.label}s fetched`, {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    return serverError(res, err, "Failed to fetch records");
  }
};

/* =====================================================
   2) GET BY ID (detail)
   GET /admin/marketplace/:entity/:id
===================================================== */
exports.getById = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const def = MAP[entity];
    if (!def) return bad(res, "Invalid entity");
    if (!isValidObjectId(id)) return bad(res, "Invalid id");

    const doc = await def.Model.findById(id)
      .populate(def.populate || [])
      .lean();

    if (!doc) return notFound(res, `${def.label} not found`);

    return ok(res, doc, `${def.label} fetched`);
  } catch (err) {
    return serverError(res, err, "Failed to fetch record");
  }
};

/* =====================================================
   3) CREATE (admin)
   POST /admin/marketplace/:entity
===================================================== */
exports.create = async (req, res) => {
  try {
    const { entity } = req.params;
    const def = MAP[entity];
    if (!def) return bad(res, "Invalid entity");

    // You can enforce per-entity requirements here, but simplest:
    const doc = await def.Model.create(req.body);

    const populated = await def.Model.findById(doc._id)
      .populate(def.populate || [])
      .lean();

    return created(res, populated, `${def.label} created`);
  } catch (err) {
    return serverError(res, err, "Failed to create record");
  }
};

/* =====================================================
   4) UPDATE (admin)
   PUT /admin/marketplace/:entity/:id
===================================================== */
exports.update = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const def = MAP[entity];
    if (!def) return bad(res, "Invalid entity");
    if (!isValidObjectId(id)) return bad(res, "Invalid id");

    const updated = await def.Model.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate(def.populate || [])
      .lean();

    if (!updated) return notFound(res, `${def.label} not found`);

    return ok(res, updated, `${def.label} updated`);
  } catch (err) {
    return serverError(res, err, "Failed to update record");
  }
};

/* =====================================================
   5) DELETE (admin)
   DELETE /admin/marketplace/:entity/:id
   - soft delete if model has status
===================================================== */
exports.remove = async (req, res) => {
  try {
    const { entity, id } = req.params;
    const def = MAP[entity];
    if (!def) return bad(res, "Invalid entity");
    if (!isValidObjectId(id)) return bad(res, "Invalid id");

    const doc = await def.Model.findById(id);
    if (!doc) return notFound(res, `${def.label} not found`);

    // soft-delete conventions
    if ("status" in doc) {
      if (entity === "products") doc.status = "hidden";
      else if (entity === "jobs") doc.status = "closed";
      else if (entity === "funding") doc.status = "closed";
      else if (entity === "skills") doc.status = "hidden";
      else doc.status = "hidden";

      doc.updatedAt = new Date();
      await doc.save();
      return ok(res, null, `${def.label} soft-deleted`);
    }

    await def.Model.deleteOne({ _id: id });
    return ok(res, null, `${def.label} deleted`);
  } catch (err) {
    return serverError(res, err, "Failed to delete record");
  }
};

/* =====================================================
   6) REPORTS / STATS
   GET /admin/marketplace/reports/overview
===================================================== */
exports.overview = async (req, res) => {
  try {
    const now = new Date();

    const [
      productsTotal,
      productsActive,
      productsSold,
      jobsActive,
      fundingOpen,
      skillsActive,

      ordersTotal,
      ordersPaid,
      revenueAgg,

      intentsTotal,
      intentsPending,
      intentsFailed,
      intentsCompleted,
    ] = await Promise.all([
      Product.countDocuments({}),
      Product.countDocuments({ status: "active" }),
      Product.countDocuments({ status: "sold" }),
      Job.countDocuments({ status: "active" }),
      Funding.countDocuments({ status: "open", deadline: { $gt: now } }),
      Skill.countDocuments({ status: "active" }),

      Order.countDocuments({}),
      Order.countDocuments({ status: "paid" }),
      Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),

      PaymentIntent.countDocuments({}),
      PaymentIntent.countDocuments({ status: "PENDING" }),
      PaymentIntent.countDocuments({ status: "FAILED" }),
      PaymentIntent.countDocuments({ status: "COMPLETED" }),
    ]);

    const revenue = revenueAgg?.[0]?.total || 0;

    return ok(res, {
      products: { total: productsTotal, active: productsActive, sold: productsSold },
      jobs: { active: jobsActive },
      funding: { open: fundingOpen },
      skills: { active: skillsActive },
      orders: { total: ordersTotal, paid: ordersPaid, revenue },
      paymentIntents: {
        total: intentsTotal,
        pending: intentsPending,
        failed: intentsFailed,
        completed: intentsCompleted,
      },
    }, "Marketplace overview fetched");
  } catch (err) {
    return serverError(res, err, "Failed to fetch overview");
  }
};
