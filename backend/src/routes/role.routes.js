const express = require('express');
const roleController = require('../controllers/role.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// Get all roles - requires roles.read permission
router.get(
  '/',
  checkPermission('roles', 'read', 1),
  roleController.getAllRoles
);

// Get all permissions - requires roles.read permission
router.get(
  '/permissions',
  checkPermission('roles', 'read', 1),
  roleController.getAllPermissions
);

// Get role by ID - requires roles.read permission
router.get(
  '/:id',
  checkPermission('roles', 'read', 1),
  roleController.getRoleById
);

// Create role - requires roles.create permission
router.post(
  '/',
  checkPermission('roles', 'create', 1),
  roleController.createRole
);

// Update role - requires roles.update permission
router.put(
  '/:id',
  checkPermission('roles', 'update', 1),
  roleController.updateRole
);

// Delete role - requires roles.delete permission
router.delete(
  '/:id',
  checkPermission('roles', 'delete'), // Higher permission level for deletion
  roleController.deleteRole
);

module.exports = router;