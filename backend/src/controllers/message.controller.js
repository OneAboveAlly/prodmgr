const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sendMessage = async (req, res) => {
  const { content, receiverId } = req.body;
  const senderId = req.user.id;

  try {
    // Zapisz wiadomość
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        receiverId
      }
    });

    // Zapisz powiadomienie
    const notification = await prisma.notification.create({
      data: {
        userId: receiverId,
        content: `Nowa wiadomość od ${req.user.firstName}`,
        link: '/chat', // możesz podmienić na dynamiczny link
        type: 'SYSTEM'
      }
    });

    // Emituj socket.io powiadomienie
    const io = req.app.get('io');
    io.emit(`notification:${receiverId}`, notification);

    res.status(201).json({ message, notification });
  } catch (error) {
    console.error('SendMessage error:', error);
    res.status(500).json({ message: 'Błąd podczas wysyłania wiadomości' });
  }
};

module.exports = { sendMessage };
