const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { checkAuth } = require('../middleware/auth.middleware');

router.use(checkAuth);

router.get('/', notificationController.getUserNotifications);
router.post('/', notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.patch('/:id/archive', notificationController.archiveSingle);
router.patch('/mark-all-read/:userId', notificationController.markAllAsRead);
router.patch('/archive-all/:userId', notificationController.archiveAllNotifications);
router.get('/history', notificationController.getNotificationHistory);
router.post('/send', notificationController.sendManualNotification);
router.post('/test/:userId', notificationController.testNotification);

module.exports = router;
