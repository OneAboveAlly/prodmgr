// backend/src/controllers/timeTracking.controller.js
const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');

const prisma = new PrismaClient();

// Get time tracking settings
const getSettings = async (req, res) => {
  try {
    let settings = await prisma.timeTrackingSettings.findFirst();
    
    // Create default settings if none exist
    if (!settings) {
      settings = await prisma.timeTrackingSettings.create({
        data: {
          enableBreakButton: true,
          minSessionDuration: 0,
          maxSessionDuration: 720, // 12 hours
          maxBreakDuration: 60 // 1 hour
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching time tracking settings:', error);
    res.status(500).json({ message: 'Error fetching time tracking settings' });
  }
};

// Update time tracking settings
const updateSettings = async (req, res) => {
  try {
    const { enableBreakButton, minSessionDuration, maxSessionDuration, maxBreakDuration } = req.body;
    
    let settings = await prisma.timeTrackingSettings.findFirst();
    
    if (settings) {
      settings = await prisma.timeTrackingSettings.update({
        where: { id: settings.id },
        data: {
          enableBreakButton,
          minSessionDuration: parseInt(minSessionDuration),
          maxSessionDuration: parseInt(maxSessionDuration),
          maxBreakDuration: parseInt(maxBreakDuration)
        }
      });
    } else {
      settings = await prisma.timeTrackingSettings.create({
        data: {
          enableBreakButton,
          minSessionDuration: parseInt(minSessionDuration),
          maxSessionDuration: parseInt(maxSessionDuration),
          maxBreakDuration: parseInt(maxBreakDuration)
        }
      });
    }
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'timeTracking',
      targetId: settings.id,
      meta: { settings }
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error updating time tracking settings:', error);
    res.status(500).json({ message: 'Error updating time tracking settings' });
  }
};

// Start a work session
const startSession = async (req, res) => {
  try {
    // Check if there's an active session already
    const activeSession = await prisma.workSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });
    
    if (activeSession) {
      return res.status(400).json({ message: 'You already have an active work session' });
    }
    
    // Create a new session with notes
    const session = await prisma.workSession.create({
      data: {
        userId: req.user.id,
        startTime: new Date(),
        status: 'active',
        notes: req.body.notes || null // Add notes from request
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'timeTracking',
      targetId: session.id,
      meta: { 
        action: 'startSession',
        notes: req.body.notes ? 'Added' : 'None'
      }
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting work session:', error);
    res.status(500).json({ message: 'Error starting work session' });
  }
};

// End a work session
const endSession = async (req, res) => {
  try {
    // Find active session
    const activeSession = await prisma.workSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: {
        breaks: {
          where: {
            status: 'active'
          }
        }
      }
    });
    
    if (!activeSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }
    
    const now = new Date();
    const endTime = now;
    
    // If there's an active break, end it first
    if (activeSession.breaks.length > 0) {
      const activeBreak = activeSession.breaks[0];
      const breakDuration = Math.floor((now - new Date(activeBreak.startTime)) / 1000);
      
      await prisma.break.update({
        where: { id: activeBreak.id },
        data: {
          endTime: now,
          duration: breakDuration,
          status: 'completed'
        }
      });
    }
    
    // Calculate total duration excluding breaks
    const totalBreakDuration = await calculateBreakDuration(activeSession.id);
    const sessionDuration = Math.floor((now - new Date(activeSession.startTime)) / 1000) - totalBreakDuration;
    
    // Update session with notes if provided
    const updatedSession = await prisma.workSession.update({
      where: { id: activeSession.id },
      data: {
        endTime,
        totalDuration: sessionDuration,
        status: 'completed',
        notes: req.body.notes || activeSession.notes // Update notes if provided, otherwise keep existing
      },
      include: {
        breaks: true
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'timeTracking',
      targetId: updatedSession.id,
      meta: { 
        action: 'endSession',
        duration: sessionDuration,
        totalBreakDuration,
        notesUpdated: req.body.notes ? true : false
      }
    });
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Error ending work session:', error);
    res.status(500).json({ message: 'Error ending work session' });
  }
};

// Start a break
const startBreak = async (req, res) => {
  try {
    // Find active session
    const activeSession = await prisma.workSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: {
        breaks: {
          where: {
            status: 'active'
          }
        }
      }
    });
    
    if (!activeSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }
    
    // Check if there's already an active break
    if (activeSession.breaks.length > 0) {
      return res.status(400).json({ message: 'You already have an active break' });
    }
    
    // Create a new break
    const newBreak = await prisma.break.create({
      data: {
        sessionId: activeSession.id,
        startTime: new Date(),
        status: 'active'
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'timeTracking',
      targetId: newBreak.id,
      meta: { 
        action: 'startBreak',
        sessionId: activeSession.id
      }
    });
    
    res.status(201).json(newBreak);
  } catch (error) {
    console.error('Error starting break:', error);
    res.status(500).json({ message: 'Error starting break' });
  }
};

// End a break
const endBreak = async (req, res) => {
  try {
    // Find active session and its active break
    const activeSession = await prisma.workSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: {
        breaks: {
          where: {
            status: 'active'
          }
        }
      }
    });
    
    if (!activeSession) {
      return res.status(400).json({ message: 'No active work session found' });
    }
    
    if (activeSession.breaks.length === 0) {
      return res.status(400).json({ message: 'No active break found' });
    }
    
    const activeBreak = activeSession.breaks[0];
    const now = new Date();
    const breakDuration = Math.floor((now - new Date(activeBreak.startTime)) / 1000);
    
    // Update the break
    const updatedBreak = await prisma.break.update({
      where: { id: activeBreak.id },
      data: {
        endTime: now,
        duration: breakDuration,
        status: 'completed'
      }
    });
    
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'timeTracking',
      targetId: updatedBreak.id,
      meta: { 
        action: 'endBreak',
        sessionId: activeSession.id,
        duration: breakDuration
      }
    });
    
    res.json(updatedBreak);
  } catch (error) {
    console.error('Error ending break:', error);
    res.status(500).json({ message: 'Error ending break' });
  }
};

