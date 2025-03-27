// backend/src/routes/leave.routes.js
const express = require('express');
const leaveController = require('../controllers/leave.controller');
const { checkAuth, checkPermission } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(checkAuth);

// Leave types management
router.get(
  '/types',
  checkPermission('leave', 'read', 1),
  leaveController.getLeaveTypes
);

router.post(
  '/types',
  checkPermission('leave', 'manageTypes', 1),
  leaveController.createLeaveType
);

router.put(
  '/types/:id',
  checkPermission('leave', 'manageTypes', 1),
  leaveController.updateLeaveType
);

router.delete(
  '/types/:id',
  checkPermission('leave', 'manageTypes', 1),
  leaveController.deleteLeaveType
);

// Leave requests management
router.post(
  '/request',
  checkPermission('leave', 'create', 1),
  leaveController.requestLeave
);

router.put(
  '/request/:id',
  checkPermission('leave', 'update', 1),
  leaveController.updateLeaveRequest
);

router.post(
  '/request/:id/approve',
  checkPermission('leave', 'approve', 1),
  (req, res) => {
    req.body.status = 'approved';
    leaveController.approveRejectLeave(req, res);
  }
);

router.post(
  '/request/:id/reject',
  checkPermission('leave', 'approve', 1),
  (req, res) => {
    req.body.status = 'rejected';
    leaveController.approveRejectLeave(req, res);
  }
);

router.delete(
  '/request/:id',
  checkPermission('leave', 'delete', 1),
  leaveController.deleteLeaveRequest
);

// Get user's leave requests
router.get(
  '/requests',
  checkPermission('leave', 'read', 1),
  (req, res) => leaveController.getUserLeaves(req, res)
);

// Get another user's leave requests
router.get(
  '/requests/user/:userId',
  checkPermission('leave', 'viewAll', 1),
  leaveController.getUserLeaves
);

// Get all pending leave requests (for managers/admins)
router.get(
  '/requests/pending',
  checkPermission('leave', 'approve', 1),
  leaveController.getPendingLeaves
);

module.exports = router;