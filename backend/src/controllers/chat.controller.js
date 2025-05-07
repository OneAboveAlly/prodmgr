const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

exports.getUsers = async (req, res) => {
  try {
    // Sprawdzamy czy user jest dostępny w req
    console.log('👤 User w request:', req.user);
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Wymagana autoryzacja' });
    }
    
    const currentUserId = req.user.id;
    
    console.log('🔍 Pobieranie użytkowników dla chatu, aktualne ID:', currentUserId);

    try {
      const users = await prisma.user.findMany({
        where: {
          id: { not: currentUserId },
          isActive: true
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          login: true,
          userRoles: {
            select: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          firstName: 'asc'
        }
      });
      
      // Mapowanie wyników, aby uprościć strukturę ról dla frontendu
      const usersWithSimplifiedRoles = users.map(user => {
        const roles = user.userRoles.map(ur => ur.role.name);
        const { userRoles, ...restUser } = user;
        return {
          ...restUser,
          roles
        };
      });
      
      console.log(`✅ Znaleziono ${users.length} użytkowników`);
      return res.json(usersWithSimplifiedRoles);
    } catch (dbError) {
      console.error('❌ Błąd bazy danych:', dbError);
      return res.status(500).json({ message: 'Błąd bazy danych', error: dbError.message });
    }
  } catch (error) {
    console.error('❌ Ogólny błąd w getUsers:', error);
    return res.status(500).json({ message: 'Nie udało się pobrać listy użytkowników', error: error.message });
  }
};

exports.getConversations = async (req, res) => {
  const userId = req.user.id;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  res.json(messages);
};

exports.getMessagesWithUser = async (req, res) => {
  const userId = req.user.id;
  const targetUserId = req.params.userId;

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        {
          senderId: userId,
          receiverId: targetUserId
        },
        {
          senderId: targetUserId,
          receiverId: userId
        }
      ]
    },
    include: {
      attachments: true
    },
    orderBy: { createdAt: 'asc' }
  });

  res.json(messages);
};

exports.sendMessage = async (req, res) => {
  const senderId = req.user.id;
  const receiverId = req.params.userId;
  const { content } = req.body;

  const message = await prisma.message.create({
    data: {
      senderId,
      receiverId,
      content
    }
  });

  res.status(201).json(message);
};

exports.deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const messageId = req.params.messageId;

  try {
    // Znajdź wiadomość
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }

    // Sprawdź, czy użytkownik jest autorem wiadomości
    if (message.senderId !== userId) {
      return res.status(403).json({ message: 'Tylko autor może usunąć wiadomość' });
    }

    // Aktualizuj wiadomość - oznacz jako usuniętą i zmień treść
    const deletedContent = "Wiadomość została usunięta";
    
    await prisma.message.update({
      where: { id: messageId },
      data: { 
        isDeleted: true,
        content: deletedContent
      }
    });

    // Powiadom przez socket o usunięciu wiadomości
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${message.receiverId}`).emit('message:deleted', { 
        messageId, 
        deletedContent 
      });
    }

    return res.json({ success: true, deletedContent });
  } catch (error) {
    console.error('❌ Błąd podczas usuwania wiadomości:', error);
    return res.status(500).json({ 
      message: 'Wystąpił błąd podczas usuwania wiadomości', 
      error: error.message 
    });
  }
};

exports.sendMessageWithAttachment = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;
    const content = req.body.content || '';
    
    if (!req.file) {
      return res.status(400).json({ message: 'Brak pliku w żądaniu' });
    }
    
    // Tworzenie wpisu wiadomości z załącznikiem
    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        attachments: {
          create: {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            fileType: req.file.mimetype,
            filePath: `/uploads/chat-attachments/${path.basename(req.file.path)}`
          }
        }
      },
      include: {
        attachments: true
      }
    });
    
    // Powiadom przez socket o nowej wiadomości
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${receiverId}`).emit('message:receive', message);
    }
    
    // Zapisz powiadomienie
    await prisma.notification.create({
      data: {
        userId: receiverId,
        content: `Nowa wiadomość od ${req.user.firstName}`,
        link: '/chat',
        type: 'SYSTEM',
        createdById: senderId
      }
    });
    
    return res.status(201).json(message);
  } catch (error) {
    console.error('❌ Błąd podczas wysyłania wiadomości z załącznikiem:', error);
    return res.status(500).json({ 
      message: 'Wystąpił błąd podczas wysyłania wiadomości z załącznikiem', 
      error: error.message 
    });
  }
};

exports.markAsRead = async (req, res) => {
  const userId = req.user.id;
  const senderId = req.params.userId;

  try {
    // Oznacz wszystkie nieprzeczytane wiadomości od tego użytkownika jako przeczytane
    await prisma.message.updateMany({
      where: {
        senderId: senderId,
        receiverId: userId,
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
};