// Get current active session for the user
const getCurrentSession = async (req, res) => {
  try {
    const session = await prisma.workSession.findFirst({
      where: {
        userId: req.user.id,
        status: 'active'
      },
      include: {
        breaks: {
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });
    
    res.json(session || null);
  } catch (error) {
    console.error('Error fetching current session:', error);
    res.status(500).json({ message: 'Error fetching current session' });
  }
};

// Get user's past sessions with pagination
const getUserSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const { from, to } = req.query;
    const userId = req.params.userId || req.user.id;
    
    // Check permission if trying to access another user's sessions
    if (userId !== req.user.id && !req.user.permissions['timeTracking.viewAll']) {
      return res.status(403).json({ message: 'Access forbidden - insufficient permissions' });
    }
    
    const where = { userId };
    
    // Apply date filters
    if (from || to) {
      where.startTime = {};
      if (from) where.startTime.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        where.startTime.lte = toDate;
      }
    }
    
    const [sessions, total] = await Promise.all([
      prisma.workSession.findMany({
        where,
        include: {
          breaks: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.workSession.count({ where })
    ]);
    
    // Calculate the stats for the period
    let totalWorkDuration = 0;
    let totalBreakDuration = 0;
    
    sessions.forEach(session => {
      if (session.totalDuration) {
        totalWorkDuration += session.totalDuration;
      }
      
      session.breaks.forEach(breakItem => {
        if (breakItem.duration) {
          totalBreakDuration += breakItem.duration;
        }
      });
    });
    
    res.json({
      sessions,
      stats: {
        totalWorkDuration,
        totalBreakDuration,
        totalSessions: total
      },
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user sessions:', error);
    res.status(500).json({ message: 'Error fetching user sessions' });
  }
};

// Get daily summaries for calendar view
const getDailySummaries = async (req, res) => {
  try {
    const { year, month, userId } = req.query;
    const targetUserId = userId || req.user.id;
    
    // Check permission if trying to access another user's data
    if (targetUserId !== req.user.id && !req.user.permissions['timeTracking.viewAll']) {
      return res.status(403).json({ message: 'Access forbidden - insufficient permissions' });
    }
    
    // Calculate start and end date for the month
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    // Get all sessions in the month
    const sessions = await prisma.workSession.findMany({
      where: {
        userId: targetUserId,
        startTime: {
          gte: startDate,
          lte: endDate
        },
        status: 'completed'
      },
      include: {
        breaks: {
          where: {
            status: 'completed'
          }
        }
      }
    });
    
    // Group by day and calculate daily durations
    const dailySummaries = {};
    
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      
      if (!dailySummaries[date]) {
        dailySummaries[date] = {
          date,
          workDuration: 0,
          breakDuration: 0,
          sessionCount: 0
        };
      }
      
      if (session.totalDuration) {
        dailySummaries[date].workDuration += session.totalDuration;
      }
      
      session.breaks.forEach(breakItem => {
        if (breakItem.duration) {
          dailySummaries[date].breakDuration += breakItem.duration;
        }
      });
      
      dailySummaries[date].sessionCount += 1;
    });
    
    // Collect leave information for the month
    const leaves = await prisma.leave.findMany({
      where: {
        userId: targetUserId,
        OR: [
          {
            startDate: {
              gte: startDate,
              lte: endDate
            }
          },
          {
            endDate: {
              gte: startDate,
              lte: endDate
            }
          }
        ],
        status: 'approved'
      },
      include: {
        leaveType: true
      }
    });
    
    // Add leave information to daily summaries
    leaves.forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      // For each day in the leave period
      for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
        const date = day.toISOString().split('T')[0];
        
        if (!dailySummaries[date]) {
          dailySummaries[date] = {
            date,
            workDuration: 0,
            breakDuration: 0,
            sessionCount: 0,
            leaves: []
          };
        }
        
        if (!dailySummaries[date].leaves) {
          dailySummaries[date].leaves = [];
        }
        
        // Add leave information
        dailySummaries[date].leaves.push({
          id: leave.id,
          type: leave.leaveType.name,
          halfDay: leave.halfDay,
          morning: leave.morning,
          color: leave.leaveType.color
        });
      }
    });
    
    res.json(Object.values(dailySummaries));
  } catch (error) {
    console.error('Error fetching daily summaries:', error);
    res.status(500).json({ message: 'Error fetching daily summaries' });
  }
};

