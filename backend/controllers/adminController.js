// controllers/adminController.js

const User = require("../models/User");
const Post = require("../models/Post");
const Program = require("../models/Program");
const SavingsPod = require("../models/SavingsPod");
const Group = require("../models/Group");

const { deleteFromCloudinary } = require("../middleware/upload");

/* ============================================================
   HELPERS
============================================================ */
const paginate = async (model, query, page = 1, limit = 20, populate = "") => {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        model.find(query)
            .populate(populate)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),

        model.countDocuments(query)
    ]);

    return {
        data,
        total,
        hasMore: skip + data.length < total
    };
};


/* ============================================================
   GROUPS
============================================================ */

/* ------------------------------------------------------------
   GET ALL GROUPS (PAGINATED)
   GET /admin/groups?page=1&limit=20
------------------------------------------------------------ */
exports.getAllGroupsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;

        const query = search
            ? { name: { $regex: search, $options: "i" } }
            : {};

        const result = await paginate(
            Group,
            query,
            Number(page),
            Number(limit),
            null
        );

        await Group.populate(result.data, [
            { path: "createdBy", select: "profile.fullName profile.avatar" },
            { path: "admins", select: "profile.fullName profile.avatar" },
            { path: "members.user", select: "profile.fullName profile.avatar" },
            { path: "chat" }
        ]);

        console.log("👥 Admin fetched groups:", result.data.length);

        res.json({ success: true, data: result });

    } catch (err) {
        console.error("❌ getAllGroupsAdmin:", err);
        res.status(500).json({ message: "Failed to fetch groups" });
    }
};

/* ------------------------------------------------------------
   GET GROUP BY ID
------------------------------------------------------------ */
exports.getGroupByIdAdmin = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        if (!group)
            return res.status(404).json({ message: "Group not found" });

        await Group.populate(group, [
            { path: "createdBy", select: "profile.fullName profile.avatar" },
            { path: "admins", select: "profile.fullName profile.avatar" },
            { path: "members.user", select: "profile.fullName profile.avatar" },
            { path: "chat" }
        ]);

        res.json({ success: true, data: group });

    } catch (err) {
        res.status(500).json({ message: "Failed to fetch group" });
    }
};


/* ------------------------------------------------------------
   DELETE GROUP
------------------------------------------------------------ */
exports.deleteGroupAdmin = async (req, res) => {
    try {
        await Group.findByIdAndDelete(req.params.id);

        console.log("🗑️ Group deleted:", req.params.id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};


/* ------------------------------------------------------------
   TOGGLE GROUP ACTIVE
------------------------------------------------------------ */
exports.toggleGroupStatusAdmin = async (req, res) => {
    try {
        const group = await Group.findById(req.params.id);

        group.isActive = !group.isActive;
        await group.save();

        res.json({ success: true, data: group });
    } catch (err) {
        res.status(500).json({ message: "Status update failed" });
    }
};



/* ============================================================
   PROGRAMS
============================================================ */

/* ------------------------------------------------------------
   GET ALL PROGRAMS (PAGINATED)
------------------------------------------------------------ */
exports.getAllProgramsAdmin = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        const result = await paginate(
            Program,
            {},
            Number(page),
            Number(limit),
            "participants"
        );

        console.log("🎓 Admin fetched programs:", result.data.length);

        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch programs" });
    }
};


/* ------------------------------------------------------------
   GET PROGRAM BY ID
------------------------------------------------------------ */
exports.getProgramByIdAdmin = async (req, res) => {
    try {
        const program = await Program.findById(req.params.id);

        if (!program)
            return res.status(404).json({ message: "Program not found" });

        await Program.populate(program, [
            {
                path: "organizer",
                select: "profile.fullName profile.avatar email"
            },
            {
                path: "coOrganizers.user",
                select: "profile.fullName profile.avatar email"
            },
            {
                path: "participants.user",
                select: "profile.fullName profile.avatar email"
            }
        ]);

        res.json({ success: true, data: program });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch program" });
    }
};

