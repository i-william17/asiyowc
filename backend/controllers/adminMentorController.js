const Mentor = require("../models/Mentor");
const User = require("../models/User");

/* =====================================================
   HELPERS
===================================================== */

const ok = (res, data = null, message = null, extra = {}) =>
    res.json({ success: true, message, data, ...extra });

const created = (res, data = null, message = null) =>
    res.status(201).json({ success: true, message, data });

const bad = (res, message = "Bad request") =>
    res.status(400).json({ success: false, message });

const notFound = (res, message = "Not found") =>
    res.status(404).json({ success: false, message });

/* =====================================================
   1️⃣ LIST MENTORS (Admin View)
   GET /api/admin/mentors
   Query:
   - status: approved | pending | rejected
   - verified: true | false
   - search
   - page
   - limit
===================================================== */
exports.listMentors = async (req, res) => {
    try {
        const {
            verificationStatus,
            verified,
            search,
            page = 1,
            limit = 20,
        } = req.query;

        const query = {};

        if (verificationStatus) {
            query.verificationStatus = verificationStatus;
        }
        if (verified === "true") query.verified = true;
        if (verified === "false") query.verified = false;

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { specialty: { $regex: search, $options: "i" } },
                { title: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;

        const mentors = await Mentor.find(query)
            .populate({
                path: "user",
                populate: {
                    path: "profile", // if profile is embedded in User model
                },
            })
            .populate("stories.likes")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Mentor.countDocuments(query);

        return res.json({
            success: true,
            data: mentors,
            page: Number(page),
            pages: Math.ceil(total / limit),
            total,
            limit: Number(limit),
        });

    } catch (err) {
        console.error("List Mentors Error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mentors",
        });
    }
};

/* =====================================================
   2️⃣ GET SINGLE MENTOR (Full Admin View)
   GET /api/admin/mentors/:id
===================================================== */
exports.getMentorById = async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id)
            .populate({
                path: "user",
                populate: {
                    path: "profile",
                },
            })
            .populate("stories.likes")
            .populate("verificationDocs"); // not necessary but safe

        if (!mentor) {
            return res.status(404).json({
                success: false,
                message: "Mentor not found",
            });
        }

        return res.json({
            success: true,
            data: mentor,
        });

    } catch (err) {
        console.error("Get Mentor Error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to fetch mentor",
        });
    }
};

/* =====================================================
   3️⃣ APPROVE MENTOR
   PATCH /api/admin/mentors/:id/approve
===================================================== */
exports.approveMentor = async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id);
        if (!mentor) return notFound(res, "Mentor not found");

        mentor.verified = true;
        mentor.verificationStatus = "approved";
        mentor.rejectionReason = undefined;

        await mentor.save();

        ok(res, mentor, "Mentor approved successfully");
    } catch (err) {
        bad(res, "Failed to approve mentor");
    }
};

/* =====================================================
   4️⃣ REJECT MENTOR
   PATCH /api/admin/mentors/:id/reject
===================================================== */
exports.rejectMentor = async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason)
            return bad(res, "Rejection reason is required");

        const mentor = await Mentor.findById(req.params.id);
        if (!mentor) return notFound(res, "Mentor not found");

        mentor.verified = false;
        mentor.verificationStatus = "rejected";
        mentor.rejectionReason = reason;

        await mentor.save();

        ok(res, mentor, "Mentor rejected");
    } catch (err) {
        bad(res, "Failed to reject mentor");
    }
};

/* =====================================================
   5️⃣ ADMIN RATE MENTOR
   PATCH /api/admin/mentors/:id/rate
===================================================== */
exports.rateMentor = async (req, res) => {
    try {
        const { rating } = req.body;

        if (!rating || rating < 0 || rating > 5)
            return bad(res, "Rating must be between 0 and 5");

        const mentor = await Mentor.findById(req.params.id);
        if (!mentor) return notFound(res, "Mentor not found");

        mentor.rating = rating;

        await mentor.save();

        ok(res, mentor, "Mentor rating updated");
    } catch (err) {
        bad(res, "Failed to rate mentor");
    }
};

/* =====================================================
   6️⃣ CREATE MENTOR (Admin)
===================================================== */
exports.createMentor = async (req, res) => {
    try {
        const mentor = await Mentor.create(req.body);
        created(res, mentor, "Mentor created successfully");
    } catch (err) {
        bad(res, err.message);
    }
};

/* =====================================================
   7️⃣ UPDATE MENTOR
===================================================== */
exports.updateMentor = async (req, res) => {
    try {
        const mentor = await Mentor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!mentor) return notFound(res, "Mentor not found");

        ok(res, mentor, "Mentor updated");
    } catch (err) {
        bad(res, "Failed to update mentor");
    }
};

/* =====================================================
   8️⃣ DELETE MENTOR
===================================================== */
exports.deleteMentor = async (req, res) => {
    try {
        const mentor = await Mentor.findByIdAndDelete(req.params.id);
        if (!mentor) return notFound(res, "Mentor not found");

        ok(res, null, "Mentor deleted");
    } catch (err) {
        bad(res, "Failed to delete mentor");
    }
};

/* =====================================================
   9️⃣ SUSPEND / ACTIVATE
===================================================== */
exports.toggleMentorStatus = async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.id);
        if (!mentor) return notFound(res, "Mentor not found");

        mentor.isActive = !mentor.isActive;

        await mentor.save();

        ok(res, mentor, "Mentor status updated");
    } catch (err) {
        bad(res, "Failed to update mentor status");
    }
};
