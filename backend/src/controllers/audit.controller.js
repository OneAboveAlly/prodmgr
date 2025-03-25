const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { status, user, from, to } = req.query;

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

module.exports = { getAuditLogs };
