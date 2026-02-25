// controllers/adminAnalyticsController.js
// ============================================================
// ADMIN ANALYTICS CONTROLLER (CONSOLIDATED)
// - 8 Layers (dropdown-ready)
// - Mongo Aggregations (fast)
// - Date-range aware
// - Safe defaults (Africa/Nairobi)
// ============================================================

const mongoose = require("mongoose");

// ============================================================
// SAFE MODEL IMPORTS (prevents crashing if some models not wired yet)
// ============================================================
const safeModel = (name, fallbackPath = null) => {
  try {
    return mongoose.model(name);
  } catch (e) {
    if (!fallbackPath) return null;
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      return require(fallbackPath);
    } catch {
      return null;
    }
  }
};

// Core
const User = safeModel("User", "../models/User");
const Group = safeModel("Group", "../models/Group");
const Hub = safeModel("Hub", "../models/Hub");
const Post = safeModel("Post", "../models/Post");
const Report = safeModel("Report", "../models/Report");
const Chat = safeModel("Chat", "../models/Chat");
const Voice = safeModel("Voice", "../models/Voice");
const Notification = safeModel("Notification", "../models/Notification");

// Learning
const Program = safeModel("Program", "../models/Program");
const Event = safeModel("Event", "../models/Event");
const Retreat = safeModel("Retreat", "../models/Retreat");
const Journal = safeModel("Journal", "../models/Journal");

// Economy
const Product = safeModel("Product", "../models/Product");
const Order = safeModel("Order", "../models/Order");
const PaymentIntent = safeModel("PaymentIntent", "../models/PaymentIntent");
const SavingsPod = safeModel("SavingsPod", "../models/SavingsPod");
const Job = safeModel("Job", "../models/Job");
const Funding = safeModel("Funding", "../models/Funding");
const Skill = safeModel("Skill", "../models/Skill");
const Mentor = safeModel("Mentor", "../models/Mentor");

// ============================================================
// RESPONSE HELPERS (consistent admin API output)
// ============================================================
const ok = (res, data = null, message = null, extra = {}) =>
  res.json({ success: true, message, data, ...extra });

const bad = (res, message = "Bad request", extra = {}) =>
  res.status(400).json({ success: false, message, ...extra });

const serverError = (res, err, message = "Server error") => {
  // eslint-disable-next-line no-console
  console.error("[adminAnalyticsController]", err);
  return res.status(500).json({
    success: false,
    message,
    error: err?.message || String(err),
  });
};

// ============================================================
// DATE + QUERY HELPERS
// ============================================================

/**
 * parseDateRange(req.query)
 * - from/to can be ISO strings or YYYY-MM-DD
 * - defaults to last 30 days
 * - returns { from, to, rangeLabel, tz }
 */
function parseDateRange(query = {}) {
  const tz = query.tz || "Africa/Nairobi";

  const now = new Date();

  const to = query.to ? new Date(query.to) : now;

  // Default: last 30 days
  const from = query.from
    ? new Date(query.from)
    : new Date(new Date(to).getTime() - 30 * 24 * 60 * 60 * 1000);

  // Guard invalid
  const fromValid = Number.isFinite(from?.getTime?.());
  const toValid = Number.isFinite(to?.getTime?.());

  const safeFrom = fromValid ? from : new Date(new Date(now).getTime() - 30 * 24 * 60 * 60 * 1000);
  const safeTo = toValid ? to : now;

  // Normalize (from <= to)
  if (safeFrom > safeTo) {
    return {
      from: safeTo,
      to: safeFrom,
      tz,
      rangeLabel: "swapped_range",
    };
  }

  return {
    from: safeFrom,
    to: safeTo,
    tz,
    rangeLabel: "custom_or_default",
  };
}

/**
 * parseGranularity
 * - day | week | month
 */
function parseGranularity(query = {}) {
  const g = String(query.granularity || "day").toLowerCase();
  if (["day", "week", "month"].includes(g)) return g;
  return "day";
}

/**
 * buildDateBucketExpr(granularity)
 * - Produces a $dateToString format for grouping
 */
function buildDateBucketExpr(granularity, tz = "Africa/Nairobi") {
  if (granularity === "month") {
    return {
      $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: tz },
    };
  }
  if (granularity === "week") {
    // Group by ISO week (approx using "%G-%V")
    return {
      $dateToString: { format: "%G-W%V", date: "$createdAt", timezone: tz },
    };
  }
  // day
  return {
    $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz },
  };
}

/**
 * clampLimit
 */
function clampLimit(v, min = 1, max = 50, fallback = 10) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/**
 * safeObjectId
 */
