// backend/src/routes/production.routes.js
const express = require('express');
const router = express.Router();
const productionController = require('../controllers/production.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(checkAuth);

// --- Guide Management Routes ---
// Get all guides with pagination and filtering
router.get(
  '/guides',
  checkPermission('production', 'read', 1),
  productionController.getAllProductionGuides
);

// Get archived guides - MOVED UP to be before the /:id route
router.get(
  '/guides/archived',
  checkPermission('production', 'read', 1),
  productionController.getArchivedGuides
);

// Get a single guide
router.get(
  '/guides/:id',
  checkPermission('production', 'read', 1),
  productionController.getProductionGuideById
);

// Create a new guide
router.post(
  '/guides',
  checkPermission('production', 'create', 1),
  productionController.handleFileUpload,
  productionController.createProductionGuide
);

// Update a guide
router.put(
  '/guides/:id',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.updateProductionGuide
);

// Archive a guide
router.put(
  '/guides/:id/archive',
  checkPermission('production', 'update', 1),
  productionController.archiveGuide
);

// Unarchive a guide
router.put(
  '/guides/:id/unarchive',
  checkPermission('production', 'update', 1),
  productionController.unarchiveGuide
);

// Delete a guide
router.delete(
  '/guides/:id',
  checkPermission('production', 'delete', 2),
  productionController.deleteProductionGuide
);

// --- Guide Change History ---
// Get change history for a guide
router.get(
  '/guides/:id/history',
  checkPermission('production', 'read', 1),
  productionController.getGuideChangeHistory
);

// --- Step Management Routes ---
// Add a step to a guide
router.post(
  '/guides/:guideId/steps',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.addProductionStep
);

// Update a step
router.put(
  '/steps/:id',
  checkPermission('production', 'update', 1),
  productionController.handleFileUpload,
  productionController.updateProductionStep
);

// Delete a step
router.delete(
  '/steps/:id',
  checkPermission('production', 'update', 1),
  productionController.deleteProductionStep
);

// --- Manual Work Time Entry Routes ---
// Add work entry to a step
router.post(
  '/steps/:id/work',
  checkPermission('production', 'work', 1),
  productionController.addWorkEntry
);

// Get work entries for a step
router.get(
  '/steps/:id/work',
  checkPermission('production', 'read', 1),
  productionController.getStepWorkEntries
);

// NEW: Get all work entries for a guide
router.get(
  '/guides/:id/work-entries',
  checkPermission('production', 'read', 1),
  productionController.getGuideWorkEntries
);

// Get work entries for a specific step
router.get(
  '/steps/:id/work-entries',
  checkPermission('production', 'read', 1),
  productionController.getStepWorkEntries
);

// Update a work entry
router.put(
  '/work-entries/:id',
  checkPermission('production', 'update', 1),
  productionController.updateWorkEntry
);

// Legacy work routes - keeping for backward compatibility
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

// --- Step Inventory Management Routes ---
// Assign inventory items to a step
router.post(
  '/steps/:id/inventory',
  checkPermission('production', 'update', 1),
  productionController.assignItemsToStep
);

// Update inventory item status (NEEDED/RESERVED/ISSUED)
router.put(
  '/step-inventory/:id/status',
  checkPermission('inventory', 'manage', 1),
  productionController.updateStepInventoryStatus
);

// --- User Assignment Routes ---
// Assign user to a guide
router.post(
  '/guides/:id/assign',
  checkPermission('production', 'manage', 2),
  productionController.assignUserToGuide
);

// Remove user assignment - Change permission from 'manage' level 2 to 'update' level 1
router.delete(
  '/guides/:id/assign/:userId',
  checkPermission('production', 'update', 1),  // Less restrictive permission
  productionController.removeUserFromGuide
);

// Get assigned users
router.get(
  '/guides/:id/assigned-users',
  checkPermission('production', 'read', 1),
  productionController.getAssignedUsers
);

// Batch assign multiple users
router.post(
  '/guides/:id/assign-users',
  checkPermission('production', 'assign', 1),
  productionController.assignMultipleUsersToGuide
);

// Removed duplicate route '/guides/:id/assign-user'

// Legacy route for manual work entries
router.post(
  '/guides/:id/manual-work',
  checkPermission('production', 'work', 1),
  productionController.addManualWorkEntry
);

// --- Comment and Attachment Routes ---
// Add comment to a step
router.post(
  '/steps/:id/comments',
  checkPermission('production', 'work', 1),
  productionController.handleFileUpload,
  productionController.addStepComment
);

// Delete attachment
router.delete(
  '/attachments/:id',
  checkPermission('production', 'update', 1),
  productionController.deleteAttachment
);

// --- Step Assignment Routes ---
// Get all users assigned to a step
router.get(
  '/steps/:stepId/assigned-users',
  checkPermission('production', 'read', 1),
  productionController.getStepAssignedUsers
);

// Assign users to a step
router.post(
  '/steps/:stepId/assign-users',
  checkPermission('production', 'assign', 1),
  productionController.assignUsersToStep
);

// Remove user assignment from a step
router.delete(
  '/steps/:stepId/assign/:userId',
  checkPermission('production', 'assign', 1),
  productionController.removeUserFromStep
);

// --- Guide Inventory Routes ---
// Withdraw reserved items from inventory for a guide (only for assigned users)
router.post(
  '/guides/:guideId/withdraw-items',
  checkPermission('production', 'work', 1),
  checkPermission('inventory', 'issue', 1),
  productionController.withdrawReservedItems
);

module.exports = router;