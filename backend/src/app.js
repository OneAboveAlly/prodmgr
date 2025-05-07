// backend/src/app.js
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const { startScheduler } = require('./scheduler');
const { setupChatSocket } = require('./sockets/chat.socket');
const fs = require('fs');

dotenv.config();

// Delete old audit.route.js file if it exists
try {
  const routePath = path.join(__dirname, './routes/audit.route.js');
  if (fs.existsSync(routePath)) {
    fs.unlinkSync(routePath);
    console.log('Removed outdated audit.route.js file');
  }
} catch (err) {
  console.error('Error removing old audit route file:', err);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Make io available throughout the app
app.set('io', io);

// Socket.IO setup
setupChatSocket(io);

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

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/roles', require('./routes/role.routes'));
app.use('/api/audit-logs', require('./routes/audit.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/time-tracking', require('./routes/timeTracking.routes'));
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/messages', require('./routes/message.routes'));
app.use('/api/production', require('./routes/production.routes'));
app.use('/api/inventory', require('./routes/inventory.routes'));

// Add new routes for enhanced features
app.use('/api/statistics', require('./routes/statistics.routes'));
app.use('/api/ocr', require('./routes/ocr.routes'));

// New production management routes
app.use('/api/quality', require('./routes/qualityControl.routes'));
app.use('/api/dashboard', require('./routes/productionDashboard.routes'));
app.use('/api/scheduling', require('./routes/scheduling.routes'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});