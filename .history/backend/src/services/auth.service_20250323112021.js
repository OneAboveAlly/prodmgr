const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateTokens = async (userId, roles, permissions) => {
  // Access token
  const accessToken = jwt.sign(
    { userId, roles, permissions },
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
  
  // Refresh token
  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '14d' }
  );
  
  // Zapisz refresh token w bazie
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);
  
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt
    }
  });
  
  return { accessToken, refreshToken };
};

const login = async (login, password) => {
  // Znajdź użytkownika
  const user = await prisma.user.findUnique({ where: { login } });
  
  if (!user || !user.isActive) {
    throw new Error('Invalid credentials or inactive account');
  }
  
  // Sprawdź hasło
  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }
  
  // Pobierz role i podstawowe uprawnienia
  const userRoles = await prisma.userRole.findMany({
    where: { userId: user.id },
    select: { role: true }
  });
  
  const roles = userRoles.map(ur => ur.role.id);
  
  // Tu powinna być logika pobierania uprawnień
  // Uproszczona wersja
  const permissions = {};
  
  // Aktualizuj ostatnie logowanie
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });
  
  // Generuj tokeny
  const tokens = await generateTokens(user.id, roles, permissions);
  
  return {
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      login: user.login,
      email: user.email
    },
    ...tokens
  };
};

module.exports = { login, generateTokens };