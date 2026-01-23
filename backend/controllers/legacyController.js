const Tribute = require("../models/Tribute");
const User = require("../models/User");

/* =====================================================
   GET TRIBUTES (WITH COMMENTS POPULATED)
===================================================== */
exports.getTributes = async (req, res) => {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const [tributes, total] = await Promise.all([
            Tribute.find()
                .populate(
                    "user",
                    "profile.fullName profile.avatar profile.location"
                )
                .populate("comments.user", "profile.fullName profile.avatar")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            Tribute.countDocuments(),
        ]);

        res.json({
            data: tributes,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch tributes" });
    }
};

/* =====================================================
   GET SINGLE TRIBUTE (WITH COMMENTS)
===================================================== */
exports.getTributeById = async (req, res) => {
    try {
        const tribute = await Tribute.findById(req.params.id)
            .populate(
                "user",
                "profile.fullName profile.avatar profile.location"
            )
            .populate(
                "comments.user",
                "profile.fullName profile.avatar"
            )
            .lean();

        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        res.json(tribute);
    } catch (err) {
        console.error(err);
        if (err.name === "CastError") {
            return res.status(400).json({ message: "Invalid tribute ID" });
        }
        res.status(500).json({ message: "Failed to fetch tribute" });
    }
};

/* =====================================================
   CREATE TRIBUTE (MAX 3 PER USER)
===================================================== */
exports.createTribute = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        const count = await Tribute.countDocuments({ user: req.user.id });
        if (count >= 3) {
            return res.status(403).json({
                message: "You can only submit a maximum of 3 tributes",
            });
        }

        const tribute = await Tribute.create({
            message: message.trim(),
            user: req.user.id,
        });

        const populated = await tribute.populate(
            "user",
            "profile.fullName profile.avatar profile.location"
        );

        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create tribute" });
    }
};

/* =====================================================
   TOGGLE LIKE TRIBUTE
===================================================== */
exports.toggleLikeTribute = async (req, res) => {
    try {
        const tribute = await Tribute.findById(req.params.id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        const userId = String(req.user.id);
        const liked = tribute.likedBy.map(String).includes(userId);

        if (liked) {
            tribute.likedBy = tribute.likedBy.filter(
                (id) => String(id) !== userId
            );
            tribute.likes = Math.max(tribute.likes - 1, 0);
        } else {
            tribute.likedBy.push(req.user.id);
            tribute.likes += 1;
        }

        await tribute.save();

        res.json({
            _id: tribute._id,
            likes: tribute.likes,
            likedBy: tribute.likedBy,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to toggle like" });
    }
};

/* =====================================================
   UPDATE TRIBUTE (OWNER ONLY)
===================================================== */
exports.updateTribute = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }

        const tribute = await Tribute.findById(req.params.id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        if (String(tribute.user) !== String(req.user.id)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        tribute.message = message.trim();
        await tribute.save();

        const populated = await tribute.populate(
            "user",
            "profile.fullName profile.avatar profile.location"
        );

        res.json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update tribute" });
    }
};

/* =====================================================
   DELETE TRIBUTE (OWNER ONLY)
===================================================== */
exports.deleteTribute = async (req, res) => {
    try {
        const tribute = await Tribute.findById(req.params.id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        if (String(tribute.user) !== String(req.user.id)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await tribute.deleteOne();
        res.json({ message: "Tribute deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete tribute" });
    }
};

/* =====================================================
   ADD COMMENT
===================================================== */
exports.addComment = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ message: "Comment is required" });
        }

        const tribute = await Tribute.findById(req.params.id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        tribute.comments.push({
            user: req.user.id,
            message: message.trim(),
        });

        await tribute.save();

        const populated = await Tribute.findById(tribute._id)
            .populate("comments.user", "profile.fullName profile.avatar")
            .lean();

        res
            .status(201)
            .json(populated.comments[populated.comments.length - 1]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add comment" });
    }
};

/* =====================================================
   TOGGLE LIKE COMMENT
===================================================== */
exports.toggleLikeComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;
        const userId = String(req.user.id);

        const tribute = await Tribute.findById(id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        const comment = tribute.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        const liked = comment.likedBy.map(String).includes(userId);

        if (liked) {
            comment.likedBy = comment.likedBy.filter(
                (uid) => String(uid) !== userId
            );
            comment.likes = Math.max(comment.likes - 1, 0);
        } else {
            comment.likedBy.push(req.user.id);
            comment.likes += 1;
        }

        await tribute.save();

        res.json({
            tributeId: tribute._id,
            commentId: comment._id,
            likes: comment.likes,
            liked: !liked,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to toggle comment like" });
    }
};

/* =====================================================
   DELETE COMMENT (OWNER ONLY)
===================================================== */
exports.deleteComment = async (req, res) => {
    try {
        const { id, commentId } = req.params;

        const tribute = await Tribute.findById(id);
        if (!tribute) {
            return res.status(404).json({ message: "Tribute not found" });
        }

        const comment = tribute.comments.id(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (String(comment.user) !== String(req.user.id)) {
            return res.status(403).json({ message: "Not authorized" });
        }

        comment.deleteOne();
        await tribute.save();

        res.json({ message: "Comment deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete comment" });
    }
};
