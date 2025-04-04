// backend/src/routes/inventory.routes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// Wszystkie trasy wymagają uwierzytelnienia
router.use(checkAuth);

// --- Standard Inventory Routes ---
router.get(
  '/items',
  checkPermission('inventory', 'read', 1),
  inventoryController.getAllInventoryItems
);

router.get(
  '/items/:id',
  checkPermission('inventory', 'read', 1),
  inventoryController.getInventoryItemById
);

router.post(
  '/items',
  checkPermission('inventory', 'create', 1),
  inventoryController.handleFileUpload,
  inventoryController.createInventoryItem
);

router.put(
  '/items/:id',
  checkPermission('inventory', 'update', 1),
  inventoryController.handleFileUpload,
  inventoryController.updateInventoryItem
);

router.delete(
  '/items/:id',
  checkPermission('inventory', 'manage', 2),
  inventoryController.deleteInventoryItem
);

// --- Production Integration Routes ---
// Get production-related inventory requests
router.get(
  '/production-requests',
  checkPermission('inventory', 'read', 1),
  inventoryController.getProductionRequests
);

// Process a production request (reserve, issue, or return)
router.post(
  '/production-requests/:id/process',
  checkPermission('inventory', 'manage', 1),
  inventoryController.processProductionRequest
);

// Get inventory report for a specific guide
router.get(
  '/guides/:id/report',
  checkPermission('inventory', 'read', 1),
  inventoryController.getGuideInventoryReport
);

// --- Transaction Routes ---
router.post(
  '/items/:id/add',
  checkPermission('inventory', 'update', 1),
  inventoryController.addInventoryQuantity
);

router.post(
  '/items/:id/remove',
  checkPermission('inventory', 'update', 1),
  inventoryController.removeInventoryQuantity
);

router.get(
  '/items/:id/transactions',
  checkPermission('inventory', 'read', 1),
  inventoryController.getItemTransactions
);

router.get(
  '/transactions/all',
  checkPermission('inventory', 'read', 1),
  inventoryController.getAllInventoryTransactions 
);

// --- Guide Inventory Management ---
router.post(
  '/guides/:guideId/items',
  checkPermission('production', 'update', 1),
  inventoryController.addItemsToProductionGuide
);

router.delete(
  '/guides/:guideId/items/:itemId',
  checkPermission('production', 'update', 1),
  inventoryController.removeItemFromProductionGuide
);

router.put(
  '/guides/:guideId/items/:itemId/reserve',
  checkPermission('inventory', 'manage', 1),
  inventoryController.updateReservationStatus
);

// --- Reporting ---
router.get(
  '/report',
  checkPermission('inventory', 'read', 1),
  inventoryController.generateInventoryReport
);

module.exports = router;