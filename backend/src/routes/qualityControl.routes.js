const express = require('express');
const router = express.Router();
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const qualityController = require('../controllers/qualityControl.controller');

// Apply authentication to all routes
router.use(checkAuth);

// Quality template routes
router.post('/templates', checkPermission('quality', 'create', 1), qualityController.createQualityTemplate);
router.get('/templates', checkPermission('quality', 'read', 1), qualityController.getAllTemplates);
router.get('/templates/:id', checkPermission('quality', 'read', 1), qualityController.getTemplateById);
router.put('/templates/:id', checkPermission('quality', 'update', 1), qualityController.updateTemplate);
router.delete('/templates/:id', checkPermission('quality', 'delete', 1), qualityController.deleteTemplate);

// Quality check routes
router.post('/checks', checkPermission('quality', 'create', 1), qualityController.handleFileUpload, qualityController.performQualityCheck);
router.get('/guides/:guideId/checks', checkPermission('quality', 'read', 1), qualityController.getGuideQualityChecks);
router.get('/steps/:stepId/checks', checkPermission('quality', 'read', 1), qualityController.getStepQualityChecks);
router.get('/checks/:id', checkPermission('quality', 'read', 1), qualityController.getQualityCheckById);

// Quality statistics route
router.get('/stats', checkPermission('quality', 'read', 1), qualityController.getQualityStats);

// Export quality checks route (wymaga uprawnienia eksportu)
router.get('/export', checkPermission('quality', 'read', 1), checkPermission('auditLogs', 'export', 1), qualityController.exportQualityChecksToCSV);

module.exports = router; 