function safeObjectId(id) {
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

/**
 * maybeMatchDate(createdAtField, from, to)
 * - helps with models that have createdAt timestamps
 */
function maybeMatchDate(from, to, field = "createdAt") {
  return { [field]: { $gte: from, $lte: to } };
}

/**
 * quickExists checks if model exists
 */
function ensureModel(model, name) {
  if (!model) {
    const err = new Error(`Model not found: ${name}`);
    err.code = "MODEL_MISSING";
    throw err;
  }
}

// ============================================================
// SHARED AGGREGATION HELPERS
// ============================================================

async function countSeriesByCreatedAt(Model, { from, to, tz, granularity }, extraMatch = {}) {
  ensureModel(Model, "Unknown");

  const bucket = buildDateBucketExpr(granularity, tz);

  const pipeline = [
    { $match: { ...maybeMatchDate(from, to, "createdAt"), ...extraMatch } },
    {
      $group: {
        _id: bucket,
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, bucket: "$_id", count: 1 } },
  ];

  return Model.aggregate(pipeline);
}

async function topByCountFromArrayField(Model, { from, to }, { arrayField, labelField, limit = 10 }) {
  ensureModel(Model, "Unknown");

  const pipeline = [
    { $match: { ...maybeMatchDate(from, to, "createdAt") } },
    { $unwind: `$${arrayField}` },
    {
      $group: {
        _id: `$${arrayField}${labelField ? `.${labelField}` : ""}`,
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { _id: 0, key: "$_id", count: 1 } },
  ];

  return Model.aggregate(pipeline);
}

async function topCreatorsFromPosts({ from, to, limit = 10 }) {
  ensureModel(Post, "Post");
  ensureModel(User, "User");

  const pipeline = [
    { $match: { ...maybeMatchDate(from, to, "createdAt"), isRemoved: { $ne: true } } },
    { $group: { _id: "$author", posts: { $sum: 1 } } },
    { $sort: { posts: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "u",
      },
    },
    { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        posts: 1,
        fullName: "$u.profile.fullName",
        avatar: "$u.profile.avatar.url",
        role: "$u.profile.role",
      },
    },
  ];

  return Post.aggregate(pipeline);
}

async function safeAggregate(Model, pipeline, fallback = []) {
  if (!Model) return fallback;
  return Model.aggregate(pipeline);
}

// ============================================================
// ============================================================
// 0) OVERVIEW (cross-layer snapshot)
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/overview?from&to&granularity
 * - A top-level snapshot for the "Analytics Home" tab
 */
async function getOverview(req, res) {
  try {
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);

    const [usersSeries, postsSeries, reportsSeries, paymentsSeries] = await Promise.all([
      User ? countSeriesByCreatedAt(User, { from, to, tz, granularity }) : [],
      Post ? countSeriesByCreatedAt(Post, { from, to, tz, granularity }, { isRemoved: { $ne: true } }) : [],
      Report ? countSeriesByCreatedAt(Report, { from, to, tz, granularity }) : [],
      PaymentIntent
        ? countSeriesByCreatedAt(PaymentIntent, { from, to, tz, granularity })
        : [],
    ]);

    const [
      totalUsers,
      totalPosts,
      totalGroups,
      totalHubs,
      totalReports,
      pendingReports,
      totalOrders,
      totalProducts,
      totalPrograms,
      totalEvents,
      totalPods,
      paymentSuccess,
      paymentFailed,
    ] = await Promise.all([
      User ? User.countDocuments({}) : 0,
      Post ? Post.countDocuments({ isRemoved: { $ne: true } }) : 0,
      Group ? Group.countDocuments({ isRemoved: { $ne: true } }) : 0,
      Hub ? Hub.countDocuments({ isRemoved: { $ne: true } }) : 0,
      Report ? Report.countDocuments({}) : 0,
      Report ? Report.countDocuments({ resolved: false }) : 0,
      Order ? Order.countDocuments({}) : 0,
      Product ? Product.countDocuments({}) : 0,
      Program ? Program.countDocuments({}) : 0,
      Event ? Event.countDocuments({}) : 0,
      SavingsPod ? SavingsPod.countDocuments({}) : 0,
      PaymentIntent ? PaymentIntent.countDocuments({ status: "COMPLETED" }) : 0,
      PaymentIntent ? PaymentIntent.countDocuments({ status: "FAILED" }) : 0,
    ]);

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        totalUsers,
        totalPosts,
        totalGroups,
        totalHubs,
        totalPrograms,
        totalEvents,
        totalProducts,
        totalOrders,
        totalPods,
        totalReports,
        pendingReports,
        payments: {
          completed: paymentSuccess,
          failed: paymentFailed,
        },
      },
      series: {
        users: usersSeries,
        posts: postsSeries,
        reports: reportsSeries,
        payments: paymentsSeries,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load overview analytics");
  }
}

// ============================================================
// ============================================================
// 1) 👥 USER & COMMUNITY HEALTH
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/user-community?from&to&granularity&limit
 */
