const express = require('express');
const router = express.Router();
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const auditController = require('../controllers/audit.controller');

// Apply authentication to all routes
router.use(checkAuth);

// General audit logs with enhanced filtering
router.get('/', checkPermission('auditLogs', 'read', 1), auditController.getAuditLogs);

// Production guide specific audit logs
router.get('/guides/:guideId', checkPermission('production', 'read', 1), auditController.getProductionGuideAuditLogs);

// Production audit statistics
router.get('/stats/production', checkPermission('production', 'read', 1), auditController.getProductionAuditStats);

// Middleware to track guide access
router.use('/guides/:guideId/*', checkAuth, auditController.logGuideAccess);

module.exports = router; 