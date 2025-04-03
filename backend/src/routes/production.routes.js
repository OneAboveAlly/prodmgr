// backend/src/routes/production.routes.js
const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// Wszystkie trasy wymagają uwierzytelnienia
router.use(checkAuth);

// Trasy dla przewodników produkcyjnych
router.get(
  '/guides',
  checkPermission('production', 'read', 1),
  productionController.getAllProductionGuides
);

router.get(
  '/guides/:id',
  checkPermission('production', 'read', 1),
  productionController.getProductionGuideById
);

router.post(
  '/guides',
  checkPermission('production', 'create', 1),
  productionController.handleFileUpload,
  productionController.createProductionGuide
);

router.put(
  '/guides/:id',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.updateProductionGuide
);

router.delete(
  '/guides/:id',
  checkPermission('production', 'delete', 2),
  productionController.deleteProductionGuide
);

// Trasy dla kroków produkcyjnych
router.post(
  '/guides/:guideId/steps',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.addProductionStep
);

router.put(
  '/steps/:id',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.updateProductionStep
);

router.delete(
  '/steps/:id',
  checkPermission('production', 'update', 1),
  productionController.deleteProductionStep
);

// Trasy dla zarządzania pracą nad krokami
router.post(
  '/steps/:id/work/start',
  checkPermission('production', 'work', 1),
  productionController.startWorkOnStep
);

router.post(
  '/steps/:id/work/end',
  checkPermission('production', 'work', 1),
  productionController.endWorkOnStep
);

// Trasy dla komentarzy do kroków
router.post(
  '/steps/:id/comments',
  checkPermission('production', 'work', 1),
  productionController.handleFileUpload,
  productionController.addStepComment
);

// Trasy dla załączników
router.delete(
  '/attachments/:id',
  checkPermission('production', 'update', 1),
  productionController.deleteAttachment
);

// Przypisanie użytkownika do przewodnika
router.post(
  '/guides/:id/assign',
  checkPermission('production', 'manage', 2),
  productionController.assignUserToGuide
);

// Usunięcie przypisania użytkownika
router.delete(
  '/guides/:id/assign/:userId',
  checkPermission('production', 'manage', 2),
  productionController.removeUserFromGuide
);

router.post(
  '/guides/:id/assign-user',
  checkPermission('production', 'assign', 1),
  productionController.assignUserToGuide
);

router.get(
  '/guides/:id/assigned-users',
  checkPermission('production', 'read', 1),
  productionController.getAssignedUsers
);

router.post(
  '/guides/:id/assign-users',
  checkPermission('production', 'assign', 1),
  productionController.assignMultipleUsersToGuide
);

router.post(
  '/guides/:id/manual-work',
  checkPermission('production', 'work', 1),
  productionController.addManualWorkEntry
);

module.exports = router;