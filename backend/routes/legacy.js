const express = require("express");
const router = express.Router();

const {
  getTributes,
  getTributeById,
  createTribute,
  toggleLikeTribute,
  updateTribute,
  deleteTribute,

  // 💬 COMMENTS
  addComment,
  deleteComment,
  toggleLikeComment,
} = require("../controllers/legacyController");

const { auth } = require("../middleware/auth");

/* =====================================================
   TRIBUTES
===================================================== */

// Get paginated tributes (with populated user + comments)
router.get("/", getTributes);

// Get single tribute by ID (with populated user + comments)
router.get("/:id", getTributeById);

// Create tribute (max 3 per user)
router.post("/", auth, createTribute);

// Toggle like / unlike tribute
router.post("/:id/like", auth, toggleLikeTribute);

// Update tribute (owner only)
router.put("/:id", auth, updateTribute);

// Delete tribute (owner only)
router.delete("/:id", auth, deleteTribute);

/* =====================================================
   COMMENTS
===================================================== */

// Add comment to tribute
router.post("/:id/comments", auth, addComment);

// Toggle like / unlike comment
router.post("/:id/comments/:commentId/like", auth, toggleLikeComment);

// Delete comment (owner only)
router.delete("/:id/comments/:commentId", auth, deleteComment);

module.exports = router;
