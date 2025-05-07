const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const { sendNotification } = require('../utils/notificationUtils');

const prisma = new PrismaClient();

/**
 * Create a new production schedule
 */
const createSchedule = async (req, res) => {
  try {
    const { name, description, startDate, endDate, assignments } = req.body;
    
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Schedule name, start date, and end date are required' });
    }
    
    // Create schedule
    const schedule = await prisma.productionSchedule.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: req.user.id
      }
    });
    
    // Create assignments if provided
    if (assignments && Array.isArray(assignments) && assignments.length > 0) {
      const assignmentData = assignments.map(assignment => ({
        scheduleId: schedule.id,
        userId: assignment.userId,
        guideId: assignment.guideId,
        stepId: assignment.stepId,
        startDate: new Date(assignment.startDate),
        endDate: new Date(assignment.endDate),
        notes: assignment.notes,
        status: 'SCHEDULED'
      }));
      
      await prisma.scheduleAssignment.createMany({
        data: assignmentData
      });
      
      // Send notifications to assigned users
      for (const assignment of assignments) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          assignment.userId,
          `You have been assigned to the production schedule: ${name}`,
          `/production/schedule/${schedule.id}`
        );
      }
    }
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'production-schedule',
      targetId: schedule.id,
      meta: { 
        name, 
        description, 
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      }
    });
    
    res.status(201).json({
      schedule,
      message: 'Production schedule created successfully'
    });
  } catch (error) {
    console.error('Error creating production schedule:', error);
    res.status(500).json({ message: 'Error creating production schedule' });
  }
};

/**
 * Get all production schedules with filtering and pagination
 */
const getAllSchedules = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering
    const { isActive, from, to, search } = req.query;
    const where = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (from || to) {
      where.OR = [
        {
          startDate: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) })
          }
        },
        {
          endDate: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) })
          }
        }
      ];
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const [schedules, total] = await Promise.all([
      prisma.productionSchedule.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true }
          },
          assignments: {
            take: 5, // Just get a sample for the list view
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          },
          _count: {
            select: { assignments: true }
          }
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit
      }),
      prisma.productionSchedule.count({ where })
    ]);
    
    res.json({
      schedules,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching production schedules:', error);
    res.status(500).json({ message: 'Error fetching production schedules' });
  }
};

/**
 * Get schedule details by ID
 */
const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const schedule = await prisma.productionSchedule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        assignments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true }
            },
            guide: {
              select: { id: true, title: true, barcode: true, priority: true }
            },
            step: {
              select: { id: true, title: true }
            }
          },
          orderBy: { startDate: 'asc' }
        }
      }
    });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Production schedule not found' });
    }
    
    // Log access
    await logAudit({
      userId: req.user.id,
      action: 'view',
      module: 'production-schedule',
      targetId: id,
      meta: { scheduleName: schedule.name }
    });
    
    res.json({ schedule });
  } catch (error) {
    console.error('Error fetching production schedule:', error);
    res.status(500).json({ message: 'Error fetching production schedule details' });
  }
};

/**
 * Update a production schedule
 */
const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, startDate, endDate, isActive } = req.body;
    
    const existingSchedule = await prisma.productionSchedule.findUnique({
      where: { id }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({ message: 'Production schedule not found' });
    }
    
    const updatedSchedule = await prisma.productionSchedule.update({
      where: { id },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'production-schedule',
      targetId: id,
      meta: { 
        name, 
        description, 
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        isActive
      }
    });
    
    res.json({
      schedule: updatedSchedule,
      message: 'Production schedule updated successfully'
    });
  } catch (error) {
    console.error('Error updating production schedule:', error);
    res.status(500).json({ message: 'Error updating production schedule' });
  }
};

/**
 * Delete a production schedule
 */
const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingSchedule = await prisma.productionSchedule.findUnique({
      where: { id },
      include: {
        assignments: { select: { id: true } }
      }
    });
    
    if (!existingSchedule) {
      return res.status(404).json({ message: 'Production schedule not found' });
    }
    
    // Delete all associated assignments first
    if (existingSchedule.assignments.length > 0) {
      await prisma.scheduleAssignment.deleteMany({
        where: { scheduleId: id }
      });
    }
    
    // Delete the schedule
    await prisma.productionSchedule.delete({
      where: { id }
    });
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'production-schedule',
      targetId: id,
      meta: { scheduleName: existingSchedule.name }
    });
    
    res.json({ message: 'Production schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting production schedule:', error);
    res.status(500).json({ message: 'Error deleting production schedule' });
  }
};

/**
 * Add an assignment to a schedule
 */
const addScheduleAssignment = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { userId, guideId, stepId, startDate, endDate, notes } = req.body;
    
    if (!userId || !startDate || !endDate) {
      return res.status(400).json({ message: 'User ID, start date, and end date are required' });
    }
    
    // Check if schedule exists
    const schedule = await prisma.productionSchedule.findUnique({
      where: { id: scheduleId }
    });
    
    if (!schedule) {
      return res.status(404).json({ message: 'Production schedule not found' });
    }
    
    // Create the assignment
    const assignment = await prisma.scheduleAssignment.create({
      data: {
        scheduleId,
        userId,
        guideId,
        stepId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        status: 'SCHEDULED'
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        guide: {
          select: { id: true, title: true, barcode: true }
        },
        step: {
          select: { id: true, title: true }
        }
      }
    });
    
    // Send notification to assigned user
    await sendNotification(
      req.app.get('io'),
      prisma,
      userId,
      `You have been assigned to the production schedule: ${schedule.name}`,
      `/production/schedule/${scheduleId}`
    );
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'schedule-assignment',
      targetId: assignment.id,
      meta: { 
        scheduleId,
        scheduleName: schedule.name,
        userId,
        guideId,
        stepId,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString()
      }
    });
    
    res.status(201).json({
      assignment,
      message: 'Schedule assignment created successfully'
    });
  } catch (error) {
    console.error('Error creating schedule assignment:', error);
    res.status(500).json({ message: 'Error creating schedule assignment' });
  }
};

