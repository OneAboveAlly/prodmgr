const express = require('express');
const router = express.Router();
const { checkAuth } = require('../middleware/auth.middleware');
const messageController = require('../controllers/message.controller');

router.use(checkAuth);

router.post('/', messageController.sendMessage);

module.exports = router;
