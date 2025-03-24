const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { getUserPermissions } = require('../services/auth.service');

const prisma = new PrismaClient();

/**
 * Middleware to verify JWT token and attach user ID to request
 */
const checkAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // The token now only contains userId
    const userId = decoded.userId;
    
    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isActive: true,
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
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is inactive' });
    }
    
    // Get fresh permissions from database
    const permissions = await getUserPermissions(userId);
    
    // Attach user info to request
    req.user = {
      userId: user.id,
      id: user.id,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })),
      permissions
    };
    
    next();
  } catch (error) {
    console.error('checkAuth error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required permission
 * @param {string} module - Module name
 * @param {string} action - Action name
 * @param {number} minValue - Minimum permission value required (default: 1)
 */
const checkPermission = (module, action, minValue = 1) => {
  return async (req, res, next) => {
    try {
      // First check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Check permission
      const permKey = `${module}.${action}`;
      const permValue = req.user.permissions[permKey] || 0;
      
      if (permValue < minValue) {
        return res.status(403).json({ 
          message: 'Access forbidden - insufficient permissions',
          requiredPermission: permKey,
          requiredValue: minValue,
          actualValue: permValue
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

module.exports = { checkAuth, checkPermission };