const express = require('express');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const { getAuditLogs } = require('../controllers/audit.controller');

const router = express.Router();

router.use(checkAuth);

// Requires "auditLogs.read" permission
router.get(
  '/',
  checkPermission('auditLogs', 'read', 1),
  getAuditLogs
);

module.exports = router;
