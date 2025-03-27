// backend/src/routes/timeTracking.routes.js
const express = require('express');
const timeTrackingController = require('../controllers/timeTracking.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// Get settings - requires read permission
router.get(
  '/settings',
  checkPermission('timeTracking', 'read', 1),
  timeTrackingController.getSettings
);

// Update settings - requires manage settings permission
router.put(
  '/settings',
  checkPermission('timeTracking', 'manageSettings', 1),
  timeTrackingController.updateSettings
);

// Start a session - requires create permission
router.post(
  '/sessions/start',
  checkPermission('timeTracking', 'create', 1),
  timeTrackingController.startSession
);

// End a session - requires update permission
router.post(
  '/sessions/end',
  checkPermission('timeTracking', 'update', 1),
  timeTrackingController.endSession
);

// Start a break - requires update permission
router.post(
  '/breaks/start',
  checkPermission('timeTracking', 'update', 1),
  timeTrackingController.startBreak
);

// End a break - requires update permission
router.post(
  '/breaks/end',
  checkPermission('timeTracking', 'update', 1),
  timeTrackingController.endBreak
);

// Get current session - requires read permission
router.get(
  '/sessions/current',
  checkPermission('timeTracking', 'read', 1),
  timeTrackingController.getCurrentSession
);

// Get user's sessions - requires read permission
router.get(
  '/sessions',
  checkPermission('timeTracking', 'read', 1),
  (req, res) => timeTrackingController.getUserSessions(req, res)
);

// Get another user's sessions - requires viewAll permission
router.get(
  '/sessions/user/:userId',
  checkPermission('timeTracking', 'viewAll', 1),
  timeTrackingController.getUserSessions
);

// Get daily summaries for calendar view - requires read permission
router.get(
  '/daily-summaries',
  checkPermission('timeTracking', 'read', 1),
  timeTrackingController.getDailySummaries
);

// Update session notes - requires update permission
router.put(
  '/sessions/:id/notes',
  checkPermission('timeTracking', 'update', 1),
  timeTrackingController.updateSessionNotes
);

// Generate report - requires viewReports permission
router.post(
  '/report',
  checkPermission('timeTracking', 'viewReports', 1),
  timeTrackingController.getReport
);

// Get all active sessions - requires viewAll permission
router.get(
    '/sessions/active/all',
    checkPermission('timeTracking', 'viewAll', 1),
    timeTrackingController.getAllActiveSessions
  );

module.exports = router;