async function getUserCommunityHealth(req, res) {
  try {
    ensureModel(User, "User");

    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // -------- Growth series
    const newUsersSeries = await countSeriesByCreatedAt(User, { from, to, tz, granularity });

    // -------- Active users (proxy) using lastActive within range
    const activeUsersSeries = await safeAggregate(User, [
      { $match: { lastActive: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: buildDateBucketExpr(granularity, tz),
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, bucket: "$_id", count: 1 } },
    ]);

    // -------- Roles distribution
    const roles = await safeAggregate(User, [
      {
        $group: {
          _id: "$profile.role",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, role: "$_id", count: 1 } },
    ]);

    // -------- Verification status
    const verification = await safeAggregate(User, [
      {
        $project: {
          emailVerified: "$isVerified.email",
          phoneVerified: "$isVerified.phone",
        },
      },
      {
        $group: {
          _id: {
            email: { $ifNull: ["$emailVerified", false] },
            phone: { $ifNull: ["$phoneVerified", false] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          email: "$_id.email",
          phone: "$_id.phone",
          count: 1,
        },
      },
    ]);

    // -------- Location distribution (countryCode)
    const locations = await safeAggregate(User, [
      {
        $group: {
          _id: "$profile.location.countryCode",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, countryCode: "$_id", count: 1 } },
    ]);

    // -------- Community KPIs (groups/hubs)
    const [
      groupsCreatedSeries,
      hubsCreatedSeries,
      groupCounts,
      hubCounts,
      topGroupsByMembers,
      topHubsByMembers,
    ] = await Promise.all([
      Group ? countSeriesByCreatedAt(Group, { from, to, tz, granularity }, { isRemoved: { $ne: true } }) : [],
      Hub ? countSeriesByCreatedAt(Hub, { from, to, tz, granularity }, { isRemoved: { $ne: true } }) : [],
      Group ? Group.countDocuments({ isRemoved: { $ne: true } }) : 0,
      Hub ? Hub.countDocuments({ isRemoved: { $ne: true } }) : 0,
      Group
        ? Group.aggregate([
            { $match: { isRemoved: { $ne: true } } },
            {
              $addFields: {
                membersCount: { $size: { $ifNull: ["$members", []] } },
              },
            },
            { $sort: { membersCount: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                groupId: "$_id",
                name: 1,
                membersCount: 1,
                createdAt: 1,
              },
            },
          ])
        : [],
      Hub
        ? Hub.aggregate([
            { $match: { isRemoved: { $ne: true } } },
            {
              $addFields: {
                membersCount: { $size: { $ifNull: ["$members", []] } },
              },
            },
            { $sort: { membersCount: -1 } },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                hubId: "$_id",
                name: 1,
                type: 1,
                region: 1,
                membersCount: 1,
                createdAt: 1,
              },
            },
          ])
        : [],
    ]);

    // -------- Mentors: pending/approved/rejected
    const mentorsStatus = Mentor
      ? await Mentor.aggregate([
          {
            $group: {
              _id: "$verificationStatus",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ])
      : [];

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        users: await User.countDocuments({}),
        groups: groupCounts,
        hubs: hubCounts,
      },
      series: {
        newUsers: newUsersSeries,
        activeUsers: activeUsersSeries,
        groupsCreated: groupsCreatedSeries,
        hubsCreated: hubsCreatedSeries,
      },
      breakdowns: {
        roles,
        verification,
        topCountries: locations,
        mentorsStatus,
      },
      leaders: {
        topGroupsByMembers,
        topHubsByMembers,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load user & community health analytics");
  }
}

// ============================================================
// ============================================================
// 2) 💬 SOCIAL ENGAGEMENT
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/social-engagement?from&to&granularity&limit
 */
async function getSocialEngagement(req, res) {
  try {
    ensureModel(Post, "Post");

    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // -------- Posts series + type breakdown
    const [postsSeries, postTypes] = await Promise.all([
      countSeriesByCreatedAt(Post, { from, to, tz, granularity }, { isRemoved: { $ne: true } }),
      Post.aggregate([
        { $match: { ...maybeMatchDate(from, to, "createdAt"), isRemoved: { $ne: true } } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, type: "$_id", count: 1 } },
      ]),
    ]);

    // -------- Engagement metrics (likesCount, commentsCount, sharesCount)
    const engagementSummary = await Post.aggregate([
      { $match: { ...maybeMatchDate(from, to, "createdAt"), isRemoved: { $ne: true } } },
      {
        $group: {
          _id: null,
          posts: { $sum: 1 },
          totalLikes: { $sum: { $ifNull: ["$likesCount", 0] } },
          totalComments: { $sum: { $ifNull: ["$commentsCount", 0] } },
          totalShares: { $sum: { $ifNull: ["$sharesCount", 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          posts: 1,
          totalLikes: 1,
          totalComments: 1,
          totalShares: 1,
          avgLikesPerPost: {
            $cond: [{ $gt: ["$posts", 0] }, { $divide: ["$totalLikes", "$posts"] }, 0],
          },
          avgCommentsPerPost: {
            $cond: [{ $gt: ["$posts", 0] }, { $divide: ["$totalComments", "$posts"] }, 0],
          },
          avgSharesPerPost: {
            $cond: [{ $gt: ["$posts", 0] }, { $divide: ["$totalShares", "$posts"] }, 0],
          },
        },
      },
    ]);

    // -------- Top posts by engagement
    const topPosts = await Post.aggregate([
      { $match: { ...maybeMatchDate(from, to, "createdAt"), isRemoved: { $ne: true } } },
      {
        $addFields: {
          engagementScore: {
            $add: [
              { $ifNull: ["$likesCount", 0] },
              { $ifNull: ["$commentsCount", 0] },
              { $ifNull: ["$sharesCount", 0] },
            ],
          },
        },
      },
      { $sort: { engagementScore: -1, createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorObj",
        },
      },
      { $unwind: { path: "$authorObj", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          postId: "$_id",
          type: 1,
          createdAt: 1,
          likesCount: 1,
          commentsCount: 1,
          sharesCount: 1,
          engagementScore: 1,
          author: {
            userId: "$author",
            fullName: "$authorObj.profile.fullName",
            avatar: "$authorObj.profile.avatar.url",
          },
          textPreview: "$content.text",
          imageUrl: "$content.imageUrl",
          videoUrl: "$content.videoUrl",
          linkUrl: "$content.linkUrl",
          visibility: 1,
        },
      },
    ]);

    // -------- Comments volume (embedded comments array)
    const commentsSeries = await Post.aggregate([
      { $match: { ...maybeMatchDate(from, to, "createdAt"), isRemoved: { $ne: true } } },
      {
        $project: {
          createdAt: 1,
          commentsCount: { $size: { $ifNull: ["$comments", []] } },
        },
      },
      {
        $group: {
          _id: buildDateBucketExpr(granularity, tz),
          comments: { $sum: "$commentsCount" },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, bucket: "$_id", comments: 1 } },
    ]);

    // -------- Chat activity (messages count inside chats) - heavy but useful
    const chatSeries = Chat
      ? await Chat.aggregate([
          { $match: { ...maybeMatchDate(from, to, "updatedAt"), isRemoved: { $ne: true } } },
          {
            $project: {
              updatedAt: 1,
              messagesCount: { $size: { $ifNull: ["$messages", []] } },
              type: 1,
            },
          },
          {
            $group: {
              _id: buildDateBucketExpr(granularity, tz),
              totalMessages: { $sum: "$messagesCount" },
              dmChats: {
                $sum: { $cond: [{ $eq: ["$type", "dm"] }, 1, 0] },
              },
              groupChats: {
                $sum: { $cond: [{ $eq: ["$type", "group"] }, 1, 0] },
              },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              bucket: "$_id",
              totalMessages: 1,
              dmChats: 1,
              groupChats: 1,
            },
          },
        ])
      : [];

    // -------- Hub Updates activity (embedded hub.updates)
    const hubUpdatesSeries = Hub
      ? await Hub.aggregate([
          { $match: { isRemoved: { $ne: true } } },
          { $unwind: { path: "$updates", preserveNullAndEmptyArrays: false } },
          { $match: { "updates.createdAt": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$updates.createdAt",
                  timezone: tz,
                },
              },
              updates: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", updates: 1 } },
        ])
      : [];

    // -------- Top creators
    const topCreators = await topCreatorsFromPosts({ from, to, limit });

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        posts: (engagementSummary?.[0]?.posts ?? 0),
        totalLikes: (engagementSummary?.[0]?.totalLikes ?? 0),
        totalComments: (engagementSummary?.[0]?.totalComments ?? 0),
        totalShares: (engagementSummary?.[0]?.totalShares ?? 0),
      },
      series: {
        posts: postsSeries,
        comments: commentsSeries,
        chat: chatSeries,
        hubUpdates: hubUpdatesSeries,
      },
      breakdowns: {
        postTypes,
      },
      leaders: {
        topPosts,
        topCreators,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load social engagement analytics");
  }
}

// ============================================================
// ============================================================
// 3) 🎓 LEARNING & PROGRAMS
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/learning-programs?from&to&granularity&limit
 */
async function getLearningPrograms(req, res) {
  try {
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // -------- Programs created series
    const programsCreatedSeries = Program
      ? await countSeriesByCreatedAt(Program, { from, to, tz, granularity })
      : [];

    // -------- Enrollment series (participants embedded)
    const enrollmentsSeries = Program
      ? await Program.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$participants", preserveNullAndEmptyArrays: false } },
          { $match: { "participants.enrolledAt": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$participants.enrolledAt",
                  timezone: tz,
                },
              },
              enrollments: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", enrollments: 1 } },
        ])
      : [];

    // -------- Completion series (progress===100 or certificateIssued)
    const completionsSeries = Program
      ? await Program.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$participants", preserveNullAndEmptyArrays: false } },
          {
            $match: {
              "participants.completedAt": { $gte: from, $lte: to },
              $or: [
                { "participants.progress": 100 },
                { "participants.certificateIssued": true },
              ],
            },
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$participants.completedAt",
                  timezone: tz,
                },
              },
              completions: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", completions: 1 } },
        ])
      : [];

    // -------- Program category performance
    const programsByCategory = Program
      ? await Program.aggregate([
          { $group: { _id: "$category", programs: { $sum: 1 } } },
          { $sort: { programs: -1 } },
          { $project: { _id: 0, category: "$_id", programs: 1 } },
        ])
      : [];

    // -------- Top programs by enrollments in range
    const topPrograms = Program
      ? await Program.aggregate([
          { $match: { createdAt: { $lte: to } } },
          {
            $project: {
              title: 1,
              category: 1,
              status: 1,
              createdAt: 1,
              enrollmentsInRange: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$participants", []] },
                    as: "p",
                    cond: {
                      $and: [
                        { $gte: ["$$p.enrolledAt", from] },
                        { $lte: ["$$p.enrolledAt", to] },
                      ],
                    },
                  },
                },
              },
              totalParticipants: { $size: { $ifNull: ["$participants", []] } },
              completedInRange: {
                $size: {
                  $filter: {
                    input: { $ifNull: ["$participants", []] },
                    as: "p",
                    cond: {
                      $and: [
                        { $gte: ["$$p.completedAt", from] },
                        { $lte: ["$$p.completedAt", to] },
                        { $eq: ["$$p.progress", 100] },
                      ],
                    },
                  },
                },
              },
            },
          },
          { $sort: { enrollmentsInRange: -1, totalParticipants: -1 } },
          { $limit: limit },
          { $project: { _id: 0, programId: "$_id", title: 1, category: 1, status: 1, createdAt: 1, enrollmentsInRange: 1, totalParticipants: 1, completedInRange: 1 } },
        ])
      : [];

    // -------- Events: created + registrations + attendance
    const eventsCreatedSeries = Event
      ? await countSeriesByCreatedAt(Event, { from, to, tz, granularity })
      : [];

    const eventRegistrationsSeries = Event
      ? await Event.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$attendees", preserveNullAndEmptyArrays: false } },
          { $match: { "attendees.registeredAt": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$attendees.registeredAt",
                  timezone: tz,
                },
              },
              registrations: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", registrations: 1 } },
        ])
      : [];

    const eventAttendanceSeries = Event
      ? await Event.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$attendees", preserveNullAndEmptyArrays: false } },
          { $match: { "attendees.checkInAt": { $gte: from, $lte: to }, "attendees.status": "attended" } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$attendees.checkInAt",
                  timezone: tz,
                },
              },
              attended: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", attended: 1 } },
        ])
      : [];

    // -------- Retreat consumption (participants progress)
    const retreatParticipationSeries = Retreat
      ? await Retreat.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$participants", preserveNullAndEmptyArrays: false } },
          { $match: { "participants.joinedAt": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$participants.joinedAt",
                  timezone: tz,
                },
              },
              joins: { $sum: 1 },
              avgProgress: { $avg: "$participants.progress" },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", joins: 1, avgProgress: 1 } },
        ])
      : [];

    // -------- Journal entries (wellness usage proxy)
    const journalSeries = Journal
      ? await countSeriesByCreatedAt(Journal, { from, to, tz, granularity })
      : [];

    // KPIs
    const [totalPrograms, totalEvents, totalRetreats] = await Promise.all([
      Program ? Program.countDocuments({}) : 0,
      Event ? Event.countDocuments({}) : 0,
      Retreat ? Retreat.countDocuments({}) : 0,
    ]);

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        totalPrograms,
        totalEvents,
        totalRetreats,
      },
      series: {
        programsCreated: programsCreatedSeries,
        enrollments: enrollmentsSeries,
        completions: completionsSeries,
        eventsCreated: eventsCreatedSeries,
        eventRegistrations: eventRegistrationsSeries,
        eventAttendance: eventAttendanceSeries,
        retreatParticipation: retreatParticipationSeries,
        journals: journalSeries,
      },
      breakdowns: {
        programsByCategory,
      },
      leaders: {
        topPrograms,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load learning & programs analytics");
  }
}

