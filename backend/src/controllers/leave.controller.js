// backend/src/controllers/leave.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const { notifyLeaveRequest } = require('../utils/notificationUtils');

const prisma = new PrismaClient();

// Get all leave types
const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(leaveTypes);
  } catch (error) {
    console.error('Error fetching leave types:', error);
    res.status(500).json({ message: 'Error fetching leave types' });
  }
};

// Create a new leave type
const createLeaveType = async (req, res) => {
  try {
    const { name, description, paid, color } = req.body;
    
    // Check if the leave type already exists
    const existingType = await prisma.leaveType.findUnique({
      where: { name }
    });
    
    if (existingType) {
      return res.status(400).json({ message: 'Leave type with this name already exists' });
    }
    
    const leaveType = await prisma.leaveType.create({
      data: {
        name,
        description,
        paid: Boolean(paid),
        color: color || '#4F46E5'
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'leave',
      targetId: leaveType.id,
      meta: { leaveType }
    });
    
    res.status(201).json(leaveType);
  } catch (error) {
    console.error('Error creating leave type:', error);
    res.status(500).json({ message: 'Error creating leave type' });
  }
};

// Update a leave type
const updateLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, paid, color } = req.body;
    
    // Check if the leave type exists
    const existingType = await prisma.leaveType.findUnique({
      where: { id }
    });
    
    if (!existingType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    // Check if name is taken by another leave type
    if (name !== existingType.name) {
      const nameExists = await prisma.leaveType.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });
      
      if (nameExists) {
        return res.status(400).json({ message: 'Another leave type with this name already exists' });
      }
    }
    
    const updatedLeaveType = await prisma.leaveType.update({
      where: { id },
      data: {
        name,
        description,
        paid: Boolean(paid),
        color
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'leave',
      targetId: id,
      meta: {
        previousData: existingType,
        updatedData: updatedLeaveType
      }
    });
    
    res.json(updatedLeaveType);
  } catch (error) {
    console.error('Error updating leave type:', error);
    res.status(500).json({ message: 'Error updating leave type' });
  }
};

// Delete a leave type
const deleteLeaveType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the leave type exists
    const existingType = await prisma.leaveType.findUnique({
      where: { id }
    });
    
    if (!existingType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    // Check if the leave type is in use
    const leavesCount = await prisma.leave.count({
      where: { leaveTypeId: id }
    });
    
    if (leavesCount > 0) {
      return res.status(400).json({
        message: `Cannot delete leave type that is used in ${leavesCount} leave requests`
      });
    }
    
    await prisma.leaveType.delete({
      where: { id }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'leave',
      targetId: id,
      meta: { leaveType: existingType }
    });
    
    res.json({ message: 'Leave type deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave type:', error);
    res.status(500).json({ message: 'Error deleting leave type' });
  }
};

// Request a leave
const requestLeave = async (req, res) => {
  try {
    const { leaveTypeId, startDate, endDate, halfDay, morning, notes } = req.body;
    
    // Validate input
    if (!leaveTypeId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Leave type, start date, and end date are required' });
    }
    
    // Check if leave type exists
    const leaveType = await prisma.leaveType.findUnique({
      where: { id: leaveTypeId }
    });
    
    if (!leaveType) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate date range
    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date' });
    }
    
    // Create leave request
    const leave = await prisma.leave.create({
      data: {
        userId: req.user.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        halfDay: Boolean(halfDay),
        morning: halfDay ? Boolean(morning) : null,
        status: 'pending',
        notes
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'leave',
      targetId: leave.id,
      meta: {
        action: 'request',
        leaveType: leaveType.name,
        startDate,
        endDate,
        halfDay,
        morning
      }
    });
    
    const fullLeave = await prisma.leave.findUnique({
      where: { id: leave.id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    await notifyLeaveRequest(req.app.get('io'), prisma, fullLeave);
    
    res.status(201).json(leave);
  } catch (error) {
    console.error('Error requesting leave:', error);
    res.status(500).json({ message: 'Error requesting leave' });
  }
};

// Update a leave request
const updateLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveTypeId, startDate, endDate, halfDay, morning, notes } = req.body;
    
    // Check if the leave request exists
    const leave = await prisma.leave.findUnique({
      where: { id }
    });
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // Check if user owns this leave request or has permission to update
    const isOwner = leave.userId === req.user.id;
    const canUpdateAny = req.user.permissions['leave.approve'] >= 1;
    
    if (!isOwner && !canUpdateAny) {
      return res.status(403).json({ message: 'You do not have permission to update this leave request' });
    }
    
    // If not owner but admin/manager, they can only update the status
    if (!isOwner && canUpdateAny && (leaveTypeId || startDate || endDate || halfDay !== undefined)) {
      return res.status(400).json({ message: 'You can only update the status of this leave request' });
    }
    
    // If request is already approved/rejected, only admin/manager can update it
    if ((leave.status === 'approved' || leave.status === 'rejected') && !canUpdateAny) {
      return res.status(400).json({ message: 'Cannot update approved or rejected leave requests' });
    }
    
    // Prepare update data
    const updateData = {};
    
    if (leaveTypeId) updateData.leaveTypeId = leaveTypeId;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (halfDay !== undefined) updateData.halfDay = Boolean(halfDay);
    if (halfDay && morning !== undefined) updateData.morning = Boolean(morning);
    if (notes !== undefined) updateData.notes = notes;
    
    // Update leave request
    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: updateData
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'leave',
      targetId: id,
      meta: {
        previousData: leave,
        updatedData: updatedLeave
      }
    });
    
    res.json(updatedLeave);
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ message: 'Error updating leave request' });
  }
};