// Get all active sessions (for admin/manager view)
const getAllActiveSessions = async (req, res) => {
  try {
    // Check if user has permission to view all sessions
    if (!req.user.permissions['timeTracking.viewAll']) {
      return res.status(403).json({ 
        message: 'Access forbidden - insufficient permissions'
      });
    }
    
    // Extract filters from query parameters
    const { from, to, searchTerm } = req.query;
    
    // Build the base query
    const query = {
      where: {
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            login: true
          }
        },
        breaks: {
          where: {
            status: 'active'
          }
        }
      }
    };
    
    // Apply date filters if provided
    if (from || to) {
      query.where.startTime = {};
      
      if (from) {
        query.where.startTime.gte = new Date(from);
      }
      
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // End of the day
        query.where.startTime.lte = toDate;
      }
    }
    
    // Get active sessions with applied filters
    let activeSessions = await prisma.workSession.findMany(query);
    
    // Apply search term filter in memory (because it spans related user fields)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      activeSessions = activeSessions.filter(session => {
        const user = session.user;
        const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
        const email = user.email.toLowerCase();
        const login = user.login ? user.login.toLowerCase() : '';
        
        return fullName.includes(term) || 
               email.includes(term) || 
               login.includes(term);
      });
    }
    
    // Format response
    const formattedSessions = activeSessions.map(session => ({
      id: session.id,
      userId: session.userId,
      startTime: session.startTime,
      user: {
        id: session.user.id,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        email: session.user.email,
        login: session.user.login
      },
      onBreak: session.breaks.length > 0,
      breakStartTime: session.breaks[0]?.startTime || null,
      notes: session.notes
    }));
    
    res.json(formattedSessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ message: 'Error fetching active sessions' });
  }
};