// ============================================================
// ============================================================
// 4) 💰 FINANCIAL & TRANSACTIONS
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/financial-transactions?from&to&granularity&limit
 */
async function getFinancialTransactions(req, res) {
  try {
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // -------- Payment intents: volume, success rate, failures
    const paymentSeries = PaymentIntent
      ? await PaymentIntent.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: buildDateBucketExpr(granularity, tz),
              created: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
              pending: { $sum: { $cond: [{ $in: ["$status", ["CREATED", "PENDING"]] }, 1, 0] } },
              totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              bucket: "$_id",
              created: 1,
              completed: 1,
              failed: 1,
              pending: 1,
              totalAmount: 1,
            },
          },
        ])
      : [];

    const paymentByPurpose = PaymentIntent
      ? await PaymentIntent.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: "$purpose",
              count: { $sum: 1 },
              totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
              completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
            },
          },
          { $sort: { totalAmount: -1, count: -1 } },
          { $project: { _id: 0, purpose: "$_id", count: 1, totalAmount: 1, completed: 1 } },
        ])
      : [];

    // -------- Orders revenue (if you use Order.amount)
    const orderSeries = Order
      ? await Order.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: buildDateBucketExpr(granularity, tz),
              orders: { $sum: 1 },
              revenue: { $sum: { $ifNull: ["$amount", 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", orders: 1, revenue: 1 } },
        ])
      : [];

    // -------- Savings Pods: contributions volume (embedded contributions)
    const savingsContribSeries = SavingsPod
      ? await SavingsPod.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$contributions", preserveNullAndEmptyArrays: false } },
          { $match: { "contributions.date": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$contributions.date",
                  timezone: tz,
                },
              },
              contributions: { $sum: 1 },
              amount: { $sum: { $ifNull: ["$contributions.amount", 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", contributions: 1, amount: 1 } },
        ])
      : [];

    // -------- Withdrawals series
    const savingsWithdrawSeries = SavingsPod
      ? await SavingsPod.aggregate([
          { $match: { createdAt: { $lte: to } } },
          { $unwind: { path: "$withdrawals", preserveNullAndEmptyArrays: false } },
          { $match: { "withdrawals.date": { $gte: from, $lte: to } } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format:
                    granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
                  date: "$withdrawals.date",
                  timezone: tz,
                },
              },
              withdrawals: { $sum: 1 },
              amount: { $sum: { $ifNull: ["$withdrawals.amount", 0] } },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", withdrawals: 1, amount: 1 } },
        ])
      : [];

    // -------- Top paying users (by PaymentIntent amount)
    const topPayers = PaymentIntent
      ? await PaymentIntent.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt"), status: "COMPLETED" } },
          { $group: { _id: "$userId", total: { $sum: { $ifNull: ["$amount", 0] } }, count: { $sum: 1 } } },
          { $sort: { total: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "u",
            },
          },
          { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              userId: "$_id",
              total: 1,
              count: 1,
              fullName: "$u.profile.fullName",
              avatar: "$u.profile.avatar.url",
            },
          },
        ])
      : [];

    // KPIs summary
    const paymentKpis = PaymentIntent
      ? await PaymentIntent.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: null,
              created: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
              failed: { $sum: { $cond: [{ $eq: ["$status", "FAILED"] }, 1, 0] } },
              totalAmount: { $sum: { $ifNull: ["$amount", 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              created: 1,
              completed: 1,
              failed: 1,
              totalAmount: 1,
              successRate: {
                $cond: [{ $gt: ["$created", 0] }, { $divide: ["$completed", "$created"] }, 0],
              },
            },
          },
        ])
      : [];

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        payments: paymentKpis?.[0] || { created: 0, completed: 0, failed: 0, totalAmount: 0, successRate: 0 },
      },
      series: {
        paymentIntents: paymentSeries,
        orders: orderSeries,
        savingsContributions: savingsContribSeries,
        savingsWithdrawals: savingsWithdrawSeries,
      },
      breakdowns: {
        paymentByPurpose,
      },
      leaders: {
        topPayers,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load financial & transactions analytics");
  }
}

