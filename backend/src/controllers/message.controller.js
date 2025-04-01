const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendMessage = async (req, res) => {
  const { content, receiverId } = req.body;
  const senderId = req.user.id;

  try {
    // Pobierz pełne dane nadawcy
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
      }
    });

    if (!sender) {
      return res.status(404).json({ message: 'Nie znaleziono nadawcy' });
    }

    // Zapisz wiadomość
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true
          }
        }
      }
    });

    // Zapisz powiadomienie z pełnym imieniem i nazwiskiem nadawcy
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        content: `Nowa wiadomość od ${sender.firstName} ${sender.lastName}`,
        link: `/chat/${senderId}`, // dynamiczny link do konkretnej konwersacji
        type: 'SYSTEM',
        createdById: senderId // dodajemy informację kto utworzył powiadomienie
      }
    });

    // Emituj socket.io powiadomienie
    const io = req.app.get('io');
    io.to(`user:${receiverId}`).emit('notification:new', notification);
    
    // Wyślij wiadomość z danymi nadawcy przez socket
    io.to(`user:${receiverId}`).emit('message:receive', {
      ...message,
      senderFullName: `${sender.firstName} ${sender.lastName}`,
    });

    res.status(201).json({ message, notification });
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania wiadomości' });
  }
};

const getMessages = async (req, res) => {
  const userId = req.user.id;
  const { partnerId } = req.params;

  try {
    // Pobierz wiadomości między użytkownikami
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { 
            senderId: userId,
            receiverId: partnerId,
            deletedBySender: false
          },
          { 
            senderId: partnerId, 
            receiverId: userId,
            deletedByReceiver: false
          }
        ],
        isDeleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            login: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('GetMessages error:', error);
    res.status(500).json({ message: 'Błąd podczas pobierania wiadomości' });
  }
};

const deleteMessage = async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  try {
    // Znajdź wiadomość
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ message: 'Wiadomość nie została znaleziona' });
    }

    // Sprawdź czy użytkownik ma prawo usunąć wiadomość
    if (message.senderId !== userId) {
      return res.status(403).json({ message: 'Nie masz uprawnień do usunięcia tej wiadomości' });
    }

    // Oznacz wiadomość jako usuniętą
    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true }
    });

    // Powiadom przez socket.io
    const io = req.app.get('io');
    io.to(`user:${message.receiverId}`).emit('message:deleted', {
      messageId,
      senderId: userId,
      receiverId: message.receiverId,
      deletedContent: "Wiadomość została usunięta"
    });

    res.json({ message: 'Wiadomość została usunięta' });
  } catch (error) {
    console.error('DeleteMessage error:', error);
    res.status(500).json({ message: 'Błąd podczas usuwania wiadomości' });
  }
};

module.exports = { sendMessage, getMessages, deleteMessage };
