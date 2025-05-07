const express = require('express');
const router = express.Router();
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const schedulingController = require('../controllers/scheduling.controller');

// Apply authentication to all routes
router.use(checkAuth);

// Schedule routes
router.post('/', checkPermission('scheduling', 'create', 1), schedulingController.createSchedule);
router.get('/', checkPermission('scheduling', 'read', 1), schedulingController.getAllSchedules);
router.get('/:id', checkPermission('scheduling', 'read', 1), schedulingController.getScheduleById);
router.put('/:id', checkPermission('scheduling', 'update', 1), schedulingController.updateSchedule);
router.delete('/:id', checkPermission('scheduling', 'delete', 1), schedulingController.deleteSchedule);

// Schedule assignment routes
router.post('/:scheduleId/assignments', checkPermission('scheduling', 'create', 1), schedulingController.addScheduleAssignment);
router.put('/assignments/:id', checkPermission('scheduling', 'update', 1), schedulingController.updateScheduleAssignment);
router.delete('/assignments/:id', checkPermission('scheduling', 'delete', 1), schedulingController.deleteScheduleAssignment);

// User schedule routes
router.get('/users/me', checkAuth, schedulingController.getUserSchedule);
router.get('/users/:userId', checkPermission('scheduling', 'read', 1), schedulingController.getUserSchedule);

// Guide schedule routes
router.get('/guides/:guideId', checkPermission('scheduling', 'read', 1), schedulingController.getGuideSchedule);

module.exports = router; 