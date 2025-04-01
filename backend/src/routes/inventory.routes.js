// backend/src/routes/inventory.routes.js
const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

// Wszystkie trasy wymagają uwierzytelnienia
router.use(checkAuth);

// Trasy dla przedmiotów magazynowych
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

// Trasy dla transakcji magazynowych
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

// Trasy dla przedmiotów w przewodnikach produkcyjnych
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

// Trasa dla raportów magazynowych
router.get(
  '/report',
  checkPermission('inventory', 'read', 1),
  inventoryController.generateInventoryReport
);

module.exports = router;