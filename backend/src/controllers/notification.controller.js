const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getUserNotifications = async (req, res) => {
  const userId = req.user.id;

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      archived: false, // ✅ pokazuj tylko aktywne
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  res.json({ notifications });
};

// ✅ nowy endpoint - pełna historia
exports.getAllUserNotifications = async (req, res) => {
  const userId = req.user.id;

  const notifications = await prisma.notification.findMany({
    where: {
      userId
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json({ notifications });
};

const getNotificationHistory = async (req, res) => {
  const userId = req.user.id;
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Błąd historii powiadomień' });
  }
};

exports.archiveAllNotifications = async (req, res) => {
  const { userId } = req.params;
  try {
    await prisma.notification.updateMany({
      where: { userId, archived: false },
      data: { archived: true }
    });

    res.json({ message: 'Wszystkie powiadomienia zarchiwizowane' });
  } catch (error) {
    console.error('❌ Błąd archiwizacji:', error);
    res.status(500).json({ message: 'Błąd archiwizacji' });
  }
};

exports.markAsRead = async (req, res) => {
  const notificationId = req.params.id;

  try {
    const updated = await prisma.notification.updateMany({
      where: { id: notificationId },
      data: { isRead: true },
    });

    if (updated.count === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.createNotification = async (req, res) => {
  const { userId, content, link, type = 'SYSTEM' } = req.body;

  const notification = await prisma.notification.create({
    data: {
      userId,
      content,
      link,
      type,
      createdById: req.user.id, // 🧠 DODANO
    },
  });

  res.status(201).json(notification);
};

exports.sendManualNotification = async (req, res) => {
  const { userId, content, link = '/dashboard' } = req.body;
  const io = req.app.get('io');

  if (!userId || !content) {
    return res.status(400).json({ message: 'Missing userId or content' });
  }

  try {
    console.log('💌 Nowa notyfikacja dla:', userId, content);

    const notification = await prisma.notification.create({
      data: {
        userId,
        content,
        link,
        type: 'SYSTEM',
        createdById: req.user.id, // 🧠 DODANO
      },
    });

    io.emit(`notification:${userId}`, notification);

    res.status(201).json(notification);
  } catch (err) {
    console.error('Manual notification error:', err);
    res.status(500).json({ message: 'Błąd wysyłania powiadomienia' });
  }
};

exports.markAllAsRead = async (req, res) => {
  const { userId } = req.params;

  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  res.json({ success: true });
};

exports.testNotification = async (req, res) => {
  const { userId } = req.params;
  const io = req.app.get('io');

  const newNotification = await prisma.notification.create({
    data: {
      userId,
      content: '🔔 To jest testowe powiadomienie',
      link: '/dashboard',
      type: 'SYSTEM',
      createdById: req.user.id, // 🧠 DODANO
    },
  });

  io.emit(`notification:${userId}`, newNotification);

  res.json(newNotification);
};

exports.archiveAll = async (req, res) => {
  const userId = req.params.userId;

  await prisma.notification.updateMany({
    where: { userId },
    data: { archived: true }
  });

  res.json({ message: 'Notifications archived' });
};

// ✅ Pełna historia – wszystko (przeczytane i zarchiwizowane)
exports.getNotificationHistory = async (req, res) => {
  const userId = req.user.id;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Błąd historii powiadomień' });
  }
};

// ✅ Archiwizuj pojedyncze powiadomienie (do przycisku "Archiwizuj")
exports.archiveSingle = async (req, res) => {
  const id = req.params.id;

  try {
    const updated = await prisma.notification.update({
      where: { id },
      data: { archived: true }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Błąd archiwizacji powiadomienia' });
  }
};

// 🔥 Nowa funkcja do zaplanowania powiadomienia
exports.scheduleNotification = async (req, res) => {
  const { userIds, content, link, type = 'SYSTEM', scheduledAt, sendNow } = req.body;
  const io = req.app.get('io');

  if (!userIds || !content || !link) {
    return res.status(400).json({ message: 'Brakuje wymaganych danych' });
  }

  try {
    const now = new Date();
    const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
    const immediate = sendNow || !scheduledDate || scheduledDate <= now;

    const created = await Promise.all(
      userIds.map(async (userId) => {
        const n = await prisma.notification.create({
          data: {
            userId,
            content,
            link,
            type,
            scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
            isSent: immediate,
            createdById: req.user.id
          },
        });

        if (immediate) {
          io.emit(`notification:${userId}`, n); // <== DZWONECZEK 🔔
        }

        return n;
      })
    );

    res.status(201).json({ notifications: created });
  } catch (err) {
    console.error('❌ Błąd przy zapisie powiadomień:', err);
    res.status(500).json({ message: 'Błąd zapisu' });
  }
};

// 🔁 Cron - wysyłka zaplanowanych powiadomień
exports.dispatchScheduledNotifications = async (io) => {
  const now = new Date();
  const pending = await prisma.notification.findMany({
    where: {
      scheduledAt: {
        lte: now,
      },
      isSent: false,
    },
  });
  for (const n of pending) {
    io.emit(`notification:${n.userId}`, n);
    await prisma.notification.update({
      where: { id: n.id },
      data: { isSent: true },
    });
  }
};

exports.getScheduledNotifications = async (req, res) => {
  const userId = req.user.id;

  try {
    const now = new Date();

    const scheduled = await prisma.notification.findMany({
      where: {
        createdById: userId, // 🔐 tylko powiadomienia które ja utworzyłem
        isSent: false,
        scheduledAt: {
          gt: now,
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    res.json({ notifications: scheduled });
  } catch (err) {
    console.error('❌ Błąd pobierania zaplanowanych:', err);
    res.status(500).json({ message: 'Błąd zaplanowanych powiadomień' });
  }
};

exports.getNotificationById = async (req, res) => {
  const { id } = req.params;

  console.log('📥 [GET] Notification ID:', id);
  console.log('👤 req.user.id:', req.user.id);

  const notif = await prisma.notification.findFirst({ 
    where: { 
      id, 
      createdById: req.user.id // tylko jeśli user sam ją stworzył
    } 
  });

  if (!notif) {
    console.warn('❌ Notification not found or not owned by user');
    return res.status(404).json({ message: 'Nie znaleziono' });
  }

  res.json(notif);
};

exports.deleteNotification = async (req, res) => {
  const { id } = req.params;
  
  try {
    const notif = await prisma.notification.findFirst({ 
      where: { 
        id, 
        createdById: req.user.id // 🔐 Autoryzacja 
      } 
    });
    
    if (!notif) {
      return res.status(404).json({ message: 'Nie znaleziono lub brak dostępu' });
    }
    
    await prisma.notification.delete({ where: { id } });
    res.json({ message: 'Usunięto pomyślnie' });
  } catch (error) {
    console.error('❌ Błąd usuwania powiadomienia:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania powiadomienia' });
  }
};

exports.updateNotification = async (req, res) => {
  const { id } = req.params;
  const { content, link, userIds, scheduledAt } = req.body;
  
  try {
    const notif = await prisma.notification.findFirst({ 
      where: { 
        id, 
        createdById: req.user.id // 🔐 Tylko jeśli jesteś autorem 
      } 
    });
    
    if (!notif) {
      return res.status(404).json({ message: 'Nie znaleziono lub brak dostępu' });
    }
    
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        content,
        link,
        scheduledAt: new Date(scheduledAt),
      },
    });
    
    res.json(updated);
  } catch (err) {
    console.error('❌ Błąd aktualizacji:', err);
    res.status(500).json({ message: 'Błąd aktualizacji' });
  }
};

// Funkcja pomocnicza do obsługi powiadomień produkcyjnych opartych na uprawnieniach
const createProductionNotification = async (io, data) => {
  const { 
    type, // GUIDE_COMPLETED, STEP_COMPLETED, GUIDE_ASSIGNED, itd.
    targetId, // ID przewodnika/kroku
    content, // Treść powiadomienia
    link, // Link do zasobu
    createdById, // ID użytkownika, który wykonał akcję
    specificUserIds = [] // Lista konkretnych użytkowników do powiadomienia
  } = data;

  try {
    // 1. Znajdź wszystkich użytkowników z odpowiednimi uprawnieniami
    let userIdsWithPermission = [];
    
    // Pobierz użytkowników z konkretnymi uprawnieniami w zależności od typu
    if (specificUserIds.length === 0) {
      const permissionMap = {
        GUIDE_COMPLETED: 'production.view', // Użytkownicy z uprawnieniem do podglądu produkcji
        STEP_COMPLETED: 'production.view',
        GUIDE_ASSIGNED: 'production.assign', // Użytkownicy z uprawnieniem do przypisywania
        GUIDE_ARCHIVED: 'production.archive', // Użytkownicy z uprawnieniem do archiwizacji
        GUIDE_CREATED: 'production.create' // Użytkownicy z uprawnieniem do tworzenia
      };

      const permissionNeeded = permissionMap[type] || 'production.view';

      // Pobieranie wszystkich użytkowników z danym uprawnieniem
      const usersWithPermission = await prisma.user.findMany({
        where: {
          permissions: {
            path: [permissionNeeded],
            gte: 1
          }
        },
        select: {
          id: true
        }
      });

      // Pobierz administratorów (rola 'admin')
      const admins = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              name: 'admin'
            }
          }
        },
        select: {
          id: true
        }
      });

      // Łączymy użytkowników z uprawnieniami i administratorów
      const allUsersIds = [
        ...usersWithPermission.map(u => u.id),
        ...admins.map(a => a.id)
      ];

      // Deduplikacja ID
      userIdsWithPermission = [...new Set(allUsersIds)];
    } else {
      // Użyj konkretnej listy użytkowników, jeśli została podana
      userIdsWithPermission = specificUserIds;
    }

    // Usuń użytkownika, który wykonał akcję z listy odbiorców
    if (createdById) {
      userIdsWithPermission = userIdsWithPermission.filter(id => id !== createdById);
    }

    // 2. Utwórz powiadomienia dla wszystkich użytkowników
    const notifications = [];
    for (const userId of userIdsWithPermission) {
      const notification = await prisma.notification.create({
        data: {
          userId,
          content,
          link,
          type: 'PRODUCTION',
          createdById: createdById || null,
          metadata: {
            productionType: type,
            targetId
          }
        }
      });

      notifications.push(notification);

      // 3. Wyślij powiadomienie przez socket, jeśli dostępny
      if (io) {
        io.emit(`notification:${userId}`, notification);
      }
    }

    return notifications;
  } catch (error) {
    console.error('❌ Błąd tworzenia powiadomień produkcyjnych:', error);
    return [];
  }
};

// Funkcja do tworzenia powiadomień o ukończeniu przewodnika
exports.notifyGuideCompleted = async (req, res) => {
  const { guideId, guideName } = req.body;
  const io = req.app.get('io');

  try {
    const notifications = await createProductionNotification(io, {
      type: 'GUIDE_COMPLETED',
      targetId: guideId,
      content: `🏆 Przewodnik "${guideName}" został ukończony`,
      link: `/production/guides/${guideId}`,
      createdById: req.user.id
    });

    res.status(201).json({ 
      message: 'Powiadomienia o ukończeniu przewodnika zostały wysłane', 
      count: notifications.length 
    });
  } catch (error) {
    console.error('❌ Błąd powiadomień o ukończeniu przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania powiadomień' });
  }
};