// ============================================================
// ============================================================
// 5) 🛍 MARKETPLACE & ECONOMY
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/marketplace-economy?from&to&granularity&limit
 */
async function getMarketplaceEconomy(req, res) {
  try {
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // -------- Products created series
    const productsSeries = Product
      ? await countSeriesByCreatedAt(Product, { from, to, tz, granularity })
      : [];

    // -------- Orders series
    const ordersSeries = Order
      ? await countSeriesByCreatedAt(Order, { from, to, tz, granularity })
      : [];

    // -------- Revenue series from orders
    const revenueSeries = Order
      ? await Order.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: buildDateBucketExpr(granularity, tz),
              revenue: { $sum: { $ifNull: ["$amount", 0] } },
              orders: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, bucket: "$_id", revenue: 1, orders: 1 } },
        ])
      : [];

    // -------- Best categories (Products)
    const topProductCategories = Product
      ? await Product.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$category", count: { $sum: 1 }, avgPrice: { $avg: "$price" } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, category: "$_id", count: 1, avgPrice: 1 } },
        ])
      : [];

    // -------- Seller leaderboard (orders → items.seller totals)
    const topSellers = Order
      ? await Order.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $unwind: { path: "$items", preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: "$items.seller",
              revenue: { $sum: { $ifNull: ["$items.subtotal", 0] } },
              itemsSold: { $sum: { $ifNull: ["$items.quantity", 0] } },
            },
          },
          { $sort: { revenue: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "u",
            },
          },
          { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              sellerId: "$_id",
              revenue: 1,
              itemsSold: 1,
              fullName: "$u.profile.fullName",
              avatar: "$u.profile.avatar.url",
            },
          },
        ])
      : [];

    // -------- Jobs + Funding + Skills - supply side health
    const jobsSeries = Job ? await countSeriesByCreatedAt(Job, { from, to, tz, granularity }) : [];
    const fundingSeries = Funding ? await countSeriesByCreatedAt(Funding, { from, to, tz, granularity }) : [];
    const skillsSeries = Skill ? await countSeriesByCreatedAt(Skill, { from, to, tz, granularity }) : [];

    const jobTypes = Job
      ? await Job.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, type: "$_id", count: 1 } },
        ])
      : [];

    const fundingByType = Funding
      ? await Funding.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, type: "$_id", count: 1 } },
        ])
      : [];

    const skillsByCategory = Skill
      ? await Skill.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$category", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, category: "$_id", count: 1 } },
        ])
      : [];

    // KPIs
    const [totalProducts, totalOrders, totalJobs, totalFunding, totalSkills] = await Promise.all([
      Product ? Product.countDocuments({}) : 0,
      Order ? Order.countDocuments({}) : 0,
      Job ? Job.countDocuments({}) : 0,
      Funding ? Funding.countDocuments({}) : 0,
      Skill ? Skill.countDocuments({}) : 0,
    ]);

    return ok(res, {
      range: { from, to, tz, granularity },
      kpis: {
        totalProducts,
        totalOrders,
        totalJobs,
        totalFunding,
        totalSkills,
      },
      series: {
        products: productsSeries,
        orders: ordersSeries,
        revenue: revenueSeries,
        jobs: jobsSeries,
        funding: fundingSeries,
        skills: skillsSeries,
      },
      breakdowns: {
        topProductCategories,
        jobTypes,
        fundingByType,
        skillsByCategory,
      },
      leaders: {
        topSellers,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load marketplace & economy analytics");
  }
}

// ============================================================
// ============================================================
// 6) 🎤 REAL-TIME / LIVE ACTIVITY
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/realtime?minutes=15&limit=10
 *
 * Note:
 * - True "online" requires presence tracking (Redis / Socket)
 * - Here we approximate using User.lastActive within window
 */
async function getRealtimeLiveActivity(req, res) {
  try {
    const minutes = clampLimit(req.query.minutes, 1, 240, 15);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    const to = new Date();
    const from = new Date(Date.now() - minutes * 60 * 1000);

    // Active users in last X minutes
    const activeUsers = User
      ? await User.aggregate([
          { $match: { lastActive: { $gte: from, $lte: to } } },
          { $count: "count" },
        ])
      : [];

    // Posts created in last window
    const recentPosts = Post
      ? await Post.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to }, isRemoved: { $ne: true } } },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "author",
              foreignField: "_id",
              as: "authorObj",
            },
          },
          { $unwind: { path: "$authorObj", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              postId: "$_id",
              type: 1,
              createdAt: 1,
              likesCount: 1,
              commentsCount: 1,
              author: {
                userId: "$author",
                fullName: "$authorObj.profile.fullName",
                avatar: "$authorObj.profile.avatar.url",
              },
              textPreview: "$content.text",
            },
          },
        ])
      : [];

    // Payments completed in last window
    const recentPayments = PaymentIntent
      ? await PaymentIntent.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              intentId: 1,
              purpose: 1,
              status: 1,
              amount: 1,
              currency: 1,
              userId: 1,
              createdAt: 1,
              checkoutRequestId: 1,
              mpesaReceiptNumber: 1,
            },
          },
        ])
      : [];

    // Reports created in last window
    const recentReports = Report
      ? await Report.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "reporter",
              foreignField: "_id",
              as: "reporterObj",
            },
          },
          { $unwind: { path: "$reporterObj", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              reportId: "$_id",
              createdAt: 1,
              targetType: 1,
              targetId: 1,
              reason: 1,
              resolved: 1,
              reporter: {
                userId: "$reporter",
                fullName: "$reporterObj.profile.fullName",
                avatar: "$reporterObj.profile.avatar.url",
              },
            },
          },
        ])
      : [];

    // Voice rooms live now (based on instances.status === "live")
    const liveVoiceRooms = Voice
      ? await Voice.aggregate([
          { $match: { isRemoved: { $ne: true } } },
          {
            $addFields: {
              currentInstance: {
                $let: {
                  vars: { instances: { $ifNull: ["$instances", []] } },
                  in: {
                    $ifNull: [
                      {
                        $first: {
                          $filter: {
                            input: "$$instances",
                            as: "i",
                            cond: { $eq: ["$$i.status", "live"] },
                          },
                        },
                      },
                      { $arrayElemAt: ["$$instances", -1] },
                    ],
                  },
                },
              },
            },
          },
          { $match: { "currentInstance.status": "live" } },
          { $sort: { "currentInstance.startsAt": -1 } },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              voiceId: "$_id",
              title: 1,
              host: 1,
              group: 1,
              hub: 1,
              startsAt: "$currentInstance.startsAt",
              endsAt: "$currentInstance.endsAt",
              speakersCount: { $size: { $ifNull: ["$currentInstance.speakers", []] } },
              listenersCount: { $size: { $ifNull: ["$currentInstance.participants", []] } },
            },
          },
        ])
      : [];

    return ok(res, {
      window: { minutes, from, to },
      kpis: {
        activeUsers: activeUsers?.[0]?.count ?? 0,
        posts: recentPosts.length,
        payments: recentPayments.length,
        reports: recentReports.length,
        liveVoiceRooms: liveVoiceRooms.length,
      },
      feed: {
        recentPosts,
        recentPayments,
        recentReports,
      },
      live: {
        voiceRooms: liveVoiceRooms,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load real-time analytics");
  }
}

// ============================================================
// ============================================================
// 7) 🛡 MODERATION & SAFETY
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/moderation-safety?from&to&granularity&limit
 */
async function getModerationSafety(req, res) {
  try {
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);
    const limit = clampLimit(req.query.limit, 1, 50, 10);

    // Reports series
    const reportsSeries = Report
      ? await countSeriesByCreatedAt(Report, { from, to, tz, granularity })
      : [];

    // Pending vs resolved breakdown
    const reportStatus = Report
      ? await Report.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          {
            $group: {
              _id: "$resolved",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          {
            $project: {
              _id: 0,
              resolved: "$_id",
              count: 1,
            },
          },
        ])
      : [];

    // Target types breakdown
    const reportTargetTypes = Report
      ? await Report.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$targetType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $project: { _id: 0, targetType: "$_id", count: 1 } },
        ])
      : [];

    // Average resolution time (resolvedAt - createdAt)
    const resolutionTime = Report
      ? await Report.aggregate([
          { $match: { resolved: true, resolvedAt: { $ne: null }, createdAt: { $gte: from, $lte: to } } },
          {
            $project: {
              resolutionMs: { $subtract: ["$resolvedAt", "$createdAt"] },
            },
          },
          {
            $group: {
              _id: null,
              avgResolutionMs: { $avg: "$resolutionMs" },
              countResolved: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              countResolved: 1,
              avgResolutionMs: 1,
              avgResolutionHours: { $divide: ["$avgResolutionMs", 1000 * 60 * 60] },
            },
          },
        ])
      : [];

    // Top reported users (targetType=user)
    const topReportedUsers = Report
      ? await Report.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt"), targetType: "user" } },
          { $group: { _id: "$targetId", reports: { $sum: 1 } } },
          { $sort: { reports: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "users",
              localField: "_id",
              foreignField: "_id",
              as: "u",
            },
          },
          { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              userId: "$_id",
              reports: 1,
              fullName: "$u.profile.fullName",
              avatar: "$u.profile.avatar.url",
              role: "$u.profile.role",
            },
          },
        ])
      : [];

    // Top reported groups (targetType=group) – if you use Report targetType=group
    const topReportedGroups = Report && Group
      ? await Report.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt"), targetType: "group" } },
          { $group: { _id: "$targetId", reports: { $sum: 1 } } },
          { $sort: { reports: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: "groups",
              localField: "_id",
              foreignField: "_id",
              as: "g",
            },
          },
          { $unwind: { path: "$g", preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              groupId: "$_id",
              reports: 1,
              name: "$g.name",
              createdAt: "$g.createdAt",
            },
          },
        ])
      : [];

    // Notifications - safety alerts, system alerts, etc (optional)
    const notificationTypes = Notification
      ? await Notification.aggregate([
          { $match: { ...maybeMatchDate(from, to, "createdAt") } },
          { $group: { _id: "$type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: limit },
          { $project: { _id: 0, type: "$_id", count: 1 } },
        ])
      : [];

    return ok(res, {
      range: { from, to, tz, granularity },
      series: {
        reports: reportsSeries,
      },
      breakdowns: {
        reportStatus,
        reportTargetTypes,
        notificationTypes,
      },
      performance: {
        resolution: resolutionTime?.[0] || { countResolved: 0, avgResolutionMs: 0, avgResolutionHours: 0 },
      },
      leaders: {
        topReportedUsers,
        topReportedGroups,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load moderation & safety analytics");
  }
}

// ============================================================
// ============================================================
// 8) 📈 GROWTH & RETENTION
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/growth-retention?from&to&granularity
 *
 * Notes:
 * - True retention typically needs event logs (login/session table).
 * - Here: proxy retention using lastActive + cohorts by createdAt.
 */
async function getGrowthRetention(req, res) {
  try {
    ensureModel(User, "User");
    const { from, to, tz } = parseDateRange(req.query);
    const granularity = parseGranularity(req.query);

    // New user series
    const newUsers = await countSeriesByCreatedAt(User, { from, to, tz, granularity });

    // Active user series
    const activeUsers = await User.aggregate([
      { $match: { lastActive: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format:
                granularity === "month" ? "%Y-%m" : granularity === "week" ? "%G-W%V" : "%Y-%m-%d",
              date: "$lastActive",
              timezone: tz,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, bucket: "$_id", count: 1 } },
    ]);

    // Simple cohort retention: users created in the period, still active in the period
    const cohort = await User.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $project: {
          createdAt: 1,
          lastActive: 1,
          createdDay: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz },
          },
          daysSinceSignup: {
            $divide: [{ $subtract: [to, "$createdAt"] }, 1000 * 60 * 60 * 24],
          },
          isActiveNow: { $cond: [{ $gte: ["$lastActive", from] }, true, false] },
        },
      },
      {
        $group: {
          _id: "$createdDay",
          signups: { $sum: 1 },
          activeInWindow: { $sum: { $cond: ["$isActiveNow", 1, 0] } },
          avgDaysSinceSignup: { $avg: "$daysSinceSignup" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          cohortDay: "$_id",
          signups: 1,
          activeInWindow: 1,
          retentionProxy: {
            $cond: [{ $gt: ["$signups", 0] }, { $divide: ["$activeInWindow", "$signups"] }, 0],
          },
          avgDaysSinceSignup: 1,
        },
      },
    ]);

    // Funnel proxy (optional): signups -> posts -> enrollments -> payments
    // We compute counts of unique users who did each action within window.
    const [postActors, enrollmentActors, payingActors] = await Promise.all([
      Post
        ? Post.aggregate([
            { $match: { createdAt: { $gte: from, $lte: to }, isRemoved: { $ne: true } } },
            { $group: { _id: "$author" } },
            { $count: "count" },
          ])
        : [],
      Program
        ? Program.aggregate([
            { $unwind: { path: "$participants", preserveNullAndEmptyArrays: false } },
            { $match: { "participants.enrolledAt": { $gte: from, $lte: to } } },
            { $group: { _id: "$participants.user" } },
            { $count: "count" },
          ])
        : [],
      PaymentIntent
        ? PaymentIntent.aggregate([
            { $match: { createdAt: { $gte: from, $lte: to }, status: "COMPLETED" } },
            { $group: { _id: "$userId" } },
            { $count: "count" },
          ])
        : [],
    ]);

    const signupsInWindow = await User.countDocuments({ createdAt: { $gte: from, $lte: to } });

    return ok(res, {
      range: { from, to, tz, granularity },
      series: {
        newUsers,
        activeUsers,
      },
      retention: {
        cohorts: cohort,
      },
      funnelProxy: {
        signups: signupsInWindow,
        usersWhoPosted: postActors?.[0]?.count ?? 0,
        usersWhoEnrolled: enrollmentActors?.[0]?.count ?? 0,
        usersWhoPaid: payingActors?.[0]?.count ?? 0,
      },
    });
  } catch (err) {
    return serverError(res, err, "Failed to load growth & retention analytics");
  }
}

