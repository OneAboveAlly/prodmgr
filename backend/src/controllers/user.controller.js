const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { logAudit } = require('../utils/auditLogger');

const prisma = new PrismaClient();

// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        email: true,
        isActive: true,
        lastLogin: true,
        lastActivity: true,
        createdAt: true,
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
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });
    
    const total = await prisma.user.count();
    
    const formattedUsers = users.map(user => ({
      ...user,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })),
      userRoles: undefined
    }));
    
    res.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Error retrieving users' });
  }
};

// Get a single user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        email: true,
        phoneNumber: true,
        birthDate: true,
        isActive: true,
        lastLogin: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true,
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
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user permissions
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: {
        permission: {
          select: {
            id: true,
            module: true,
            action: true
          }
        }
      }
    });
    
    const formattedUser = {
      ...user,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name
      })),
      permissions: userPermissions.map(up => ({
        id: up.permission.id,
        module: up.permission.module,
        action: up.permission.action,
        value: up.value
      })),
      userRoles: undefined
    };
    
    res.json(formattedUser);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Error retrieving user' });
  }
};

// Create a new user
const createUser = async (req, res) => {
  try {
    const { 
      firstName, 
      lastName, 
      login, 
      email, 
      phoneNumber, 
      birthDate,
      password,
      roles = [] 
    } = req.body;
    
    // Check if user with this login or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { login },
          { email }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this login or email already exists' 
      });
    }
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create the user in a transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          login,
          email,
          phoneNumber,
          birthDate: birthDate ? new Date(birthDate) : null,
          passwordHash,
          isActive: true
        }
      });
      
      // Assign roles
      if (roles.length > 0) {
        const roleAssignments = roles.map(roleId => ({
          roleId,
          userId: user.id
        }));
        
        await tx.userRole.createMany({
          data: roleAssignments
        });
      }
      
      return user;
    });
    
    // Log the user creation action
    await logAudit({ 
      userId: req.user.id, 
      action: 'create', 
      module: 'users', 
      targetId: newUser.id, 
      meta: { 
        email: newUser.email, 
        login: newUser.login, 
        roles: roles 
      } 
    });
    
    res.status(201).json({
      id: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      login: newUser.login,
      email: newUser.email,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
};

// Update a user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      birthDate,
      isActive,
      password,
      roles
    } = req.body;
    
    // Check if user exists and get old data for audit log
    const oldUserData = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!oldUserData) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Format old data for audit log
    const oldData = {
      firstName: oldUserData.firstName,
      lastName: oldUserData.lastName,
      email: oldUserData.email,
      phoneNumber: oldUserData.phoneNumber,
      birthDate: oldUserData.birthDate,
      isActive: oldUserData.isActive,
      roles: oldUserData.userRoles.map(ur => ur.role.id)
    };
    
    // Update data
    const updateData = {
      firstName,
      lastName,
      email,
      phoneNumber,
      birthDate: birthDate ? new Date(birthDate) : null,
      isActive
    };
    
    // If password is provided, hash it
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Update in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Update user
      const user = await tx.user.update({
        where: { id },
        data: updateData
      });
      
      // Update roles if provided
      if (roles && Array.isArray(roles)) {
        // Remove existing roles
        await tx.userRole.deleteMany({
          where: { userId: id }
        });
        
        // Add new roles
        if (roles.length > 0) {
          const roleAssignments = roles.map(roleId => ({
            roleId,
            userId: id
          }));
          
          await tx.userRole.createMany({
            data: roleAssignments
          });
        }
      }
      
      return user;
    });
    
    // Log the user update action
    await logAudit({ 
      userId: req.user.id, 
      action: 'update', 
      module: 'users', 
      targetId: id, 
      meta: { 
        previousData: oldData, 
        updatedFields: { 
          firstName, 
          lastName, 
          email, 
          phoneNumber, 
          birthDate,
          isActive, 
          password: password ? '******' : undefined, 
          roles 
        } 
      } 
    });
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists and get data for audit log
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });
    
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Delete in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete user roles
      await tx.userRole.deleteMany({
        where: { userId: id }
      });
      
      // Delete user permissions
      await tx.userPermission.deleteMany({
        where: { userId: id }
      });
      
      // Delete refresh tokens
      await tx.refreshToken.deleteMany({
        where: { userId: id }
      });
      
      // Delete user
      await tx.user.delete({
        where: { id }
      });
    });
    
    // Log the user deletion action
    await logAudit({ 
      userId: req.user.id, 
      action: 'delete', 
      module: 'users', 
      targetId: id, 
      meta: { 
        email: userToDelete.email, 
        login: userToDelete.login,
        roles: userToDelete.userRoles.map(ur => ur.role.name)
      } 
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
};

// Get current user profile
const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        login: true,
        email: true,
        phoneNumber: true,
        birthDate: true,
        isActive: true,
        lastLogin: true,
        lastActivity: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                level: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const formattedUser = {
      ...user,
      roles: user.userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        level: ur.role.level
      })),
      userRoles: undefined
    };
    
    res.json(formattedUser);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Error retrieving user profile' });
  }
};

// Update current user profile
const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, email, phoneNumber } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If email is changed, check if it's already used
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: userId }
        }
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Email address is already in use' });
      }
    }
    
    // Update user data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        email,
        phoneNumber
      }
    });
    
    // Log the profile update
    await logAudit({
      userId,
      action: 'update',
      module: 'profile',
      targetId: userId,
      meta: { 
        updatedFields: { firstName, lastName, email, phoneNumber }
      }
    });
    
    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Change current user password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }
    
    // Get current user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if current password is correct
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash
      }
    });
    
    // Log password change
    await logAudit({
      userId,
      action: 'update',
      module: 'security',
      targetId: userId,
      meta: { action: 'password_change' }
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};

// Get users with today's birthdays
const getTodayBirthdays = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1; // JavaScript months are 0-indexed
    const day = today.getDate();
    
    // Find users whose birth date matches today's month and day
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        birthDate: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthDate: true
      }
    });
    
    // Filter users with birthdays today
    const birthdayUsers = users.filter(user => {
      if (!user.birthDate) return false;
      const birthDate = new Date(user.birthDate);
      return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
    });
    
    // Calculate age for each user
    const usersWithAge = birthdayUsers.map(user => {
      const birthDate = new Date(user.birthDate);
      const age = today.getFullYear() - birthDate.getFullYear();
      
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        age: age
      };
    });
    
    res.json({ users: usersWithAge });
  } catch (error) {
    console.error('Error getting users with today birthdays:', error);
    res.status(500).json({ message: 'Error retrieving birthday information' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMyProfile,
  updateMyProfile,
  changePassword,
  getTodayBirthdays
};