// Funkcja do tworzenia powiadomień o ukończeniu kroku
exports.notifyStepCompleted = async (req, res) => {
  const { stepId, stepName, guideId, guideName } = req.body;
  const io = req.app.get('io');

  try {
    const notifications = await createProductionNotification(io, {
      type: 'STEP_COMPLETED',
      targetId: stepId,
      content: `✅ Krok "${stepName}" w przewodniku "${guideName}" został ukończony`,
      link: `/production/guides/${guideId}`,
      createdById: req.user.id
    });

    res.status(201).json({ 
      message: 'Powiadomienia o ukończeniu kroku zostały wysłane', 
      count: notifications.length 
    });
  } catch (error) {
    console.error('❌ Błąd powiadomień o ukończeniu kroku:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania powiadomień' });
  }
};

// Funkcja do tworzenia powiadomień o przypisaniu do przewodnika
exports.notifyGuideAssigned = async (req, res) => {
  const { guideId, guideName, assignedUserIds } = req.body;
  const io = req.app.get('io');

  try {
    // Tworzenie powiadomień dla przypisanych użytkowników
    const notifications = await createProductionNotification(io, {
      type: 'GUIDE_ASSIGNED',
      targetId: guideId,
      content: `📋 Zostałeś przypisany do przewodnika "${guideName}"`,
      link: `/production/guides/${guideId}`,
      createdById: req.user.id,
      specificUserIds: assignedUserIds // Tylko dla konkretnych użytkowników
    });

    res.status(201).json({ 
      message: 'Powiadomienia o przypisaniu zostały wysłane', 
      count: notifications.length 
    });
  } catch (error) {
    console.error('❌ Błąd powiadomień o przypisaniu do przewodnika:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania powiadomień' });
  }
};

// Ekspozycja funkcji pomocniczej dla innych kontrolerów
exports.createProductionNotification = createProductionNotification;