/**
 * Update a schedule assignment
 */
const updateScheduleAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, status, notes } = req.body;
    
    const existingAssignment = await prisma.scheduleAssignment.findUnique({
      where: { id },
      include: {
        schedule: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!existingAssignment) {
      return res.status(404).json({ message: 'Schedule assignment not found' });
    }
    
    const updatedAssignment = await prisma.scheduleAssignment.update({
      where: { id },
      data: {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        notes
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        guide: {
          select: { id: true, title: true, barcode: true }
        },
        step: {
          select: { id: true, title: true }
        }
      }
    });
    
    // If status changed to COMPLETED, send notification
    if (status === 'COMPLETED' && existingAssignment.status !== 'COMPLETED') {
      // Notify the schedule creator
      const schedule = await prisma.productionSchedule.findUnique({
        where: { id: existingAssignment.scheduleId },
        select: { createdById: true }
      });
      
      if (schedule) {
        await sendNotification(
          req.app.get('io'),
          prisma,
          schedule.createdById,
          `Assignment in schedule "${existingAssignment.schedule.name}" has been marked as completed`,
          `/production/schedule/${existingAssignment.scheduleId}`
        );
      }
    }
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'schedule-assignment',
      targetId: id,
      meta: { 
        scheduleId: existingAssignment.scheduleId,
        scheduleName: existingAssignment.schedule.name,
        status,
        previousStatus: existingAssignment.status,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined
      }
    });
    
    res.json({
      assignment: updatedAssignment,
      message: 'Schedule assignment updated successfully'
    });
  } catch (error) {
    console.error('Error updating schedule assignment:', error);
    res.status(500).json({ message: 'Error updating schedule assignment' });
  }
};

/**
 * Delete a schedule assignment
 */
const deleteScheduleAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const existingAssignment = await prisma.scheduleAssignment.findUnique({
      where: { id },
      include: {
        schedule: {
          select: { id: true, name: true }
        },
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    
    if (!existingAssignment) {
      return res.status(404).json({ message: 'Schedule assignment not found' });
    }
    
    await prisma.scheduleAssignment.delete({
      where: { id }
    });
    
    // Notify the user about the removal
    await sendNotification(
      req.app.get('io'),
      prisma,
      existingAssignment.userId,
      `Your assignment in schedule "${existingAssignment.schedule.name}" has been removed`,
      `/production/schedule/${existingAssignment.scheduleId}`
    );
    
    // Log the action
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'schedule-assignment',
      targetId: id,
      meta: { 
        scheduleId: existingAssignment.scheduleId,
        scheduleName: existingAssignment.schedule.name,
        userId: existingAssignment.userId,
        userName: `${existingAssignment.user.firstName} ${existingAssignment.user.lastName}`
      }
    });
    
    res.json({ message: 'Schedule assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule assignment:', error);
    res.status(500).json({ message: 'Error deleting schedule assignment' });
  }
};

/**
 * Get user's schedule
 */
const getUserSchedule = async (req, res) => {
  try {
    const { userId } = req.params;
    const { from, to } = req.query;
    
    const targetUserId = userId || req.user.id;
    const startDate = from ? new Date(from) : new Date();
    const endDate = to ? new Date(to) : new Date(startDate);
    
    // Set end date to 30 days after start date if not specified
    if (!to) {
      endDate.setDate(startDate.getDate() + 30);
    }
    
    const assignments = await prisma.scheduleAssignment.findMany({
      where: {
        userId: targetUserId,
        startDate: {
          lte: endDate
        },
        endDate: {
          gte: startDate
        }
      },
      include: {
        schedule: true,
        guide: {
          select: { id: true, title: true, barcode: true, priority: true }
        },
        step: {
          select: { id: true, title: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching user schedule:', error);
    res.status(500).json({ message: 'Error fetching user schedule' });
  }
};

/**
 * Get schedule for a production guide
 */
const getGuideSchedule = async (req, res) => {
  try {
    const { guideId } = req.params;
    
    const assignments = await prisma.scheduleAssignment.findMany({
      where: { guideId },
      include: {
        schedule: true,
        user: {
          select: { id: true, firstName: true, lastName: true }
        },
        step: {
          select: { id: true, title: true }
        }
      },
      orderBy: { startDate: 'asc' }
    });
    
    res.json({ assignments });
  } catch (error) {
    console.error('Error fetching guide schedule:', error);
    res.status(500).json({ message: 'Error fetching guide schedule' });
  }
};

module.exports = {
  createSchedule,
  getAllSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  addScheduleAssignment,
  updateScheduleAssignment,
  deleteScheduleAssignment,
  getUserSchedule,
  getGuideSchedule
}; 