const express = require('express');
const userController = require('../controllers/user.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// Get all users - requires users.read permission
router.get(
  '/',
  checkPermission('users', 'read', 1), 
  userController.getAllUsers
);

// Get user by ID - requires users.read permission
router.get(
  '/:id',
  checkPermission('users', 'read', 1),
  userController.getUserById
);

// Create user - requires users.create permission
router.post(
  '/',
  checkPermission('users', 'create', 1),
  userController.createUser
);

// Update user - requires users.update permission
router.put(
  '/:id',
  checkPermission('users', 'update', 1),
  userController.updateUser
);

// Delete user - requires users.delete permission
router.delete(
  '/:id',
  checkPermission('users', 'delete', 2), // Higher permission level for deletion
  userController.deleteUser
);

module.exports = router;