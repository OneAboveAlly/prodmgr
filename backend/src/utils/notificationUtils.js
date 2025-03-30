// 📁 backend/src/utils/notificationUtils.js
const sendNotification = async (io, prisma, userId, content, link = '/') => {
    const notification = await prisma.notification.create({
      data: {
        content,
        link,
        userId,
        isRead: false,
      },
    });
  
    io.to(`user:${userId}`).emit(`notification:${userId}`, notification);
    console.log(`💌 Notyfikacja wysłana do user:${userId}`, notification);
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
      // Zapisz do DB
      await prisma.notification.create({
        data: {
          userId: approver.id,
          content,
          link,
          type: 'SYSTEM'
        }
      });
  
      // Emituj do socket.io
      const record = await prisma.notification.create({
        data: {
          userId: approver.id,
          content,
          link,
          type: 'SYSTEM'
        }
      });
      
      io.to(`user:${approver.id}`).emit(`notification:${approver.id}`, record);
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
        '/time-tracking/reports'
      );
    }
  };
  
  module.exports = {
    sendNotification,
    notifyLeaveRequest,
    notifyLongSession,
  };
  