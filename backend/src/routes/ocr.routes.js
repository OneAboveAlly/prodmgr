// backend/src/routes/ocr.routes.js
const express = require('express');
const router = express.Router();
const ocrController = require('../controllers/ocr.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(checkAuth);

// Process OCR on an image
router.post(
  '/process',
  checkPermission('production', 'work', 1),
  ocrController.handleOcrUpload,
  ocrController.processImageOcr
);

// Update OCR text (manual correction)
router.put(
  '/:id',
  checkPermission('production', 'work', 1),
  ocrController.updateOcrText
);

// Get OCR history for a step
router.get(
  '/step/:stepId',
  checkPermission('production', 'read', 1),
  ocrController.getStepOcrHistory
);

module.exports = router;