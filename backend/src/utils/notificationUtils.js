// 📁 backend/src/utils/notificationUtils.js
const sendNotification = async (io, prisma, userId, content, link = '/', createdById = null, type = 'SYSTEM', metadata = null) => {
  try {
    // Validate required fields
    if (!userId || !content) {
      console.error('Missing required fields for notification:', { userId, content });
      return null;
    }

    // Create the notification with createdById field and type
    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        link,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null,
        isRead: false,
        createdById: createdById || userId // Fall back to userId if no creator specified
      }
    });

    // Emit socket event if io is available
    if (io) {
      io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
    }

    return notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
};

// Wersja funkcji dla powiadomień produkcyjnych
const sendProductionNotification = async (io, prisma, userId, content, link, productionType, createdById = null) => {
  return sendNotification(
    io, 
    prisma, 
    userId, 
    content, 
    link, 
    createdById, 
    'PRODUCTION', 
    { productionType }
  );
};

// 🔔 Powiadomienie o wniosku urlopowym
const notifyLeaveRequest = async (io, prisma, leave) => {
  const approvers = await prisma.user.findMany({
    where: {
      userRoles: {
        some: {
          role: {
            rolePermissions: {
              some: {
                permission: {
                  module: 'leave',
                  action: 'approve'
                },
                value: {
                  gte: 1
                }
              }
            }
          }
        }
      }
    },
    select: {
      id: true
    }
  });

  const content = `💼 Nowy wniosek urlopowy od ${leave.user.firstName} ${leave.user.lastName}`;
  const link = '/leave';

  for (const approver of approvers) {
    // Emituj do socket.io i zapisz w DB
    await sendNotification(
      io,
      prisma,
      approver.id,
      content,
      link,
      leave.userId,
      'LEAVE'
    );
  }
};

// 🔔 Powiadomienie o długiej sesji pracy (np. > 12h)
const notifyLongSession = async (io, prisma, session) => {
  if (!session.totalDuration || session.totalDuration < 12 * 3600) return;

  const admins = await prisma.user.findMany({
    where: {
      permissions: {
        path: ['timeTracking', 'viewAll'],
        gte: 1,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  for (const admin of admins) {
    await sendNotification(
      io,
      prisma,
      admin.id,
      `${user.firstName} ${user.lastName} pracował ponad 12h w jednej sesji`,
      '/time-tracking/reports',
      session.userId,
      'SYSTEM'
    );
  }
};

module.exports = {
  sendNotification,
  sendProductionNotification,
  notifyLeaveRequest,
  notifyLongSession,
};
