const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { checkAuth } = require('../middleware/auth.middleware');
const { uploadAttachment } = require('../middleware/upload.middleware');

router.use(checkAuth);

// Nowy endpoint dla listy użytkowników dostępnych do czatu
router.get('/users', chatController.getUsers);

router.get('/', chatController.getConversations);
router.get('/:userId', chatController.getMessagesWithUser);
router.post('/:userId', chatController.sendMessage);
router.delete('/:messageId', chatController.deleteMessage);

// Endpoint do wysyłania wiadomości z załącznikami
router.post('/:userId/attachment', uploadAttachment.single('file'), chatController.sendMessageWithAttachment);

module.exports = router;
