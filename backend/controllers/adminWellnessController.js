// controllers/adminWellnessController.js
// ============================================================
// ADMIN WELLNESS CONTROLLER (Privacy-first)
// - NO journal text ever leaves the DB (analytics only)
// - Mood analytics (distribution, trend, heatmap, risk, volatility)
// - Mood vs Retreat correlation (before/after completion; participants vs non-participants)
// - Wellness Growth Index (user-level improvement + platform score)
// - Retreat funnel + engagement analytics
// - Retreat admin CRUD (create/edit/feature/reorder/soft-delete)
// - Early Warning Alert System (threshold-based + baseline anomaly detection)
//
// Notes:
// 1) This file is intentionally comprehensive and “enterprise-style”.
// 2) Some computations can be heavy on large datasets; consider adding:
//    - materialized daily aggregates (cron) OR
//    - caching layer (Redis) OR
//    - date-range limits enforced server-side.
// ============================================================

const mongoose = require("mongoose");
const Journal = require("../models/Journal");
const Retreat = require("../models/Retreat");

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const clampInt = (v, min, max, fallback) => {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const clampFloat = (v, min, max, fallback) => {
  const n = Number.parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
};

const toDate = (v, fallback = null) => {
  const d = v ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) return fallback;
  return d;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const hoursAgo = (n) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};

const safeRange = (req) => {
  // Query params:
  // - days: 7/30/90...
  // - from, to: ISO strings
  // Defaults:
  // - days=30 if none provided
  const days = clampInt(req.query.days, 1, 365, 30);
  const fromQ = toDate(req.query.from);
  const toQ = toDate(req.query.to);

  if (fromQ && toQ) {
    return {
      from: startOfDay(fromQ),
      to: endOfDay(toQ),
      days: Math.ceil((endOfDay(toQ) - startOfDay(fromQ)) / (1000 * 60 * 60 * 24)) || days,
    };
  }

  const to = new Date();
  const from = daysAgo(days);
  return { from: startOfDay(from), to: endOfDay(to), days };
};

const safeWindow = (req, key, min, max, fallback) => {
  // e.g. windowDays=7, baselineDays=30, beforeDays=7, afterDays=7
  return clampInt(req.query[key], min, max, fallback);
};

const moodLabelOrder = ["great", "good", "okay", "low"];

const normalizeDistribution = (rows) => {
  const map = new Map();
  for (const r of rows || []) map.set(r._id || "unknown", r.count || 0);

  return moodLabelOrder.map((label) => ({
    label,
    count: map.get(label) || 0,
  }));
};

const computePercent = (part, total) => (total > 0 ? (part / total) * 100 : 0);

// ------------------------------------------------------------
// Core Mood Aggregation Pipelines
// ------------------------------------------------------------

const moodMatchStage = (from, to) => ({
  $match: {
    createdAt: { $gte: from, $lte: to },
    // only records with a moodValue
    moodValue: { $type: "number" },
  },
});

const groupDailyAvgMood = () => ([
  {
    $group: {
      _id: {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      },
      avgMood: { $avg: "$moodValue" },
      count: { $sum: 1 },
    },
  },
  { $sort: { _id: 1 } },
]);

const groupWeeklyAvgMood = () => ([
  {
    $group: {
      _id: {
        year: { $isoWeekYear: "$createdAt" },
        week: { $isoWeek: "$createdAt" },
      },
      avgMood: { $avg: "$moodValue" },
      count: { $sum: 1 },
      start: { $min: "$createdAt" },
      end: { $max: "$createdAt" },
    },
  },
  { $sort: { "_id.year": 1, "_id.week": 1 } },
  {
    $project: {
      _id: 0,
      year: "$_id.year",
      week: "$_id.week",
      avgMood: 1,
      count: 1,
      start: 1,
      end: 1,
    },
  },
]);

const groupMoodDistribution = () => ([
  {
    $group: {
      _id: "$mood.label",
      count: { $sum: 1 },
    },
  },
]);

const computeMoodSummaryFacet = () => ({
  $facet: {
    totals: [
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgMood: { $avg: "$moodValue" },
          minMood: { $min: "$moodValue" },
          maxMood: { $max: "$moodValue" },
          avgWellnessScore: { $avg: "$wellnessScore" },
        },
      },
      {
        $project: {
          _id: 0,
          count: 1,
          avgMood: { $ifNull: ["$avgMood", 0] },
          minMood: { $ifNull: ["$minMood", 0] },
          maxMood: { $ifNull: ["$maxMood", 0] },
          avgWellnessScore: { $ifNull: ["$avgWellnessScore", 0] },
        },
      },
    ],
    distribution: groupMoodDistribution(),
    dailyTrend: groupDailyAvgMood(),
    weeklyTrend: groupWeeklyAvgMood(),
  },
});

// ------------------------------------------------------------
// Enterprise Add-on 1: Mood Heatmap (Day of Week)
// ------------------------------------------------------------

