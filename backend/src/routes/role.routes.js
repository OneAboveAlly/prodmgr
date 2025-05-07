const express = require('express');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');
const { 
  getAllRoles, 
  getRoleById, 
  createRole, 
  updateRole, 
  deleteRole, 
  getAllPermissions,
  refreshPermissionsCache 
} = require('../controllers/role.controller');

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// Get all roles - requires roles.read permission
router.get(
  '/',
  checkPermission('roles', 'read', 1),
  getAllRoles
);

// Get all permissions - requires roles.read permission
router.get(
  '/permissions',
  checkPermission('roles', 'read', 1),
  getAllPermissions
);

// Manual refresh of permissions cache - requires higher roles.update permission
router.post(
  '/permissions/refresh',
  checkPermission('roles', 'update', 2),
  refreshPermissionsCache
);

// Get role by ID - requires roles.read permission
router.get(
  '/:id',
  checkPermission('roles', 'read', 1),
  getRoleById
);

// Create role - requires roles.create permission
router.post(
  '/',
  checkPermission('roles', 'create', 1),
  createRole
);

// Update role - requires roles.update permission
router.put(
  '/:id',
  checkPermission('roles', 'update', 1),
  updateRole
);

// Delete role - requires roles.delete permission
router.delete(
  '/:id',
  checkPermission('roles', 'delete', 1),
  deleteRole
);

module.exports = router;