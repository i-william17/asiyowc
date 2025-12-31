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
  normalizePostPayload,
  postController.createPost
);

/* =====================================================
   UPDATE POST (OPTIONAL MEDIA REPLACE)
===================================================== */
router.put(
  '/:postId',
  auth,
  upload.single('media'),
  normalizePostPayload,
  postController.updatePost
);

/* =====================================================
   FEED & READ
===================================================== */
router.get('/feed', auth, postController.getFeed);
router.get('/highlights', auth, postController.getPublicHighlights);
router.get('/:postId', auth, postController.getPostById);

/* =====================================================
   LIKES (INSTAGRAM-STYLE)
===================================================== */
router.post('/:postId/like', auth, postController.toggleLike);

/* =====================================================
   COMMENTS
===================================================== */
router.get('/:postId/comments', auth, postController.getComments);
router.post('/:postId/comments', auth, postController.addComment);
router.put('/:postId/comments/:commentId', auth, postController.editComment);
router.delete('/:postId/comments/:commentId', auth, postController.removeComment);

/* ----- COMMENT LIKES ----- */
router.post(
  '/:postId/comments/:commentId/like',
  auth,
  postController.toggleLikeComment
);

/* =====================================================
   SHARING
===================================================== */
router.post('/:postId/share', auth, postController.sharePost);
router.post('/:postId/unshare', auth, postController.unsharePost);

/* =====================================================
   REPORT
===================================================== */
router.post('/:postId/report', auth, postController.reportPost);

/* =====================================================
   DELETE POST
===================================================== */
router.delete('/:postId', auth, postController.deletePost);

module.exports = router;