exports.getMoodHeatmap = async (req, res) => {
  try {
    const { from, to } = safeRange(req);

    // optional timezone offset in minutes (e.g. +180 for Africa/Nairobi)
    const tzOffsetMin = clampInt(req.query.tzOffsetMin, -720, 840, 180);

    // We can shift createdAt by tz offset to make day-of-week accurate for admin locale
    const heatmap = await Journal.aggregate([
      moodMatchStage(from, to),
      {
        $addFields: {
          localTime: {
            $dateAdd: {
              startDate: "$createdAt",
              unit: "minute",
              amount: tzOffsetMin,
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dow: { $dayOfWeek: "$localTime" }, // 1=Sun..7=Sat
            hour: { $hour: "$localTime" }, // 0..23
          },
          avgMood: { $avg: "$moodValue" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.dow": 1, "_id.hour": 1 } },
      {
        $project: {
          _id: 0,
          dow: "$_id.dow",
          hour: "$_id.hour",
          avgMood: { $round: ["$avgMood", 1] },
          count: 1,
        },
      },
    ]);

    // Also provide weekday summary (no hours) for simpler UI
    const weekdaySummary = await Journal.aggregate([
      moodMatchStage(from, to),
      {
        $addFields: {
          localTime: {
            $dateAdd: {
              startDate: "$createdAt",
              unit: "minute",
              amount: tzOffsetMin,
            },
          },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$localTime" },
          avgMood: { $avg: "$moodValue" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          dow: "$_id",
          avgMood: { $round: ["$avgMood", 1] },
          count: 1,
        },
      },
    ]);

    return res.json({
      from,
      to,
      tzOffsetMin,
      heatmap,
      weekdaySummary,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Enterprise Add-on 2: Mood vs Retreat Correlation
// ------------------------------------------------------------
// What we can do without violating privacy:
// - Use moodValue only
// - Compare mood before/after retreat completion (per completion event)
// - Compare overall participants vs non-participants in the same timeframe
//
// Query params:
// - days=90 (how far back to look for completions)
// - beforeDays=7 (window before completion)
// - afterDays=7  (window after completion)
// - minSamples=5 (minimum journal entries required per window)
// ------------------------------------------------------------

exports.getMoodRetreatCorrelation = async (req, res) => {
  try {
    const days = safeWindow(req, "days", 7, 365, 90);
    const beforeDays = safeWindow(req, "beforeDays", 1, 60, 7);
    const afterDays = safeWindow(req, "afterDays", 1, 60, 7);
    const minSamples = safeWindow(req, "minSamples", 1, 30, 3);

    const since = startOfDay(daysAgo(days));
    const until = endOfDay(new Date());

    // 1) Build a list of completion events: { userId, retreatId, completedAt }
    // We unwind participants where completed=true and completedAt exists.
    const completionEvents = await Retreat.aggregate([
      {
        $match: {
          "participants.completed": true,
          "participants.completedAt": { $exists: true, $ne: null },
        },
      },
      { $unwind: "$participants" },
      {
        $match: {
          "participants.completed": true,
          "participants.completedAt": { $gte: since, $lte: until },
        },
      },
      {
        $project: {
          retreatId: "$_id",
          title: 1,
          type: 1,
          category: 1,
          userId: "$participants.user",
          completedAt: "$participants.completedAt",
        },
      },
      { $limit: 2000 }, // safety cap (tune as needed)
    ]);

    // 2) For each event, compute avg mood before/after
    // NOTE: This loop can be heavy if too many events; consider a batch pipeline with $lookup
    // For now, we do capped events + fast index on (user, createdAt) / moodValue index helps some.
    const enriched = [];
    for (const e of completionEvents) {
      const beforeFrom = startOfDay(new Date(e.completedAt.getTime() - beforeDays * 24 * 60 * 60 * 1000));
      const beforeTo = endOfDay(new Date(e.completedAt.getTime() - 1));
      const afterFrom = startOfDay(new Date(e.completedAt.getTime() + 1));
      const afterTo = endOfDay(new Date(e.completedAt.getTime() + afterDays * 24 * 60 * 60 * 1000));

      const [beforeAgg] = await Journal.aggregate([
        {
          $match: {
            user: e.userId,
            createdAt: { $gte: beforeFrom, $lte: beforeTo },
            moodValue: { $type: "number" },
          },
        },
        {
          $group: {
            _id: null,
            avg: { $avg: "$moodValue" },
            count: { $sum: 1 },
          },
        },
      ]);

      const [afterAgg] = await Journal.aggregate([
        {
          $match: {
            user: e.userId,
            createdAt: { $gte: afterFrom, $lte: afterTo },
            moodValue: { $type: "number" },
          },
        },
        {
          $group: {
            _id: null,
            avg: { $avg: "$moodValue" },
            count: { $sum: 1 },
          },
        },
      ]);

      const beforeCount = beforeAgg?.count || 0;
      const afterCount = afterAgg?.count || 0;

      if (beforeCount < minSamples || afterCount < minSamples) continue;

      const beforeAvg = beforeAgg.avg || 0;
      const afterAvg = afterAgg.avg || 0;

      enriched.push({
        retreatId: e.retreatId,
        title: e.title,
        type: e.type,
        category: e.category,
        userId: String(e.userId),
        completedAt: e.completedAt,
        before: { from: beforeFrom, to: beforeTo, avgMood: beforeAvg, samples: beforeCount },
        after: { from: afterFrom, to: afterTo, avgMood: afterAvg, samples: afterCount },
        delta: afterAvg - beforeAvg,
      });
    }

    // 3) Aggregate result metrics
    const overall = (() => {
      if (!enriched.length) {
        return {
          eventsUsed: 0,
          avgBefore: 0,
          avgAfter: 0,
          avgDelta: 0,
          improvementRate: 0,
        };
      }
      const avgBefore = enriched.reduce((s, x) => s + x.before.avgMood, 0) / enriched.length;
      const avgAfter = enriched.reduce((s, x) => s + x.after.avgMood, 0) / enriched.length;
      const avgDelta = enriched.reduce((s, x) => s + x.delta, 0) / enriched.length;
      const improved = enriched.filter((x) => x.delta > 0).length;
      return {
        eventsUsed: enriched.length,
        avgBefore,
        avgAfter,
        avgDelta,
        improvementRate: computePercent(improved, enriched.length),
      };
    })();

    // 4) Compare participants vs non-participants (overall)
    // participants = users who joined any retreat in this range
    const participantUserIds = await Retreat.distinct("participants.user", {
      updatedAt: { $gte: since, $lte: until },
    });

    // Mood for participants
    const [participantsMood] = await Journal.aggregate([
      {
        $match: {
          user: { $in: participantUserIds },
          createdAt: { $gte: since, $lte: until },
          moodValue: { $type: "number" },
        },
      },
      {
        $group: {
          _id: null,
          avgMood: { $avg: "$moodValue" },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, avgMood: { $ifNull: ["$avgMood", 0] }, count: 1 } },
    ]);

    // Mood for non-participants: approximation
    // We can’t “distinct all users” without User model; so we provide:
    // - overall mood average
    // - participants average
    // - delta vs overall
    const [overallMood] = await Journal.aggregate([
      moodMatchStage(since, until),
      {
        $group: { _id: null, avgMood: { $avg: "$moodValue" }, count: { $sum: 1 } },
      },
      { $project: { _id: 0, avgMood: { $ifNull: ["$avgMood", 0] }, count: 1 } },
    ]);

    return res.json({
      since,
      until,
      config: { days, beforeDays, afterDays, minSamples },
      overall,
      eventsSample: enriched.slice(0, 200), // send sample to UI (cap payload)
      participantsVsOverall: {
        participants: participantsMood || { avgMood: 0, count: 0 },
        overall: overallMood || { avgMood: 0, count: 0 },
        deltaParticipantsMinusOverall:
          (participantsMood?.avgMood || 0) - (overallMood?.avgMood || 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Enterprise Add-on 3: Wellness Growth Index
// ------------------------------------------------------------
// Tracks per-user mood improvement over 30 days.
// Strategy (privacy-first):
// - For each user, compute avg mood in first 7 days vs last 7 days of the window.
// - Improvement = last7 - first7
// - Platform emotional growth score = avg improvement (clamped) + % improving
//
// Query params:
// - windowDays=30
// - edgeDays=7 (first/last edge window)
// - minSamples=5
// ------------------------------------------------------------

exports.getWellnessGrowthIndex = async (req, res) => {
  try {
    const windowDays = safeWindow(req, "windowDays", 14, 365, 30);
    const edgeDays = safeWindow(req, "edgeDays", 3, 30, 7);
    const minSamples = safeWindow(req, "minSamples", 1, 30, 3);

    const to = endOfDay(new Date());
    const from = startOfDay(daysAgo(windowDays));

    const edgeStartEnd = endOfDay(new Date(from.getTime() + (edgeDays * 24 * 60 * 60 * 1000)));
    const edgeEndStart = startOfDay(new Date(to.getTime() - (edgeDays * 24 * 60 * 60 * 1000)));

    // Build per-user first edge avg + last edge avg
    // Approach: two facets then merge in JS.
    const [edges] = await Journal.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          moodValue: { $type: "number" },
        },
      },
      {
        $facet: {
          first: [
            {
              $match: { createdAt: { $gte: from, $lte: edgeStartEnd } },
            },
            {
              $group: {
                _id: "$user",
                avg: { $avg: "$moodValue" },
                count: { $sum: 1 },
              },
            },
          ],
          last: [
            {
              $match: { createdAt: { $gte: edgeEndStart, $lte: to } },
            },
            {
              $group: {
                _id: "$user",
                avg: { $avg: "$moodValue" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const firstMap = new Map();
    for (const r of edges?.first || []) {
      firstMap.set(String(r._id), { avg: r.avg || 0, count: r.count || 0 });
    }
    const lastMap = new Map();
    for (const r of edges?.last || []) {
      lastMap.set(String(r._id), { avg: r.avg || 0, count: r.count || 0 });
    }

    const userRows = [];
    for (const [userId, f] of firstMap.entries()) {
      const l = lastMap.get(userId);
      if (!l) continue;
      if (f.count < minSamples || l.count < minSamples) continue;

      const delta = (l.avg || 0) - (f.avg || 0);
      userRows.push({
        userId,
        first: { avgMood: f.avg, samples: f.count, from, to: edgeStartEnd },
        last: { avgMood: l.avg, samples: l.count, from: edgeEndStart, to },
        delta,
      });
    }

    const improving = userRows.filter((u) => u.delta > 0).length;
    const avgDelta = userRows.length
      ? userRows.reduce((s, u) => s + u.delta, 0) / userRows.length
      : 0;

    // Emotional growth score: weighted index (0..100-ish)
    // This is a product metric; tune later.
    const growthScore = Math.max(
      0,
      Math.min(
        100,
        50 + avgDelta * 0.6 + computePercent(improving, userRows.length) * 0.5
      )
    );

    return res.json({
      window: { from, to, windowDays, edgeDays, minSamples },
      usersMeasured: userRows.length,
      avgDelta,
      improvementRate: computePercent(improving, userRows.length),
      growthScore,
      // Send only top/bottom movers for UI
      topImprovers: [...userRows].sort((a, b) => b.delta - a.delta).slice(0, 30),
      topDecliners: [...userRows].sort((a, b) => a.delta - b.delta).slice(0, 30),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Enterprise Add-on 4: Retreat Drop-off Funnel
// ------------------------------------------------------------
// Funnel stages by progress:
// - joined (any participant)
// - 25%+
// - 50%+
// - 75%+
// - 100% (completed)
//
// Can be per retreat or platform-wide.
//
// Query params:
// - retreatId (optional)
// ------------------------------------------------------------

exports.getRetreatDropoffFunnel = async (req, res) => {
  try {
    const retreatId = req.query.retreatId;

    const match = {};
    if (retreatId) {
      if (!isValidObjectId(retreatId)) return res.status(400).json({ message: "Invalid retreatId" });
      match._id = new mongoose.Types.ObjectId(retreatId);
    }

    const [funnel] = await Retreat.aggregate([
      { $match: match },
      {
        $project: {
          title: 1,
          participants: 1,
          participantsCount: 1,
          completionsCount: 1,
        },
      },
      { $unwind: { path: "$participants", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: retreatId ? "$_id" : null,
          title: { $first: "$title" },
          joined: { $sum: { $cond: [{ $ifNull: ["$participants.user", false] }, 1, 0] } },
          p25: { $sum: { $cond: [{ $gte: ["$participants.progress", 25] }, 1, 0] } },
          p50: { $sum: { $cond: [{ $gte: ["$participants.progress", 50] }, 1, 0] } },
          p75: { $sum: { $cond: [{ $gte: ["$participants.progress", 75] }, 1, 0] } },
          p100: { $sum: { $cond: [{ $gte: ["$participants.progress", 100] }, 1, 0] } },
        },
      },
      {
        $project: {
          _id: 0,
          retreatId: retreatId ? "$_id" : null,
          title: 1,
          stages: {
            joined: "$joined",
            "25": "$p25",
            "50": "$p50",
            "75": "$p75",
            "100": "$p100",
          },
        },
      },
    ]);

    return res.json(funnel || { retreatId: retreatId || null, stages: { joined: 0, "25": 0, "50": 0, "75": 0, "100": 0 } });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Enterprise Add-on 5: Early Warning Alert System
// ------------------------------------------------------------
// Triggers:
// - lowMoodPercentage > threshold (default 35%)
// - volatilityIndex spikes 2x baseline
//
// How we compute:
// - windowDays (default 7): current monitoring window
// - baselineDays (default 30): baseline window
// - lowMoodCutoff (default 30): moodValue < 30 counts as "low"
// - lowMoodThreshold (default 35): percent threshold
// - volatilitySpikeMultiplier (default 2.0): windowStd > baselineStd * multiplier
// ------------------------------------------------------------

function stddev(values) {
  if (!values.length) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

async function fetchMoodValuesInRange(from, to) {
  const docs = await Journal.find({
    createdAt: { $gte: from, $lte: to },
    moodValue: { $type: "number" },
  }).select("moodValue");

  return docs.map((d) => d.moodValue);
}

exports.getWellnessAlerts = async (req, res) => {
  try {
    const windowDays = safeWindow(req, "windowDays", 1, 30, 7);
    const baselineDays = safeWindow(req, "baselineDays", 7, 365, 30);

    const lowMoodCutoff = clampFloat(req.query.lowMoodCutoff, 0, 100, 30);
    const lowMoodThreshold = clampFloat(req.query.lowMoodThreshold, 0, 100, 35);
    const volatilitySpikeMultiplier = clampFloat(req.query.volatilitySpikeMultiplier, 1, 10, 2.0);

    const windowFrom = startOfDay(daysAgo(windowDays));
    const windowTo = endOfDay(new Date());

    const baselineFrom = startOfDay(daysAgo(baselineDays));
    const baselineTo = endOfDay(new Date());

    const [windowValues, baselineValues] = await Promise.all([
      fetchMoodValuesInRange(windowFrom, windowTo),
      fetchMoodValuesInRange(baselineFrom, baselineTo),
    ]);

    const windowStd = stddev(windowValues);
    const baselineStd = stddev(baselineValues);

    const windowLowCount = windowValues.filter((v) => v < lowMoodCutoff).length;
    const baselineLowCount = baselineValues.filter((v) => v < lowMoodCutoff).length;

    const windowLowPct = computePercent(windowLowCount, windowValues.length);
    const baselineLowPct = computePercent(baselineLowCount, baselineValues.length);

    const alerts = [];

    if (windowLowPct > lowMoodThreshold) {
      alerts.push({
        type: "LOW_MOOD_RATE",
        severity: windowLowPct > lowMoodThreshold + 15 ? "critical" : "high",
        message: `Low mood rate is ${windowLowPct.toFixed(1)}% (threshold ${lowMoodThreshold}%)`,
        metrics: { windowLowPct, lowMoodThreshold, lowMoodCutoff },
      });
    }

    if (baselineStd > 0 && windowStd > baselineStd * volatilitySpikeMultiplier) {
      alerts.push({
        type: "VOLATILITY_SPIKE",
        severity: "high",
        message: `Mood volatility spiked: ${windowStd.toFixed(2)} vs baseline ${baselineStd.toFixed(2)} (x${volatilitySpikeMultiplier})`,
        metrics: { windowStd, baselineStd, volatilitySpikeMultiplier },
      });
    }

    // Optional “warning” if sample size too small
    if (windowValues.length < 20) {
      alerts.push({
        type: "LOW_SAMPLE",
        severity: "medium",
        message: `Low mood sample size in monitoring window (${windowValues.length}). Analytics may be noisy.`,
        metrics: { samples: windowValues.length, windowDays },
      });
    }

    return res.json({
      config: { windowDays, baselineDays, lowMoodCutoff, lowMoodThreshold, volatilitySpikeMultiplier },
      window: {
        from: windowFrom,
        to: windowTo,
        samples: windowValues.length,
        stddev: windowStd,
        lowCount: windowLowCount,
        lowPct: windowLowPct,
      },
      baseline: {
        from: baselineFrom,
        to: baselineTo,
        samples: baselineValues.length,
        stddev: baselineStd,
        lowCount: baselineLowCount,
        lowPct: baselineLowPct,
      },
      alerts,
      status: alerts.some((a) => a.severity === "critical" || a.severity === "high") ? "attention" : "ok",
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Core Mood Dashboard (Distribution + Trend + Summary)
// ------------------------------------------------------------

exports.getMoodDashboard = async (req, res) => {
  try {
    const { from, to, days } = safeRange(req);

    const [data] = await Journal.aggregate([
      moodMatchStage(from, to),
      computeMoodSummaryFacet(),
    ]);

    const totals = data?.totals?.[0] || {
      count: 0,
      avgMood: 0,
      minMood: 0,
      maxMood: 0,
      avgWellnessScore: 0,
    };

    const distribution = normalizeDistribution(data?.distribution || []);
    const totalCount = totals.count || 0;

    const distributionWithPct = distribution.map((x) => ({
      ...x,
      percentage: computePercent(x.count, totalCount),
    }));

    return res.json({
      range: { from, to, days },
      totals,
      distribution: distributionWithPct,
      dailyTrend: data?.dailyTrend || [],
      weeklyTrend: data?.weeklyTrend || [],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Risk Metrics (volatility + low mood percentage) - mood-only
// ------------------------------------------------------------

exports.getMoodRiskMetrics = async (req, res) => {
  try {
    const { from, to } = safeRange(req);

    const lowMoodCutoff = clampFloat(req.query.lowMoodCutoff, 0, 100, 30);

    const values = await fetchMoodValuesInRange(from, to);
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const sd = stddev(values);
    const lowCount = values.filter((v) => v < lowMoodCutoff).length;

    return res.json({
      range: { from, to },
      samples: values.length,
      averageMood: avg,
      volatilityIndex: sd,
      lowMoodCutoff,
      lowMoodPercentage: computePercent(lowCount, values.length),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Retreat Analytics (advanced)
// - overall completion rate
// - top retreats by enrollments/completions
// - engagement by type/category/level
// ------------------------------------------------------------

exports.getRetreatAnalytics = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "false") === "true";
    const match = includeInactive ? {} : { isActive: true };

    const retreats = await Retreat.find(match).select("-participants");

    const totalRetreats = retreats.length;
    const totalEnrollments = retreats.reduce((s, r) => s + (r.participantsCount || 0), 0);
    const totalCompletions = retreats.reduce((s, r) => s + (r.completionsCount || 0), 0);
    const avgCompletionRate = totalEnrollments ? (totalCompletions / totalEnrollments) * 100 : 0;

    const byEnroll = [...retreats].sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0)).slice(0, 10);
    const byComplete = [...retreats].sort((a, b) => (b.completionsCount || 0) - (a.completionsCount || 0)).slice(0, 10);

    const breakdown = (key) => {
      const m = new Map();
      for (const r of retreats) {
        const k = r[key] || "unknown";
        const cur = m.get(k) || { key: k, retreats: 0, enrollments: 0, completions: 0 };
        cur.retreats += 1;
        cur.enrollments += r.participantsCount || 0;
        cur.completions += r.completionsCount || 0;
        m.set(k, cur);
      }
      return [...m.values()].sort((a, b) => b.enrollments - a.enrollments);
    };

    return res.json({
      totals: { totalRetreats, totalEnrollments, totalCompletions, avgCompletionRate },
      topByEnrollments: byEnroll,
      topByCompletions: byComplete,
      byType: breakdown("type"),
      byCategory: breakdown("category"),
      byLevel: breakdown("level"),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Retreat Admin CRUD (Create / Update / Feature / Order / Soft Delete)
// ------------------------------------------------------------

exports.listRetreatsAdmin = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive || "true") === "true";
    const match = includeInactive ? {} : { isActive: true };

    const retreats = await Retreat.find(match).sort({ order: 1, createdAt: -1 });
    return res.json(retreats);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.getRetreatAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const retreat = await Retreat.findById(id).populate("createdBy", "profile.fullName profile.avatar");
    if (!retreat) return res.status(404).json({ message: "Retreat not found" });

    return res.json(retreat);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.createRetreatAdmin = async (req, res) => {
  try {
    const {
      title,
      description,
      instructor,
      type,
      level,
      duration,
      thumbnail,
      videoUrl,
      audioUrl,
      tags,
      category,
      isActive = true,
      isFeatured = false,
      order = 0,
    } = req.body;

    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return res.status(400).json({ message: "Title is required" });
    }
    if (typeof duration !== "number" || duration <= 0) {
      return res.status(400).json({ message: "Duration must be a positive number (minutes)" });
    }

    const created = await Retreat.create({
      title: title.trim(),
      description,
      instructor,
      type,
      level,
      duration,
      thumbnail,
      videoUrl,
      audioUrl,
      tags,
      category,
      isActive: !!isActive,
      isFeatured: !!isFeatured,
      order: typeof order === "number" ? order : 0,
      createdBy: req.user?.id,
    });

    return res.status(201).json(created);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateRetreatAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const allowed = [
      "title",
      "description",
      "instructor",
      "type",
      "level",
      "duration",
      "thumbnail",
      "videoUrl",
      "audioUrl",
      "tags",
      "category",
      "isActive",
      "isFeatured",
      "order",
    ];

    const patch = {};
    for (const k of allowed) {
      if (k in req.body) patch[k] = req.body[k];
    }

    if ("title" in patch && (!patch.title || String(patch.title).trim().length < 2)) {
      return res.status(400).json({ message: "Title must be at least 2 chars" });
    }
    if ("duration" in patch && (typeof patch.duration !== "number" || patch.duration <= 0)) {
      return res.status(400).json({ message: "Duration must be a positive number (minutes)" });
    }

    if ("title" in patch) patch.title = String(patch.title).trim();

    const updated = await Retreat.findByIdAndUpdate(id, { $set: patch }, { new: true });
    if (!updated) return res.status(404).json({ message: "Retreat not found" });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.softDeleteRetreatAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const updated = await Retreat.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
    if (!updated) return res.status(404).json({ message: "Retreat not found" });

    return res.json({ message: "Retreat deactivated", retreat: updated });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.toggleFeaturedRetreatAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const retreat = await Retreat.findById(id);
    if (!retreat) return res.status(404).json({ message: "Retreat not found" });

    retreat.isFeatured = !retreat.isFeatured;
    await retreat.save();

    return res.json({ message: "Updated", retreat });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.reorderRetreatsAdmin = async (req, res) => {
  try {
    // body: [{ id, order }]
    const items = Array.isArray(req.body) ? req.body : [];
    if (!items.length) return res.status(400).json({ message: "Provide an array of {id, order}" });

    const bulk = [];
    for (const it of items) {
      if (!it?.id || !isValidObjectId(it.id)) continue;
      const order = typeof it.order === "number" ? it.order : 0;
      bulk.push({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(it.id) },
          update: { $set: { order } },
        },
      });
    }

    if (!bulk.length) return res.status(400).json({ message: "No valid items" });

    await Retreat.bulkWrite(bulk, { ordered: false });
    return res.json({ message: "Reordered" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// Extra: Recalculate Retreat Stats (optional)
// - averageCompletionRate
// - totalMinutesWatched
// This can be used when you want admin-triggered consistency.
// ------------------------------------------------------------

exports.recalculateRetreatStatsAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return res.status(400).json({ message: "Invalid id" });

    const retreat = await Retreat.findById(id);
    if (!retreat) return res.status(404).json({ message: "Retreat not found" });

    const participants = retreat.participants || [];
    const participantsCount = participants.length;

    const completionsCount = participants.filter((p) => p.completed).length;

    const totalMinutesWatched = participants.reduce((s, p) => s + (p.minutesWatched || 0), 0);

    const averageCompletionRate = participantsCount
      ? (completionsCount / participantsCount) * 100
      : 0;

    retreat.participantsCount = participantsCount; // keep consistent
    retreat.completionsCount = completionsCount;
    retreat.totalMinutesWatched = totalMinutesWatched;
    retreat.averageCompletionRate = averageCompletionRate;

    await retreat.save();

    return res.json({
      message: "Recalculated",
      retreat: {
        id: retreat._id,
        participantsCount,
        completionsCount,
        totalMinutesWatched,
        averageCompletionRate,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// ------------------------------------------------------------
// “All-in-one” Wellness Analytics Endpoint
// (Optional convenience API for the admin page)
// - Mood dashboard
// - Heatmap
// - Retreat analytics
// - Funnel (platform-wide)
// - Growth index summary
// - Alerts
// ------------------------------------------------------------

exports.getWellnessOverview = async (req, res) => {
  try {
    const range = safeRange(req);

    // Run a subset in parallel (safe and fast)
    const [
      moodDash,
      retreatAnalytics,
      funnel,
      growth,
      alerts,
    ] = await Promise.all([
      (async () => {
        const [data] = await Journal.aggregate([
          moodMatchStage(range.from, range.to),
          computeMoodSummaryFacet(),
        ]);

        const totals = data?.totals?.[0] || { count: 0, avgMood: 0, minMood: 0, maxMood: 0, avgWellnessScore: 0 };
        const distribution = normalizeDistribution(data?.distribution || []);
        const totalCount = totals.count || 0;

        return {
          range,
          totals,
          distribution: distribution.map((x) => ({ ...x, percentage: computePercent(x.count, totalCount) })),
          dailyTrend: data?.dailyTrend || [],
          weeklyTrend: data?.weeklyTrend || [],
        };
      })(),
      (async () => {
        const includeInactive = String(req.query.includeInactive || "false") === "true";
        const match = includeInactive ? {} : { isActive: true };
        const retreats = await Retreat.find(match).select("-participants");

        const totalRetreats = retreats.length;
        const totalEnrollments = retreats.reduce((s, r) => s + (r.participantsCount || 0), 0);
        const totalCompletions = retreats.reduce((s, r) => s + (r.completionsCount || 0), 0);
        const avgCompletionRate = totalEnrollments ? (totalCompletions / totalEnrollments) * 100 : 0;

        return { totalRetreats, totalEnrollments, totalCompletions, avgCompletionRate };
      })(),
      (async () => {
        const [f] = await Retreat.aggregate([
          { $match: { } },
          { $unwind: { path: "$participants", preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              joined: { $sum: { $cond: [{ $ifNull: ["$participants.user", false] }, 1, 0] } },
              p25: { $sum: { $cond: [{ $gte: ["$participants.progress", 25] }, 1, 0] } },
              p50: { $sum: { $cond: [{ $gte: ["$participants.progress", 50] }, 1, 0] } },
              p75: { $sum: { $cond: [{ $gte: ["$participants.progress", 75] }, 1, 0] } },
              p100: { $sum: { $cond: [{ $gte: ["$participants.progress", 100] }, 1, 0] } },
            },
          },
          { $project: { _id: 0, joined: 1, p25: 1, p50: 1, p75: 1, p100: 1 } },
        ]);
        return f || { joined: 0, p25: 0, p50: 0, p75: 0, p100: 0 };
      })(),
      (async () => {
        // lightweight growth summary: uses defaults windowDays=30 edgeDays=7
        const windowDays = 30;
        const edgeDays = 7;
        const minSamples = 3;

        const to = endOfDay(new Date());
        const from = startOfDay(daysAgo(windowDays));
        const edgeStartEnd = endOfDay(new Date(from.getTime() + (edgeDays * 24 * 60 * 60 * 1000)));
        const edgeEndStart = startOfDay(new Date(to.getTime() - (edgeDays * 24 * 60 * 60 * 1000)));

        const [edges] = await Journal.aggregate([
          { $match: { createdAt: { $gte: from, $lte: to }, moodValue: { $type: "number" } } },
          {
            $facet: {
              first: [
                { $match: { createdAt: { $gte: from, $lte: edgeStartEnd } } },
                { $group: { _id: "$user", avg: { $avg: "$moodValue" }, count: { $sum: 1 } } },
              ],
              last: [
                { $match: { createdAt: { $gte: edgeEndStart, $lte: to } } },
                { $group: { _id: "$user", avg: { $avg: "$moodValue" }, count: { $sum: 1 } } },
              ],
            },
          },
        ]);

        const firstMap = new Map((edges?.first || []).map((r) => [String(r._id), r]));
        const lastMap = new Map((edges?.last || []).map((r) => [String(r._id), r]));

        let usersMeasured = 0;
        let improving = 0;
        let sumDelta = 0;

        for (const [uid, f] of firstMap.entries()) {
          const l = lastMap.get(uid);
          if (!l) continue;
          if ((f.count || 0) < minSamples || (l.count || 0) < minSamples) continue;
          usersMeasured += 1;
          const delta = (l.avg || 0) - (f.avg || 0);
          sumDelta += delta;
          if (delta > 0) improving += 1;
        }

        const avgDelta = usersMeasured ? sumDelta / usersMeasured : 0;
        const improvementRate = computePercent(improving, usersMeasured);
        const growthScore = Math.max(0, Math.min(100, 50 + avgDelta * 0.6 + improvementRate * 0.5));

        return { usersMeasured, avgDelta, improvementRate, growthScore, windowDays, edgeDays };
      })(),
      (async () => {
        // Use the same logic as getWellnessAlerts but with defaults
        const windowDays = 7;
        const baselineDays = 30;
        const lowMoodCutoff = 30;
        const lowMoodThreshold = 35;
        const volatilitySpikeMultiplier = 2.0;

        const windowFrom = startOfDay(daysAgo(windowDays));
        const windowTo = endOfDay(new Date());
        const baselineFrom = startOfDay(daysAgo(baselineDays));
        const baselineTo = endOfDay(new Date());

        const [windowValues, baselineValues] = await Promise.all([
          fetchMoodValuesInRange(windowFrom, windowTo),
          fetchMoodValuesInRange(baselineFrom, baselineTo),
        ]);

        const windowStd = stddev(windowValues);
        const baselineStd = stddev(baselineValues);

        const windowLowCount = windowValues.filter((v) => v < lowMoodCutoff).length;
        const baselineLowCount = baselineValues.filter((v) => v < lowMoodCutoff).length;

        const windowLowPct = computePercent(windowLowCount, windowValues.length);
        const baselineLowPct = computePercent(baselineLowCount, baselineValues.length);

        const alertsArr = [];
        if (windowLowPct > lowMoodThreshold) {
          alertsArr.push({
            type: "LOW_MOOD_RATE",
            severity: windowLowPct > lowMoodThreshold + 15 ? "critical" : "high",
            message: `Low mood rate is ${windowLowPct.toFixed(1)}%`,
            metrics: { windowLowPct, lowMoodThreshold, lowMoodCutoff },
          });
        }
        if (baselineStd > 0 && windowStd > baselineStd * volatilitySpikeMultiplier) {
          alertsArr.push({
            type: "VOLATILITY_SPIKE",
            severity: "high",
            message: `Volatility spiked: ${windowStd.toFixed(2)} vs baseline ${baselineStd.toFixed(2)}`,
            metrics: { windowStd, baselineStd, volatilitySpikeMultiplier },
          });
        }

        return {
          window: { from: windowFrom, to: windowTo, samples: windowValues.length, stddev: windowStd, lowPct: windowLowPct },
          baseline: { from: baselineFrom, to: baselineTo, samples: baselineValues.length, stddev: baselineStd, lowPct: baselineLowPct },
          alerts: alertsArr,
          status: alertsArr.length ? "attention" : "ok",
        };
      })(),
    ]);

    return res.json({
      moodDashboard: moodDash,
      retreatAnalytics,
      retreatFunnel: funnel,
      growthIndex: growth,
      alerts,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   IMPORTANT SCALING NOTES (for William / SeptaGreen-level polish)
===============================================================
1) Add indexes:
   - Journal: { user: 1, createdAt: -1 }, { createdAt: -1 }, { moodValue: 1 }
   - Retreat: { isActive: 1 }, { order: 1 }, { "participants.user": 1 }, { "participants.completedAt": -1 }

2) Consider daily aggregation collection:
   - admin_wellness_daily:
     date, avgMood, distribution, lowMoodPct, volatility, etc.
   This makes the dashboard “instant” even at millions of journals.

3) Correlation endpoint can be expensive:
   - Use caps (already included)
   - Or convert to $lookup pipeline approach later
============================================================ */