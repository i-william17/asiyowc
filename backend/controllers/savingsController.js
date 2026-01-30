const mongoose = require("mongoose");
const SavingsPod = require("../models/SavingsPod");
const PaymentIntent = require("../models/PaymentIntent");
const { nanoid } = require("nanoid");
require("dotenv").config();

/* =====================================================
   CREATE POD
===================================================== */
exports.createPod = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            name,
            description,
            category,
            goal = {},
            contributionSettings = {},
            settings = {},
        } = req.body;

        if (!name || !goal.targetAmount) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const pod = await SavingsPod.create({
            name,
            description,
            creator: userId,
            category,

            goal: {
                targetAmount: goal.targetAmount,
                deadline: goal.deadline || null,
            },

            contributionSettings: {
                frequency: contributionSettings.frequency || "monthly",
                amount: contributionSettings.amount || 0,
            },

            settings: {
                privacy: settings.privacy || "invite-only",
                maxMembers: settings.maxMembers || 20,
            },

            members: [
                {
                    user: userId,
                    role: "admin",
                    isActive: true,
                },
            ],

            statistics: {
                activeMembers: 1,
            },
        });

        return res.status(201).json({ pod });

    } catch (err) {
        console.error("❌ createPod error:", err);
        return res.status(500).json({ message: err.message });
    }
};

/* =====================================================
   GET MY PODS
===================================================== */
/* =====================================================
   GET MY PODS (POPULATED)
===================================================== */
exports.getMyPods = async (req, res) => {
    const userId = req.user.id;

    const pods = await SavingsPod.find({
        $or: [
            { creator: userId },
            { "members.user": userId, "members.isActive": true }
        ]
    })
        .populate("creator", "profile.fullName profile.avatar.url")
        .populate("members.user", "profile.fullName profile.avatar.url")
        .sort({ createdAt: -1 })
        .lean();

    res.json({ pods });
};

/* =====================================================
   DISCOVER PODS (PUBLIC + PAGINATED)
===================================================== */
exports.discoverPods = async (req, res) => {
    const userId = req.user.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const pods = await SavingsPod.find({
        "settings.privacy": "public",
        status: "active",
        "members.user": { $nin: [userId] }
    })
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean();

    res.json({ pods, page });
};

/* =====================================================
   GET POD BY ID
===================================================== */
/* =====================================================
   GET POD BY ID (FULLY POPULATED)
===================================================== */
exports.getPodById = async (req, res) => {
    try {
        const { podId } = req.params;
        const userId = req.user.id;

        const pod = await SavingsPod.findById(podId)
            // Creator info
            .populate(
                "creator",
                "profile.fullName profile.avatar.url"
            )

            // Members info
            .populate(
                "members.user",
                "profile.fullName profile.avatar.url"
            )

            // Contributions info
            .populate(
                "contributions.member",
                "profile.fullName profile.avatar.url"
            )

            // Withdrawals info
            .populate(
                "withdrawals.member",
                "profile.fullName profile.avatar.url"
            )
            .lean();

        if (!pod) {
            return res.status(404).json({ message: "Pod not found" });
        }

        /* =====================================================
           MEMBERSHIP CHECK
        ===================================================== */
        const isMember = pod.members.some(
            (m) =>
                m.user &&
                m.user._id.toString() === userId &&
                m.isActive
        );

        /* =====================================================
           RETURN FULL PAYLOAD
        ===================================================== */
        res.json({
            pod: {
                _id: pod._id,
                name: pod.name,
                description: pod.description,
                category: pod.category,
                status: pod.status,

                creator: pod.creator,

                members: pod.members,

                goal: pod.goal,

                contributionSettings: pod.contributionSettings,

                currentBalance: pod.currentBalance,

                contributions: pod.contributions,
                withdrawals: pod.withdrawals,

                settings: pod.settings,
                statistics: pod.statistics,

                createdAt: pod.createdAt,
                updatedAt: pod.updatedAt,
            },
            isMember,
        });
    } catch (err) {
        console.error("❌ getPodById error:", err);
        res.status(500).json({ message: "Failed to fetch pod details" });
    }
};

