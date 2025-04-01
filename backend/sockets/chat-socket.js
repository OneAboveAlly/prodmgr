const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const { startScheduler } = require('./scheduler');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// 🔥 pozwala używać io np. w kontrolerach: req.app.get('io')
app.set('io', io);

// Kolekcja do śledzenia aktywnych użytkowników i ich statusów ukrycia
const onlineUsers = new Map(); // userId => socketId
const hiddenUsers = new Set(); // Zbiór userIds którzy ukryli swój status

// Zapisujemy stany użytkowników ukrytych w pamięci serwera (przy restarcie będzie reset)
const persistHiddenUsers = () => {
  try {
    const hiddenUsersArray = Array.from(hiddenUsers);
    console.log('💾 Stan ukrytych użytkowników:', hiddenUsersArray);
  } catch (err) {
    console.error('❌ Błąd podczas zapisu stanu ukrytych użytkowników:', err);
  }
};

// Funkcja do wysyłania zaktualizowanej listy użytkowników online
const broadcastOnlineUsers = () => {
  // Filtrujemy, aby wysłać tylko userIds, którzy nie ukrywają statusu
  const visibleOnlineUsers = Array.from(onlineUsers.keys())
    .filter(userId => !hiddenUsers.has(userId));
    
  io.emit('chat:onlineUsers', visibleOnlineUsers);
  console.log('📢 Broadcasted online users:', visibleOnlineUsers);
  console.log('👥 All online users:', Array.from(onlineUsers.keys()));
  console.log('🙈 Hidden users:', Array.from(hiddenUsers));
};

// Funkcja do sprawdzenia czy użytkownik jest ukryty podczas rejestracji
const restoreUserVisibilityState = (userId) => {
  return hiddenUsers.has(userId);
};

// Socket.IO – pojedyncza obsługa
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);
  let currentUserId = null;

  socket.on('register', (userId) => {
    if (!userId) return;
    
    currentUserId = userId;
    socket.join(`user:${userId}`);
    onlineUsers.set(userId, socket.id);
    console.log(`📨 Socket ${socket.id} dołączył do user:${userId}`);
    
    // Sprawdź, czy użytkownik był wcześniej oznaczony jako ukryty
    const isUserHidden = restoreUserVisibilityState(userId);
    
    // Poinformuj klienta o jego bieżącym stanie widoczności 
    socket.emit('chat:visibilityState', { isHidden: isUserHidden });
    
    // Wysyłamy zaktualizowaną listę użytkowników online
    broadcastOnlineUsers();
  });

  // Obsługa żądania listy aktywnych użytkowników
  socket.on('chat:getOnlineUsers', () => {
    const visibleOnlineUsers = Array.from(onlineUsers.keys())
      .filter(userId => !hiddenUsers.has(userId));
      
    socket.emit('chat:onlineUsers', visibleOnlineUsers);
  });
  
  // Obsługa ukrycia/odkrycia statusu online
  socket.on('chat:toggleVisibility', ({ userId, isHidden }) => {
    if (!userId) return;
    
    console.log(`👁️ User ${userId} ${isHidden ? 'ukrył' : 'pokazał'} swój status online`);
    
    if (isHidden) {
      hiddenUsers.add(userId);
    } else {
      hiddenUsers.delete(userId);
    }
    
    // Zapisz stan użytkowników ukrytych
    persistHiddenUsers();
    
    // Wysyłamy zaktualizowaną listę użytkowników online
    broadcastOnlineUsers();
  });
  
  // Obsługa sprawdzenia stanu widoczności
  socket.on('chat:checkVisibility', ({ userId }) => {
    const isHidden = hiddenUsers.has(userId);
    socket.emit('chat:visibilityState', { isHidden });
  });

  socket.on('message:send', (message) => {
    // Zapisujemy wiadomość i wysyłamy do odbiorcy
    io.to(`user:${message.receiverId}`).emit('message:receive', message);
  });
  
  // Obsługa usunięcia wiadomości
  socket.on('message:delete', (data) => {
    const { messageId } = data;
    
    // Broadcast do wszystkich podłączonych klientów
    // Używamy broadcast zamiast to(), żeby wysłać do wszystkich 
    // oprócz bieżącego socket (nadawcy)
    socket.broadcast.emit('message:deleted', {
      messageId,
      deletedContent: "Wiadomość została usunięta"
    });
    
    console.log(`✅ Socket ${socket.id} usunął wiadomość: ${messageId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
    
    // Usuwamy użytkownika z listy online
    if (currentUserId) {
      onlineUsers.delete(currentUserId);
      // UWAGA: Nie usuwamy z hiddenUsers, aby zachować stan ukrycia przy ponownym połączeniu
      broadcastOnlineUsers();
    }
  });
});

// Start the scheduler with io instance
startScheduler(io);

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Statyczne pliki
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/roles', require('./routes/role.routes'));
app.use('/api/audit-logs', require('./routes/audit.route'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/time-tracking', require('./routes/timeTracking.routes'));
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/messages', require('./routes/message.routes')); // ✅ Wiadomości

// Globalny error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Start serwera
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});