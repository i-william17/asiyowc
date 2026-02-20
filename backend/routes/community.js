// routes/community.js
const express = require('express');
const router = express.Router();

const communityController = require('../controllers/communityController');
const { auth, isModerator } = require('../middleware/auth');
const { upload, normalizePostPayload } = require('../middleware/upload');

/* =====================================================
   GLOBAL MIDDLEWARE
===================================================== */

// All community routes require authentication
router.use(auth);

/* =====================================================
   GROUP ROUTES
===================================================== */

// 1. Create group
router.post('/groups', communityController.createGroup);

// 2. Get groups
router.get('/groups', communityController.getGroups);

// 3. Get group by ID
router.get('/groups/:groupId', communityController.getGroupById);

// 4. Join group
router.post('/groups/:groupId/join', communityController.joinGroup);

// 5. Leave group
router.post('/groups/:groupId/leave', communityController.leaveGroup);

// 6. Update group
router.put('/groups/:groupId', communityController.updateGroup);

// 7. Delete group
router.delete('/groups/:groupId', communityController.deleteGroup);

// 8. Get group conversation (returns chatId)
router.get(
  '/groups/:groupId/conversation',
  communityController.getGroupConversation
);

//GROUP CHAT BY CHAT ID
router.get(
  '/groups/chat/:chatId',
  communityController.getGroupConversationByChatId
);


/* =====================================================
   GROUP CHAT (USES SHARED CHAT ENGINE)
===================================================== */

// Send group message
router.post(
  '/groups/:groupId/chat/:chatId/messages',
  communityController.sendGroupMessage
);

// Delete group message
router.delete(
  '/groups/:groupId/chat/:chatId/messages/:messageId',
  communityController.deleteGroupMessage
);

/* =====================================================
   HUB ROUTES
===================================================== */

// Create hub (moderators only)
router.post('/hubs', isModerator, communityController.createHub);

// Get hubs
router.get('/hubs', communityController.getHubs);

// Get hub by ID
router.get('/hubs/:id', communityController.getHubById);

// Join hub
router.post('/hubs/:id/join', communityController.joinHub);

// Leave hub
router.post('/hubs/:id/leave', communityController.leaveHub);

// Update hub
router.put('/hubs/:id', isModerator, communityController.updateHub);

// Delete hub
router.delete('/hubs/:id', isModerator, communityController.deleteHub);

/* =====================================================
   HUB UPDATES
===================================================== */

router.get("/hubs/:hubId/updates", auth, communityController.getHubUpdates);

router.post(
  "/hubs/:hubId/updates",
  auth,
  upload.single("file"),
  normalizePostPayload,
  communityController.createHubUpdate
);

router.delete(
  "/hubs/:hubId/updates/:updateId",
  auth,
  communityController.deleteHubUpdate
);

router.post(
  "/hubs/:hubId/updates/:updateId/react",
  auth,
  communityController.reactToHubUpdate
);

/* =====================================================
   CHAT ROUTES (DM + GROUP — SAME SCHEMA)
===================================================== */

// Create chat (DM only; group chats are created via groups)
router.post('/chats', communityController.createChat);

// Get all chats user participates in
router.get('/chats', communityController.getChats);

// Get chat by ID
router.get(
  '/chats/:chatId',
  communityController.getChatById
);

// Get messages
router.get(
  '/chats/:chatId/messages',
  communityController.getMessages
);

// Get message by ID
router.get(
  '/chats/:chatId/messages/:messageId',
  communityController.getMessageById
);

// Send message
router.post(
  '/chats/:chatId/messages',
  communityController.sendMessage
);

// Edit message
router.patch(
  '/chats/:chatId/messages/:messageId',
  communityController.editMessageById
);

// Delete message
router.delete(
  '/chats/:chatId/messages/:messageId',
  communityController.deleteMessageById
);

// Share post in chat
router.post(
  '/chats/:chatId/share',
  communityController.sharePostInChat
);

// React to message
router.post(
  '/chats/:chatId/messages/:messageId/react',
  communityController.reactToMessage
);

// Soft delete message (for self)
router.patch(
  '/chats/:chatId/messages/:messageId/soft-delete',
  communityController.softDeleteMessage
);

// Pin message
router.post(
  '/groups/:groupId/chat/:chatId/messages/:messageId/pin',
  communityController.pinGroupMessage
);

//Mark message as read
router.post(
  '/chats/:chatId/messages/:messageId/read',
  communityController.markMessageAsRead
);


/* =====================================================
   VOICE ROUTES
===================================================== */
router.get(
  '/voice/instance/:instanceId',
  communityController.getVoiceInstanceById
);

router.post('/voice', communityController.createVoice);
router.get('/voice', communityController.getVoices);
router.get('/voice/:id', communityController.getVoiceById);

router.get('/voice/:id/info', communityController.getVoiceInfo);
router.put('/voice/:id', communityController.updateVoice);

router.post(
  '/voice/:id/instances',
  communityController.addVoiceInstance
);

router.patch(
  '/voice/:id/instances/:instanceId/status',
  communityController.updateVoiceInstanceStatus
);

router.delete(
  '/voice/:id/instances/:instanceId',
  communityController.deleteVoiceInstance
);

router.post(
  "/voice/instance/:instanceId/join",
  communityController.joinVoice
);
router.post('/voice/:instanceId/leave', communityController.leaveVoice);

/* =====================================================
   REPORTS & MODERATION
===================================================== */

// Submit report
router.post('/report', communityController.reportContent);

// Get moderation queue
router.get(
  '/moderation-queue',
  communityController.getModerationQueue
);

// Resolve report
router.patch(
  '/reports/:reportId/resolve',
  communityController.resolveReport
);


module.exports = router;