/* ------------------------------------------------------------
   DELETE PROGRAM
------------------------------------------------------------ */
exports.deleteProgramAdmin = async (req, res) => {
    try {
        await Program.findByIdAndDelete(req.params.id);

        console.log("🗑️ Program deleted:", req.params.id);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};


/* ------------------------------------------------------------
   TOGGLE PUBLISH
------------------------------------------------------------ */
exports.toggleProgramPublishAdmin = async (req, res) => {
    try {
        const program = await Program.findById(req.params.id);

        program.isPublished = !program.isPublished;
        await program.save();

        res.json({ success: true, data: program });
    } catch (err) {
        res.status(500).json({ message: "Publish update failed" });
    }
};


/* ------------------------------------------------------------
   GET PROGRAM PARTICIPANTS
------------------------------------------------------------ */
exports.getProgramParticipantsAdmin = async (req, res) => {
    try {
        const program = await Program.findById(req.params.id)
            .populate({
                path: "participants.user",
                select: "profile.fullName profile.avatar email"
            });

        res.json({
            success: true,
            data: program.participants.map(p => p.user)
        });

    } catch (err) {
        res.status(500).json({ message: "Failed to fetch participants" });
    }
};


/* =====================================================
   ADMIN → GET ALL USERS (LIST VIEW)
   lightweight + paginated
   returns only fields needed for table
===================================================== */
exports.getAllUsersAdmin = async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const page = Math.max(parseInt(req.query.page) || 1, 1);

        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find()
                .select(`
          profile.fullName
          profile.avatar
          email
          isAdmin
          isActive
          createdAt
        `)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            User.countDocuments()
        ]);

        res.json({
            success: true,
            data: {
                users,
                page,
                total,
                hasMore: skip + limit < total,
            },
        });

    } catch (error) {
        console.error("❌ getAllUsersAdmin:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



/* =====================================================
   ADMIN → GET USER BY ID (FULL DETAILS VIEW)
===================================================== */
exports.getUserByIdAdmin = async (req, res) => {
    try {
        const userId = req.params.id;

        const [
            user,
            postsCount,
            enrolledProgramsCount,
            completedProgramsCount
        ] = await Promise.all([
            User.findById(userId)
                .select("-password -twoFactorAuth.secret")
                .lean(),

            Post.countDocuments({ author: userId, isRemoved: false }),

            Program.countDocuments({ "participants.user": userId }),

            Program.countDocuments({
                participants: {
                    $elemMatch: { user: userId, progress: 100 }
                }
            })
        ]);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        res.json({
            success: true,
            data: {
                user,
                stats: {
                    postsCount,
                    enrolledProgramsCount,
                    completedProgramsCount,
                },
            },
        });

    } catch (error) {
        console.error("❌ getUserByIdAdmin:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};



/* =====================================================
   ADMIN → DELETE USER
   cleans:
   - avatar
   - cover photo
   - posts
   - soft or hard delete (choose strategy)
===================================================== */
exports.deleteUserAdmin = async (req, res) => {
    try {
        const userId = req.params.id;

        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                message: "Admins cannot delete themselves",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        /* -------------------------
           Delete Cloudinary media
        ------------------------- */
        if (user.profile?.avatar?.publicId) {
            await deleteFromCloudinary(user.profile.avatar.publicId);
        }

        if (user.profile?.coverPhoto?.publicId) {
            await deleteFromCloudinary(user.profile.coverPhoto.publicId);
        }

        /* -------------------------
           Remove posts (optional)
        ------------------------- */
        await Post.deleteMany({ author: userId });

        /* -------------------------
           HARD DELETE
           (or switch to soft delete)
        ------------------------- */
        await User.findByIdAndDelete(userId);

        res.json({
            success: true,
            message: "User deleted successfully",
        });

    } catch (error) {
        console.error("❌ deleteUserAdmin:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/* =====================================================
   DASHBOARD METRICS
   GET /admin/dashboard/metrics
===================================================== */
exports.getDashboardMetrics = async (req, res) => {
    try {
        /* ===============================
           TOTALS
        =============================== */

        const [usersCount, groupsCount] = await Promise.all([
            User.countDocuments(),
            Group.countDocuments(),
        ]);

        /* ===============================
           REVENUE (SavingsPod contributions)
        =============================== */

        const revenueAgg = await SavingsPod.aggregate([
            { $unwind: "$contributions" },
            { $match: { "contributions.status": "completed" } },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$contributions.amount" },
                },
            },
        ]);

        const totalRevenue = revenueAgg[0]?.total || 0;

        /* ===============================
           REVENUE OVER TIME (line chart)
        =============================== */

        const revenueChartAgg = await SavingsPod.aggregate([
            { $unwind: "$contributions" },
            { $match: { "contributions.status": "completed" } },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$contributions.date",
                        },
                    },
                    total: { $sum: "$contributions.amount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const labels = revenueChartAgg.map((d) => d._id);
        const revenueSeries = revenueChartAgg.map((d) => d.total);

        /* ===============================
           USERS OVER TIME
        =============================== */

        const usersAgg = await User.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const usersSeries = usersAgg.map((d) => d.count);

        /* ===============================
           GROUPS OVER TIME
        =============================== */

        const groupsAgg = await Group.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const groupsSeries = groupsAgg.map((d) => d.count);

        /* ===============================
           PROGRAM METRICS
           Calculate participants and completion rate
           Based on your schema - using participants array with user objects
        =============================== */

        // Aggregate participant counts and completed counts from programs
        const programStats = await Program.aggregate([
            {
                $project: {
                    // Count total participants (size of participants array)
                    participants: { $size: { $ifNull: ["$participants", []] } },
                    // Count completed participants (those with progress: 100)
                    completed: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$participants", []] },
                                as: "participant",
                                cond: { $eq: ["$$participant.progress", 100] }
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalParticipants: { $sum: "$participants" },
                    totalCompleted: { $sum: "$completed" }
                }
            }
        ]);

        // Debug log
        console.log("📊 PROGRAM STATS:", programStats);

        const totalParticipants = programStats[0]?.totalParticipants || 0;
        const totalCompleted = programStats[0]?.totalCompleted || 0;

        // Calculate completion rate: (completed participants / total participants) * 100
        const completionRate = totalParticipants > 0
            ? Math.round((totalCompleted / totalParticipants) * 100)
            : 0;

        console.log("📈 Participants:", totalParticipants, "Completed:", totalCompleted, "Rate:", completionRate + "%");

        /* ===============================
           RESPONSE
        =============================== */

        return res.json({
            success: true,
            data: {
                totals: {
                    users: usersCount,
                    groups: groupsCount,
                    revenue: { total: totalRevenue },
                    programs: {
                        participants: totalParticipants,
                        completionRate,
                    },
                },
                charts: {
                    labels,
                    users: usersSeries,
                    groups: groupsSeries,
                    revenue: revenueSeries,
                },
            },
        });
    } catch (err) {
        console.error("❌ getDashboardMetrics error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to load dashboard metrics"
        });
    }
};