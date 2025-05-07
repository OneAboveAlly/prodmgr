// backend/src/sockets/chat.socket.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const onlineUsers = new Map();

function setupChatSocket(io) {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return;

    console.log('✅ Socket connected:', socket.id, '->', userId);
    onlineUsers.set(userId, socket.id);

    socket.join(`user:${userId}`);
    io.emit('chat:onlineUsers', Array.from(onlineUsers.keys()));

    socket.on('message:send', async (messageData) => {
      const { senderId, receiverId, content, id } = messageData;
      
      try {
        // Jeśli wiadomość nie ma ID, zostanie utworzona w bazie danych
        // W przeciwnym razie używamy dostarczonego ID
        let message;
        
        if (!id) {
          // Tworzenie wiadomości w bazie danych
          message = await prisma.message.create({
            data: { senderId, receiverId, content },
          });
        } else {
          // Używamy już istniejącego rekordu wiadomości
          message = { id, senderId, receiverId, content };
        }

        // Wysyłamy wiadomość do odbiorcy
        const targetSocket = onlineUsers.get(receiverId);
        if (targetSocket) {
          io.to(`user:${receiverId}`).emit('message:receive', message);
        }
      } catch (error) {
        console.error('❌ Błąd podczas wysyłania wiadomości:', error);
      }
    });

    // Obsługa usuwania wiadomości
    socket.on('message:delete', async (data) => {
      const { messageId } = data;
      
      try {
        // Znajdź wiadomość
        const message = await prisma.message.findUnique({
          where: { id: messageId }
        });
        
        if (!message) return;
        
        // Sprawdź czy nadawca ma prawo usunąć wiadomość
        if (message.senderId !== userId) return;
        
        // Oznacz wiadomość jako usuniętą
        const deletedContent = "Wiadomość została usunięta";
        await prisma.message.update({
          where: { id: messageId },
          data: { 
            isDeleted: true,
            content: deletedContent
          }
        });
        
        // Powiadom odbiorcę o usunięciu wiadomości
        const receiverSocketId = onlineUsers.get(message.receiverId);
        if (receiverSocketId) {
          io.to(`user:${message.receiverId}`).emit('message:deleted', { 
            messageId, 
            deletedContent 
          });
        }
      } catch (error) {
        console.error('❌ Błąd podczas usuwania wiadomości:', error);
      }
    });

    // Obsługa odczytu wiadomości
    socket.on('message:read', async (data) => {
      const { senderId, receiverId } = data;
      
      try {
        // Znajdź socket odbiorcy
        const receiverSocketId = onlineUsers.get(receiverId);
        
        if (receiverSocketId) {
          io.to(`user:${receiverId}`).emit('message:read', { 
            senderId, 
            receiverId 
          });
        }
      } catch (error) {
        console.error('❌ Błąd podczas obsługi odczytu wiadomości:', error);
      }
    });

    socket.on('chat:getOnlineUsers', () => {
      socket.emit('chat:onlineUsers', Array.from(onlineUsers.keys()));
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id);

      for (const [id, sid] of onlineUsers) {
        if (sid === socket.id) {
          onlineUsers.delete(id);
          break;
        }
      }

      io.emit('chat:onlineUsers', Array.from(onlineUsers.keys()));
    });
  });
}

module.exports = { setupChatSocket };