// Get report data for specified users and date range
const getReport = async (req, res) => {
  try {
    const { userIds, startDate, endDate } = req.body;
    
    // Validate input
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'At least one user ID is required' });
    }
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }
    
    // Check permission for viewing all users' data
    if (userIds.some(id => id !== req.user.id) && !req.user.permissions['timeTracking.viewAll']) {
      return res.status(403).json({ message: 'Access forbidden - insufficient permissions' });
    }
    
    // Parse dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Get users info
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    });
    
    // Get sessions for the specified users and date range
    const sessions = await prisma.workSession.findMany({
      where: {
        userId: {
          in: userIds
        },
        startTime: {
          gte: start,
          lte: end
        },
        status: 'completed'
      },
      include: {
        breaks: {
          where: {
            status: 'completed'
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });
    
    // Get leaves for the specified users and date range
    const leaves = await prisma.leave.findMany({
      where: {
        userId: {
          in: userIds
        },
        OR: [
          {
            startDate: {
              gte: start,
              lte: end
            }
          },
          {
            endDate: {
              gte: start,
              lte: end
            }
          }
        ],
        status: 'approved'
      },
      include: {
        leaveType: true
      }
    });
    
    // Organize data by user and date
    const reportData = {};
    
    // Initialize user reports
    users.forEach(user => {
      reportData[user.id] = {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        totalWorkDuration: 0,
        totalBreakDuration: 0,
        dailyData: {},
        leaves: []
      };
    });
    
    // Process sessions
    sessions.forEach(session => {
      const userId = session.userId;
      const date = new Date(session.startTime).toISOString().split('T')[0];
      
      // Ensure daily record exists
      if (!reportData[userId].dailyData[date]) {
        reportData[userId].dailyData[date] = {
          date,
          workDuration: 0,
          breakDuration: 0,
          sessions: []
        };
      }
      
      // Calculate break duration
      let sessionBreakDuration = 0;
      session.breaks.forEach(breakItem => {
        if (breakItem.duration) {
          sessionBreakDuration += breakItem.duration;
          reportData[userId].totalBreakDuration += breakItem.duration;
          reportData[userId].dailyData[date].breakDuration += breakItem.duration;
        }
      });
      
      // Add session data
      if (session.totalDuration) {
        reportData[userId].totalWorkDuration += session.totalDuration;
        reportData[userId].dailyData[date].workDuration += session.totalDuration;
      }
      
      // Add detailed session info
      reportData[userId].dailyData[date].sessions.push({
        id: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.totalDuration,
        notes: session.notes, // Include notes in report
        breaks: session.breaks.map(breakItem => ({
          id: breakItem.id,
          startTime: breakItem.startTime,
          endTime: breakItem.endTime,
          duration: breakItem.duration
        }))
      });
    });
    
    // Process leaves
    leaves.forEach(leave => {
      const userId = leave.userId;
      if (!reportData[userId]) return; // Skip if user not in report
      
      reportData[userId].leaves.push({
        id: leave.id,
        type: leave.leaveType.name,
        startDate: leave.startDate,
        endDate: leave.endDate,
        halfDay: leave.halfDay,
        morning: leave.morning,
        color: leave.leaveType.color
      });
    });
    
    // Convert to array for response
    const result = Object.values(reportData).map(userData => {
      // Convert dailyData object to array
      userData.dailyData = Object.values(userData.dailyData);
      return userData;
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
};

// Update session notes by ID
const updateSessionNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const session = await prisma.workSession.findUnique({
      where: { id }
    });
    if (!session) {
      return res.status(404).json({ message: 'Work session not found' });
    }
    // Sprawdź uprawnienia - czy to właściciel sesji albo ma dostęp do wszystkich
    const isOwner = session.userId === req.user.id;
    const canEditAny = req.user.permissions['timeTracking.update'] >= 2;
    if (!isOwner && !canEditAny) {
      return res.status(403).json({ message: 'Brak uprawnień do edycji tej sesji' });
    }
    const updated = await prisma.workSession.update({
      where: { id },
      data: { notes }
    });
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'timeTracking',
      targetId: id,
      meta: {
        action: 'updateSessionNotes',
        notes
      }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating session notes:', error);
    res.status(500).json({ message: 'Błąd aktualizacji notatek' });
  }
};

// Helper function to calculate total break duration for a session
const calculateBreakDuration = async (sessionId) => {
  const breaks = await prisma.break.findMany({
    where: {
      sessionId,
      status: 'completed'
    }
  });
  
  return breaks.reduce((total, breakItem) => total + (breakItem.duration || 0), 0);
};

module.exports = {
  getSettings,
  updateSettings,
  startSession,
  endSession,
  startBreak,
  endBreak,
  getCurrentSession,
  getUserSessions,
  getDailySummaries,
  getReport,
  updateSessionNotes,
  getAllActiveSessions
};