// ============================================================
// ============================================================
// LAYER SWITCH ENDPOINT (single endpoint for your dropdown)
// ============================================================
// ============================================================

/**
 * GET /admin/analytics/layer?key=user-community
 *
 * key values:
 * - overview
 * - user-community
 * - social-engagement
 * - learning-programs
 * - financial-transactions
 * - marketplace-economy
 * - realtime
 * - moderation-safety
 * - growth-retention
 */
async function getAnalyticsLayer(req, res) {
  try {
    const key = String(req.query.key || "").trim();

    // Route internally (keeps your frontend dropdown clean)
    switch (key) {
      case "overview":
        return getOverview(req, res);

      case "user-community":
        return getUserCommunityHealth(req, res);

      case "social-engagement":
        return getSocialEngagement(req, res);

      case "learning-programs":
        return getLearningPrograms(req, res);

      case "financial-transactions":
        return getFinancialTransactions(req, res);

      case "marketplace-economy":
        return getMarketplaceEconomy(req, res);

      case "realtime":
        return getRealtimeLiveActivity(req, res);

      case "moderation-safety":
        return getModerationSafety(req, res);

      case "growth-retention":
        return getGrowthRetention(req, res);

      default:
        return bad(res, "Invalid layer key", {
          allowed: [
            "overview",
            "user-community",
            "social-engagement",
            "learning-programs",
            "financial-transactions",
            "marketplace-economy",
            "realtime",
            "moderation-safety",
            "growth-retention",
          ],
        });
    }
  } catch (err) {
    return serverError(res, err, "Failed to load analytics layer");
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // Overview
  getOverview,

  // Layer endpoints
  getUserCommunityHealth,
  getSocialEngagement,
  getLearningPrograms,
  getFinancialTransactions,
  getMarketplaceEconomy,
  getRealtimeLiveActivity,
  getModerationSafety,
  getGrowthRetention,

  // Single dropdown endpoint
  getAnalyticsLayer,
};