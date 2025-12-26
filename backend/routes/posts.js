// routes/posts.js
const express = require('express');
const router = express.Router();

const { upload, normalizePostPayload } = require('../middleware/upload');
const { auth } = require('../middleware/auth');

const postController = require('../controllers/postController');

/* =====================================================
   CREATE POST (TEXT / IMAGE / VIDEO)
===================================================== */
router.post(
  '/',
  auth,
  upload.single('media'),
  normalizePostPayload,        // 🔑 REQUIRED
  postController.createPost
);

/* =====================================================
   UPDATE POST (OPTIONAL MEDIA REPLACE)
===================================================== */
router.put(
  '/:postId',
  auth,
  upload.single('media'),
  normalizePostPayload,        // 🔑 REQUIRED
  postController.updatePost
);

/* =====================================================
   FEED & READ ROUTES (UNCHANGED)
===================================================== */
router.get('/feed', auth, postController.getFeed);
router.get('/highlights', auth, postController.getPublicHighlights);
router.get('/:postId', auth, postController.getPostById);

/* =====================================================
   COMMENTS
===================================================== */
router.get('/:postId/comments', auth, postController.getComments);
router.post('/:postId/comments', auth, postController.addComment);
router.put('/:postId/comments/:commentId', auth, postController.editComment);
router.delete('/:postId/comments/:commentId', auth, postController.removeComment);

/* =====================================================
   SHARING
===================================================== */
router.post('/:postId/share', auth, postController.sharePost);
router.post('/:postId/unshare', auth, postController.unsharePost);

/* =====================================================
   REACTIONS
===================================================== */
router.post('/:postId/react', auth, postController.reactToPost);
router.post('/:postId/unreact', auth, postController.removeReaction);

/* =====================================================
   DELETE
===================================================== */
router.delete('/:postId', auth, postController.deletePost);

module.exports = router;
