const express = require('express');
const router = express.Router();
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const dashboardController = require('../controllers/productionDashboard.controller');

// Apply authentication to all routes
router.use(checkAuth);

// Dashboard overview
router.get('/overview', checkPermission('dashboard', 'read', 1), dashboardController.getDashboardOverview);

// User productivity
router.get('/productivity', checkAuth, dashboardController.getUserProductivity);
router.get('/productivity/:userId', checkPermission('dashboard', 'read', 1), dashboardController.getUserProductivity);

// Production bottlenecks
router.get('/bottlenecks', checkPermission('dashboard', 'read', 1), dashboardController.getProductionBottlenecks);

// Resource utilization
router.get('/resources', checkPermission('dashboard', 'read', 1), dashboardController.getResourceUtilization);

// Capacity planning
router.get('/capacity', checkPermission('dashboard', 'read', 1), dashboardController.getCapacityPlanning);

// Get dashboard statistics
router.get(
  '/stats',
  checkAuth,
  dashboardController.getDashboardStats
);

module.exports = router; 