/* =====================================================
   JOIN POD
===================================================== */
exports.joinPod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await SavingsPod.findById(podId);
        if (!pod) throw new Error("Pod not found");

        pod.addMember(userId);
        await pod.save();

        res.json({ message: "Joined pod successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/* =====================================================
   LEAVE POD
===================================================== */
exports.leavePod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await SavingsPod.findById(podId);
        if (!pod) throw new Error("Pod not found");

        pod.removeMember(userId);
        await pod.save();

        res.json({ message: "Left pod successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/* =====================================================
   DELETE POD (CREATOR ONLY)
===================================================== */
exports.deletePod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;

        const pod = await SavingsPod.findById(podId);
        if (!pod) throw new Error("Pod not found");

        if (pod.creator.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await pod.deleteOne();
        res.json({ message: "Pod deleted successfully" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/* =====================================================
   CONTRIBUTE TO POD
===================================================== */

// ⚠️ NOTE:
// This endpoint is NOT used for M-Pesa payments.
// M-Pesa contributions are applied ONLY via payment callbacks.
exports.contributeToPod = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;
        const { amount, method } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        const pod = await SavingsPod.findById(podId);
        if (!pod) throw new Error("Pod not found");

        if (pod.status !== "active") {
            throw new Error("Pod is not active");
        }

        if (pod.goal.deadline && new Date() > pod.goal.deadline) {
            pod.status = "completed";
            await pod.save();
            throw new Error("Pod deadline reached");
        }

        pod.addContribution(userId, amount, method);
        await pod.save();

        res.json({ message: "Contribution successful" });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

/* =====================================================
   GET MY CONTRIBUTIONS (STATEMENT)
===================================================== */
exports.getMyContributions = async (req, res) => {
    const userId = req.user.id;

    const pods = await SavingsPod.find({
        "contributions.member": userId
    }).lean();

    const contributions = pods.flatMap(pod =>
        pod.contributions
            .filter(c => c.member.toString() === userId)
            .map(c => ({
                podId: pod._id,
                podName: pod.name,
                amount: c.amount,
                date: c.date,
                status: c.status
            }))
    );

    res.json({ contributions });
};

/* =====================================================
   REQUEST WITHDRAWAL
===================================================== */
exports.requestWithdrawal = async (req, res) => {
    try {
        const userId = req.user.id;
        const { podId } = req.params;
        const { amount, purpose } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid withdrawal amount" });
        }

        const pod = await SavingsPod.findById(podId);
        if (!pod) {
            return res.status(404).json({ message: "Pod not found" });
        }

        if (pod.status !== "active") {
            return res.status(400).json({ message: "Pod is not active" });
        }

        if (!pod.settings.allowWithdrawals) {
            return res.status(403).json({ message: "Withdrawals are disabled for this pod" });
        }

        // 🔒 Validate membership
        const member = pod.members.find(
            m => m.user.toString() === userId && m.isActive
        );

        if (!member) {
            return res.status(403).json({ message: "You are not a member of this pod" });
        }

        // 🔒 Check user balance
        const userBalance = pod.getMemberBalance(userId);
        if (amount > userBalance) {
            return res.status(400).json({
                message: "Withdrawal amount exceeds your contribution balance"
            });
        }

        // 🔒 Check pod balance
        if (amount > pod.currentBalance) {
            return res.status(400).json({
                message: "Insufficient pod balance"
            });
        }

        // ✅ Immediate withdrawal
        pod.withdrawals.push({
            member: userId,
            amount,
            purpose,
            status: "paid",          // immediate
            date: new Date()
        });

        pod.currentBalance -= amount;
        pod.statistics.totalWithdrawals += amount;

        await pod.save();

        res.json({
            message: "Withdrawal successful",
            balance: pod.getMemberBalance(userId)
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getPodWithdrawals = async (req, res) => {
    const userId = req.user.id;
    const { podId } = req.params;

    const pod = await SavingsPod.findById(podId).lean();
    if (!pod) {
        return res.status(404).json({ message: "Pod not found" });
    }

    const member = pod.members.find(
        m => m.user.toString() === userId && m.isActive
    );

    if (!member) {
        return res.status(403).json({ message: "Not a member of this pod" });
    }

    const withdrawals = pod.withdrawals.filter(
        w => w.member.toString() === userId
    );

    res.json({ withdrawals });
};

/* =====================================================
   CONTRIBUTIONS CHECKOUT SESSION
    ===================================================== */

exports.createContributionCheckout = async (req, res) => {
    const userId = req.user.id;
    const { podId } = req.params;

    const pod = await SavingsPod.findById(podId);
    if (!pod) return res.status(404).json({ message: "Pod not found" });

    const member = pod.members.find(
        (m) => m.user.toString() === userId && m.isActive
    );
    if (!member) return res.status(403).json({ message: "Not a member" });

    const intentId = `pi_${nanoid(18)}`;

    console.log("Creating payment intent:", intentId);
    console.log("Pod ID:", podId);
    console.log("User ID:", userId);
    console.log("Mpesa Shortcode:", process.env.MPESA_PAYBILL_SHORTCODE);
    console.log("Base URL:", process.env.API_PUBLIC_BASE_URL);

    const intent = await PaymentIntent.create({
        intentId,
        purpose: "SAVINGS_CONTRIBUTION",
        podId,
        userId,
        paybillShortCode: process.env.MPESA_PAYBILL_SHORTCODE,
        accountReference: "SAVINGS",
        status: "CREATED",
    });

    const redirectUrl = `${process.env.API_PUBLIC_BASE_URL}/api/payments/checkout/${intent.intentId}`;

    res.json({ intentId: intent.intentId, redirectUrl });
};


