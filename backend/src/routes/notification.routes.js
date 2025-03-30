const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { checkAuth } = require('../middleware/auth.middleware');

router.use(checkAuth); // 🔒 Zabezpieczenie JWT

router.get('/', notificationController.getUserNotifications);
router.post('/', notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);

// ✅ Wysyłka ręczna (z UI np. SendNotificationPage)
router.post('/send', notificationController.sendManualNotification);

// ✅ Testowa trasa
router.post('/test/:userId', notificationController.testNotification);

// ✅ Zaznacz wszystkie jako przeczytane
router.patch('/mark-all-read/:userId', notificationController.markAllAsRead);

module.exports = router;