// Approve or reject a leave request
const approveRejectLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    console.log(`Attempting to ${status} leave request with ID: ${id}, notes: ${notes || 'none'}`);
    
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Status must be either "approved" or "rejected"' });
    }
    
    // Check if the leave request exists
    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        leaveType: true
      }
    });
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    console.log(`Found leave request: ${JSON.stringify(leave, null, 2)}`);
    
    // Check if user has permission to approve/reject
    if (req.user.permissions['leave.approve'] < 1) {
      return res.status(403).json({ message: 'You do not have permission to approve or reject leave requests' });
    }
    
    // Update leave request
    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status,
        approvedBy: req.user.id,
        notes: notes ? `${leave.notes || ''}\n\nManager note: ${notes}` : leave.notes
      }
    });
    
    console.log(`Leave request updated successfully: ${JSON.stringify(updatedLeave, null, 2)}`);
    
    // Try to send notification, but continue even if it fails
    try {
      // Add notification for the leave request owner
      const content = `📝 Twój wniosek urlopowy został ${status === 'approved' ? 'zatwierdzony ✅' : 'odrzucony ❌'}`;
      const link = '/leave';
      const notification = await prisma.notification.create({
        data: {
          userId: leave.userId,
          content,
          link,
          type: 'SYSTEM',
          createdById: req.user.id
        }
      });
      
      // Wyślij pełny obiekt powiadomienia do konkretnego użytkownika tylko jeśli socket.io jest dostępne
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${leave.userId}`)
          .emit(`notification:${leave.userId}`, notification);
      }
    } catch (notificationError) {
      // Log the notification error but continue with the approval process
      console.error('Error sending notification:', notificationError);
      // We don't return here, just log the error and continue
    }
    
    // Log the audit entry
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'leave',
      targetId: id,
      meta: {
        action: status === 'approved' ? 'approve' : 'reject',
        user: `${leave.user.firstName} ${leave.user.lastName}`,
        leaveType: leave.leaveType.name,
        startDate: leave.startDate,
        endDate: leave.endDate
      }
    });
    
    res.json({
      ...updatedLeave,
      message: `Leave request ${status === 'approved' ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error(`Error ${req.body.status === 'approved' ? 'approving' : 'rejecting'} leave request:`, error);
    
    // Provide more detailed error information
    let errorMessage = `Error ${req.body.status === 'approved' ? 'approving' : 'rejecting'} leave request`;
    
    if (error.code) {
      errorMessage += ` - Code: ${error.code}`;
    }
    
    if (error.meta) {
      errorMessage += ` - Details: ${JSON.stringify(error.meta)}`;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV !== 'production' ? error.toString() : undefined
    });
  }
};

// Delete a leave request
const deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the leave request exists
    const leave = await prisma.leave.findUnique({
      where: { id }
    });
    
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    // Check if user owns this leave request or has permission to delete
    const isOwner = leave.userId === req.user.id;
    const canDeleteAny = req.user.permissions['leave.delete'] >= 2;
    
    if (!isOwner && !canDeleteAny) {
      return res.status(403).json({ message: 'You do not have permission to delete this leave request' });
    }
    
    // If request is already approved/rejected, only admin/manager can delete it
    if ((leave.status === 'approved' || leave.status === 'rejected') && !canDeleteAny) {
      return res.status(400).json({ message: 'Cannot delete approved or rejected leave requests' });
    }
    
    await prisma.leave.delete({
      where: { id }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'leave',
      targetId: id,
      meta: { leave }
    });
    
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ message: 'Error deleting leave request' });
  }
};

// Get user's leave requests with pagination
const getUserLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { status, from, to } = req.query;
    const userId = req.params.userId || req.user.id;
    
    console.log(`Fetching leave requests for user ${userId} with status: ${status || 'all'}`);
    
    // Check permission if trying to access another user's leaves
    if (userId !== req.user.id && req.user.permissions['leave.viewAll'] < 1) {
      return res.status(403).json({ message: 'Access forbidden - insufficient permissions' });
    }
    
    const where = { userId };
    
    // Apply status filter
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      where.status = status;
      console.log(`Applying status filter: ${status}`);
    }
    
    // Apply date filters
    if (from || to) {
      where.OR = [
        // Start date in range
        {
          startDate: {}
        },
        // End date in range
        {
          endDate: {}
        }
      ];
      
      if (from) {
        where.OR[0].startDate.gte = new Date(from);
        where.OR[1].endDate.gte = new Date(from);
      }
      
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        where.OR[0].startDate.lte = toDate;
        where.OR[1].endDate.lte = toDate;
      }
    }
    
    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          leaveType: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          startDate: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.leave.count({ where })
    ]);
    
    res.json({
      leaves,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ message: 'Error fetching leave requests' });
  }
};

// Get all pending leave requests (for managers/admins)
const getPendingLeaves = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    console.log(`Fetching pending leave requests, page: ${page}, limit: ${limit}`);
    
    const where = { status: 'pending' };
    
    console.log(`Using where condition: ${JSON.stringify(where)}`);
    
    const [leaves, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        include: {
          leaveType: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        },
        skip,
        take: limit
      }),
      prisma.leave.count({ where })
    ]);
    
    console.log(`Found ${leaves.length} pending leave requests out of ${total} total`);
    
    if (leaves.length > 0) {
      console.log(`First pending leave: ${JSON.stringify(leaves[0], null, 2)}`);
    }
    
    res.json({
      leaves,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching pending leave requests:', error);
    res.status(500).json({ message: 'Error fetching pending leave requests' });
  }
};

module.exports = {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  requestLeave,
  updateLeaveRequest,
  approveRejectLeave,
  deleteLeaveRequest,
  getUserLeaves,
  getPendingLeaves
};