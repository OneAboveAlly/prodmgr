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

// Get single role by ID - requires roles.read permission
router.get(
  '/:id',
  checkPermission('roles', 'read', 1),
  roleController.getRoleById
);

// Create new role - requires roles.create permission
router.post(
  '/',
  checkPermission('roles', 'create', 2),
  roleController.createRole
);

// Update role - requires roles.update permission
router.put(
  '/:id',
  checkPermission('roles', 'update', 2),
  roleController.updateRole
);

// Delete role - requires roles.delete permission with higher level
router.delete(
  '/:id',
  checkPermission('roles', 'delete', 3),
  roleController.deleteRole
);

// Get all permissions - requires permissions.read permission
router.get(
  '/system/permissions',
  checkPermission('permissions', 'read', 1),
  roleController.getAllPermissions
);

module.exports = router;