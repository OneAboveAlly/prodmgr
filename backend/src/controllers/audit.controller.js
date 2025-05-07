const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get audit logs with enhanced filtering for production management
const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, user, from, to, module, action, targetId } = req.query;

    const where = {};

    // Filtrowanie po statusie w meta
    if (status === 'active') {
      where.meta = { path: ['status'], equals: 'working' };
    } else if (status === 'inactive') {
      where.meta = { path: ['status'], equals: 'idle' };
    }

    // Filtrowanie po nazwie użytkownika (imię lub nazwisko)
    if (user) {
      where.user = {
        OR: [
          { firstName: { contains: user, mode: 'insensitive' } },
          { lastName: { contains: user, mode: 'insensitive' } }
        ]
      };
    }

    // Filtrowanie po dacie
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Filter by module (e.g., 'production', 'inventory')
    if (module) {
      where.module = module;
    }

    // Filter by action (e.g., 'create', 'update', 'delete')
    if (action) {
      where.action = action;
    }

    // Filter by target ID (specific guide or inventory item)
    if (targetId) {
      where.targetId = targetId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};

// Get detailed audit history for a specific production guide
const getProductionGuideAuditLogs = async (req, res) => {
  try {
    const { guideId } = req.params;
    
    const logs = await prisma.auditLog.findMany({
      where: {
        module: 'production',
        targetId: guideId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });
    
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching production guide audit logs:', error);
    res.status(500).json({ message: 'Error fetching production guide audit logs' });
  }
};

// Get audit statistics for production activities
const getProductionAuditStats = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const where = {
      module: 'production'
    };
    
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    
    // Count actions by type
    const actionCounts = await prisma.$queryRaw`
      SELECT action, COUNT(*) as count 
      FROM "AuditLog" 
      WHERE module = 'production' 
      ${from ? `AND "createdAt" >= ${new Date(from)}` : ''}
      ${to ? `AND "createdAt" <= ${new Date(to)}` : ''}
      GROUP BY action
    `;
    
    // Get top 5 most active users in production
    const activeUsers = await prisma.$queryRaw`
      SELECT u."firstName", u."lastName", COUNT(*) as count
      FROM "AuditLog" a
      JOIN "User" u ON a."userId" = u.id
      WHERE a.module = 'production'
      ${from ? `AND a."createdAt" >= ${new Date(from)}` : ''}
      ${to ? `AND a."createdAt" <= ${new Date(to)}` : ''}
      GROUP BY u.id, u."firstName", u."lastName"
      ORDER BY count DESC
      LIMIT 5
    `;
    
    res.json({
      actionCounts,
      activeUsers
    });
  } catch (error) {
    console.error('Error fetching production audit stats:', error);
    res.status(500).json({ message: 'Error fetching production audit statistics' });
  }
};

// New function to track user access to production guides
const logGuideAccess = async (req, res, next) => {
  try {
    const { guideId } = req.params;
    
    if (!guideId) {
      return next();
    }
    
    await prisma.guideAccessLog.create({
      data: {
        guideId,
        userId: req.user.id
      }
    });
    
    next();
  } catch (error) {
    console.error('Error logging guide access:', error);
    // Continue with the request even if logging fails
    next();
  }
};

module.exports = { 
  getAuditLogs,
  getProductionGuideAuditLogs,
  getProductionAuditStats,
  logGuideAccess
};
