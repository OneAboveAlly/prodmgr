// backend/src/routes/statistics.routes.js
const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statistics.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(checkAuth);

// Get user work statistics - personal or with higher permissions
router.get(
  '/users/:userId',
  checkAuth,
  statisticsController.getUserWorkStatistics
);

// Production efficiency report - requires production view permissions
router.get(
  '/production/efficiency',
  checkPermission('production', 'read', 1),
  statisticsController.getProductionEfficiencyReport
);

// User ranking report - requires management permissions
router.get(
  '/users/ranking',
  checkPermission('users', 'read', 2),
  statisticsController.getUserRankingReport
);

// Dashboard overview - requires high-level management or CEO role
router.get(
  '/dashboard/overview',
  checkPermission('statistics', 'viewReports', 2),
  statisticsController.getDashboardOverview
);

module.exports = router;