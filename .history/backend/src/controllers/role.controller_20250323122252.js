const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all roles with pagination
const getAllRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const roles = await prisma.role.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    const total = await prisma.role.count();
    
    // Transform roles to include formatted permissions
    const formattedRoles = roles.map(role => {
      const permissions = {};
      
      role.rolePermissions.forEach(rp => {
        const key = `${rp.permission.module}.${rp.permission.action}`;
        permissions[key] = rp.value;
      });
      
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
        userCount: 0 // Will be populated in the next step
      };
    });
    
    // Get user counts for each role
    const roleCounts = await prisma.userRole.groupBy({
      by: ['roleId'],
      _count: {
        userId: true
      }
    });
    
    // Add user counts to formatted roles
    roleCounts.forEach(count => {
      const role = formattedRoles.find(r => r.id === count.roleId);
      if (role) {
        role.userCount = count._count.userId;
      }
    });
    
    res.json({
      roles: formattedRoles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: 'Error retrieving roles' });
  }
};

// Get all permissions grouped by module
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });
    
    // Group permissions by module
    const groupedByModule = {};
    
    permissions.forEach(permission => {
      if (!groupedByModule[permission.module]) {
        groupedByModule[permission.module] = [];
      }
      groupedByModule[permission.module].push(permission);
    });
    
    res.json({
      permissions,
      groupedByModule
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ message: 'Error retrieving permissions' });
  }
};

// Get a single role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Transform permissions to a more convenient format
    const permissions = {};
    role.rolePermissions.forEach(rp => {
      const key = `${rp.permission.module}.${rp.permission.action}`;
      permissions[key] = rp.value;
    });
    
    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions,
    };
    
    res.json(formattedRole);
  } catch (error) {
    console.error('Error getting role:', error);
    res.status(500).json({ message: 'Error retrieving role' });
  }
};

// Create a new role
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Check if role with this name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });
    
    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    // Create role and its permissions in a transaction
    const role = await prisma.$transaction(async (tx) => {
      // Create the role
      const newRole = await tx.role.create({
        data: {
          name,
          description
        }
      });
      
      // Create role permissions
      if (permissions) {
        const permissionsToCreate = [];
        
        // Get all permissions from the database
        const dbPermissions = await tx.permission.findMany();
        const dbPermMap = {};
        dbPermissions.forEach(p => {
          dbPermMap[`${p.module}.${p.action}`] = p.id;
        });
        
        // Prepare permissions to create
        for (const [key, value] of Object.entries(permissions)) {
          if (value > 0 && dbPermMap[key]) {
            permissionsToCreate.push({
              roleId: newRole.id,
              permissionId: dbPermMap[key],
              value
            });
          }
        }
        
        if (permissionsToCreate.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionsToCreate
          });
        }
      }
      
      return newRole;
    });
    
    res.status(201).json({
      id: role.id,
      name: role.name,
      description: role.description,
      message: 'Role created successfully'
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ message: 'Error creating role' });
  }
};

// Update a role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;
    
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if name is taken by another role
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });
      
      if (nameExists) {
        return res.status(400).json({ message: 'Another role with this name already exists' });
      }
    }
    
    // Update role and permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the role
      await tx.role.update({
        where: { id },
        data: {
          name,
          description
        }
      });
      
      // Update permissions if provided
      if (permissions) {
        // Delete existing role permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });
        
        // Get all permissions from the database
        const dbPermissions = await tx.permission.findMany();
        const dbPermMap = {};
        dbPermissions.forEach(p => {
          dbPermMap[`${p.module}.${p.action}`] = p.id;
        });
        
        // Prepare permissions to create
        const permissionsToCreate = [];
        for (const [key, value] of Object.entries(permissions)) {
          if (value > 0 && dbPermMap[key]) {
            permissionsToCreate.push({
              roleId: id,
              permissionId: dbPermMap[key],
              value
            });
          }
        }
        
        if (permissionsToCreate.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionsToCreate
          });
        }
      }
    });
    
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ message: 'Error updating role' });
  }
};

// Delete a role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if role is in use
    const roleInUse = await prisma.userRole.findFirst({
      where: { roleId: id }
    });
    
    if (roleInUse) {
      return res.status(400).json({
        message: 'Cannot delete role that is assigned to users. Remove all users from this role first.'
      });
    }
    
    // Delete role and its permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });
      
      // Delete the role
      await tx.role.delete({
        where: { id }
      });
    });
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Error deleting role' });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions
};