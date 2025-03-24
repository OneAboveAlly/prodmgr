const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');

// Załadowanie zmiennych środowiskowych
dotenv.config();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
// Pozostałe routes będą dodane później

// Obsługa błędów
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});