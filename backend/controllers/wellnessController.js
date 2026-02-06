const Journal = require("../models/Journal");
const Retreat = require("../models/Retreat");



/* =====================================================
   HELPERS
===================================================== */

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};



/* =====================================================
   ================= JOURNAL ===========================
   Atomic by default (single document updates)
===================================================== */


/* ---------------------------------
   Get today's journal (auto create)
--------------------------------- */
exports.getTodayJournal = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = startOfDay();

    let journal = await Journal.findOne({ user: userId, date: today })
      .populate("user", "profile.fullName profile.avatar");

    if (!journal) {
      journal = await Journal.create({
        user: userId,
        date: today,
      });

      journal = await journal.populate(
        "user",
        "profile.fullName profile.avatar"
      );
    }

    res.json(journal);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* =====================================================
   Save / update journal (DAILY + EXACT MOOD VALUE)
   Atomic + Upsert safe
===================================================== */
exports.saveJournal = async (req, res) => {
  try {
    const userId = req.user.id;

    // start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const {
      text = "",
      gratitude = [],
      tags = [],
      mood,
      moodValue,
    } = req.body;

    /* ---------------------------------------
       Validate moodValue
    --------------------------------------- */
    const safeMoodValue =
      typeof moodValue === "number"
        ? Math.max(0, Math.min(100, moodValue))
        : 50;

    /* ---------------------------------------
       Normalize mood object
    --------------------------------------- */
    const safeMood = mood
      ? {
        label: mood.label,
        score: mood.score,
      }
      : undefined;

    /* ---------------------------------------
       Atomic upsert
    --------------------------------------- */
    const journal = await Journal.findOneAndUpdate(
      {
        user: userId,
        date: today,
      },
      {
        $set: {
          text,
          gratitude,
          tags,
          mood: safeMood,
          moodValue: safeMoodValue,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    ).populate("user", "profile.fullName profile.avatar");

    return res.json(journal);
  } catch (err) {
    console.error("Save journal error:", err);
    return res.status(500).json({
      message: "Failed to save journal",
      error: err.message,
    });
  }
};


/* ---------------------------------
   Journal history
--------------------------------- */
exports.getJournalHistory = async (req, res) => {
  try {
    const journals = await Journal.find({ user: req.user.id })
      .sort({ date: -1 })
      .limit(30)
      .populate("user", "profile.fullName profile.avatar");

    res.json(journals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





/* =====================================================
   ================= RETREAT ===========================
   ACID SAFE using atomic Mongo operators only
===================================================== */


/* ---------------------------------
   List retreats
--------------------------------- */
exports.getRetreats = async (req, res) => {
  try {
    const retreats = await Retreat.find({ isActive: true })
      .select("-participants"); // lighter response

    res.json(retreats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* ---------------------------------
   Get retreat by id (with populated users)
--------------------------------- */
exports.getRetreatById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const retreat = await Retreat.findById(id)
      .populate("participants.user", "profile.fullName profile.avatar");

    if (!retreat) {
      return res.status(404).json({ message: "Retreat not found" });
    }

    const myProgress =
      retreat.participants.find(
        (p) => p.user._id.toString() === userId
      ) || { progress: 0, completed: false };

    res.json({
      ...retreat.toObject(),
      myProgress,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



/* ---------------------------------
   Join retreat
   ACID SAFE (push + inc atomic)
--------------------------------- */
exports.joinRetreat = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await Retreat.updateOne(
      { _id: id },
      {
        $addToSet: {
          participants: { user: userId },
        },
        $inc: { participantsCount: 1 },
      }
    );

    // if already exists, nothing modified
    if (result.modifiedCount === 0) {
      return res.status(400).json({
        message: "Already enrolled in this retreat",
      });
    }

    res.json({ message: "Joined successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ---------------------------------
   Update progress
   AUTO COMPLETE at 100
   FULLY ATOMIC
--------------------------------- */
exports.updateRetreatProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { progress = 0, minutesWatched = 0 } = req.body;

    const result = await Retreat.updateOne(
      { _id: id, "participants.user": userId },
      {
        $set: {
          "participants.$.progress": progress,
          "participants.$.lastWatchedAt": new Date(),
        },
        $inc: {
          "participants.$.minutesWatched": minutesWatched,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        message: "User not enrolled in this retreat",
      });
    }

    if (progress >= 100) {
      await Retreat.updateOne(
        {
          _id: id,
          "participants.user": userId,
          "participants.completed": false,
        },
        {
          $set: {
            "participants.$.completed": true,
            "participants.$.completedAt": new Date(),
          },
          $inc: { completionsCount: 1 },
        }
      );
    }

    res.json({
      message: "Progress updated",
      progress,
      completed: progress >= 100,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ---------------------------------
   Get my retreat progress list
--------------------------------- */
exports.getMyRetreatProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    const retreats = await Retreat.find({
      "participants.user": userId,
    }).populate("participants.user", "profile.fullName profile.avatar");

    const result = retreats.map((r) => {
      const p = r.participants.find(
        (x) => x.user._id.toString() === userId
      );

      return {
        id: r._id,
        title: r.title,
        progress: p.progress,
        completed: p.completed,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
