const express = require('express');
const authController = require('../controllers/auth.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/login', authController.login);
router.post('/refresh-token', authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', checkAuth, authController.me);

module.exports = router;