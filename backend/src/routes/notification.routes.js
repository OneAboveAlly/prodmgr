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
router.get('/scheduled', notificationController.getScheduledNotifications);

router.post('/send', notificationController.sendManualNotification);
router.post('/test/:userId', notificationController.testNotification);
router.post('/schedule', notificationController.scheduleNotification);

router.post('/production/guide-completed', notificationController.notifyGuideCompleted);
router.post('/production/step-completed', notificationController.notifyStepCompleted);
router.post('/production/guide-assigned', notificationController.notifyGuideAssigned);

router.get('/:id', notificationController.getNotificationById);
router.put('/:id', notificationController.updateNotification);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
