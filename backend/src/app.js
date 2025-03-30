const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

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

// Socket.IO – pojedyncza obsługa
io.on('connection', (socket) => {
  console.log('✅ Socket connected:', socket.id);

  socket.on('register', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`📨 Socket ${socket.id} dołączył do user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected:', socket.id);
  });
});

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
