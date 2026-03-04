const Support = require("../models/Support");
const Feedback = require("../models/Feedback");

/* ==========================================================
   CREATE SUPPORT TICKET
   POST /api/support
========================================================== */
exports.createSupportTicket = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      category,
      subject,
      message,
      priority,
      deviceInfo,
      content
    } = req.body;

    /* ======================================================
       BASIC VALIDATION
    ====================================================== */

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required",
      });
    }

    /* ======================================================
       MEDIA ATTACHMENT (FROM normalizePostPayload)
    ====================================================== */

    let attachments = [];

    if (content?.imageUrl || content?.videoUrl) {
      attachments.push({
        url: content.imageUrl || content.videoUrl,
        public_id: content.publicId,
      });
    }

    /* ======================================================
       CREATE SUPPORT DOCUMENT
    ====================================================== */

    const supportTicket = await Support.create({
      user: userId,
      category: category || "other",
      subject,
      message,
      priority: priority || "medium",
      attachments,
      deviceInfo: deviceInfo || {},
    });

    /* ======================================================
       RESPONSE
    ====================================================== */

    return res.status(201).json({
      success: true,
      message: "Support ticket submitted successfully",
      data: {
        id: supportTicket._id,
        category: supportTicket.category,
        subject: supportTicket.subject,
        status: supportTicket.status,
        createdAt: supportTicket.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ SUPPORT CREATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit support ticket",
      error: error.message,
    });
  }
};


/* ==========================================================
   CREATE FEEDBACK
   POST /api/feedback
========================================================== */
exports.createFeedback = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      rating,
      experience,
      message,
      usageDuration,
      featureArea,
      recommend,
    } = req.body;

    /* ======================================================
       VALIDATION
    ====================================================== */

    if (!message && !rating) {
      return res.status(400).json({
        success: false,
        message: "Feedback message or rating is required",
      });
    }

    /* ======================================================
       SENTIMENT AUTO DETECTION (OPTIONAL)
       Simple lightweight sentiment classification
    ====================================================== */

    let sentiment = "neutral";

    if (rating >= 4) sentiment = "positive";
    if (rating <= 2) sentiment = "negative";

    /* ======================================================
       CREATE FEEDBACK DOCUMENT
    ====================================================== */

    const feedback = await Feedback.create({
      user: userId,
      rating,
      experience,
      message,
      usageDuration,
      featureArea,
      recommend,
      sentiment,
    });

    /* ======================================================
       RESPONSE
    ====================================================== */

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: {
        id: feedback._id,
        rating: feedback.rating,
        sentiment: feedback.sentiment,
        createdAt: feedback.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ FEEDBACK CREATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
      error: error.message,
    });
  }
};