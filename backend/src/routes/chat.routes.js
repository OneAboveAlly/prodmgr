const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { checkAuth } = require('../middleware/auth.middleware');

router.use(checkAuth);

router.get('/', chatController.getConversations);
router.get('/:userId', chatController.getMessagesWithUser);
router.post('/:userId', chatController.sendMessage);
router.delete('/:messageId', chatController.deleteMessage);

module.exports = router;
