const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateTokens = async (userId) => {
  const accessToken = jwt.sign(
    { userId }, // ⬅️ tylko userId, BEZ permissions
    process.env.JWT_SECRET,
    { expiresIn: '30m' }
  );
  const refreshToken = jwt.sign(
    { userId, tokenId: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '14d' }
  );
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
    select: {
      role: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  const roles = userRoles.map(ur => ({
    id: ur.role.id,
    name: ur.role.name
  }));
  
  // Aktualizuj ostatnie logowanie
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });
  
  // Generuj tokeny - teraz tylko z userId
  const tokens = await generateTokens(user.id);
  
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

const logout = async (refreshToken) => {
  try {
    // Verify token first to make sure it's valid
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Mark token as revoked
    await prisma.refreshToken.updateMany({
      where: {
        token: refreshToken,
        userId: decoded.userId,
        isRevoked: false
      },
      data: {
        isRevoked: true
      }
    });
    
    // Update user's last activity
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { lastActivity: new Date() }
    });
    
    return true;
  } catch (error) {
    // If token verification fails, we still want to continue
    console.error('Error during logout:', error);
    return false;
  }
};

const refreshToken = async (token) => {
  // Verify the refresh token
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  
  // Check if token exists and is not revoked
  const savedToken = await prisma.refreshToken.findFirst({
    where: {
      token,
      userId: decoded.userId,
      isRevoked: false,
      expiresAt: {
        gt: new Date()
      }
    }
  });
  
  if (!savedToken) {
    throw new Error('Invalid or revoked refresh token');
  }
  
  // Mark current token as revoked (one-time use)
  await prisma.refreshToken.update({
    where: { id: savedToken.id },
    data: { isRevoked: true }
  });
  
  // Generate new tokens with only userId
  const tokens = await generateTokens(decoded.userId);
  
  // Update user's last activity
  await prisma.user.update({
    where: { id: decoded.userId },
    data: { lastActivity: new Date() }
  });
  
  return tokens;
};

const getUserDetails = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required for getUserDetails');
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      login: true,
      email: true,
      phoneNumber: true,
      isActive: true,
      lastLogin: true,
      userRoles: {
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Get permissions
  const permissions = await getUserPermissions(userId);
  
  return {
    ...user,
    roles: user.userRoles.map(ur => ({
      id: ur.role.id,
      name: ur.role.name
    })),
    permissions,
    userRoles: undefined
  };
};

const getUserPermissions = async (userId) => {
  // Sprawdź czy ma jakąkolwiek rolę o nazwie 'Admin' lub 'Administrator'
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: {
          in: ['Admin', 'Administrator']
        }
      }
    }
  });

  if (adminRole) {
    const allPermissions = await prisma.permission.findMany();
    const permissionMap = {};
    allPermissions.forEach(p => {
      permissionMap[`${p.module}.${p.action}`] = 1;
    });
    return permissionMap;
  }

  // Zwykłe role i uprawnienia
  const rolePermissions = await prisma.$queryRaw`
    SELECT p.module, p.action, MAX(rp.value) as value
    FROM "UserRole" ur
    JOIN "RolePermission" rp ON ur."roleId" = rp."roleId"
    JOIN "Permission" p ON rp."permissionId" = p.id
    WHERE ur."userId" = ${userId}
    GROUP BY p.module, p.action
  `;

  const userPermissions = await prisma.$queryRaw`
    SELECT p.module, p.action, up.value
    FROM "UserPermission" up
    JOIN "Permission" p ON up."permissionId" = p.id
    WHERE up."userId" = ${userId}
  `;

  const permissionMap = {};
  rolePermissions.forEach(p => {
    permissionMap[`${p.module}.${p.action}`] = p.value;
  });
  userPermissions.forEach(p => {
    permissionMap[`${p.module}.${p.action}`] = p.value;
  });

  return permissionMap;
};


module.exports = { login, logout, refreshToken, getUserDetails, generateTokens, getUserPermissions };