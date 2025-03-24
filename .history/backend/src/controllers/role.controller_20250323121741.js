const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: { userRoles: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formattedRoles = roles.map(role => {
      // Format the permissions for easier frontend consumption
      const permissions = {};
      role.rolePermissions.forEach(rp => {
        permissions[`${rp.permission.module}.${rp.permission.action}`] = rp.value;
      });

      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
        userCount: role._count.userRoles,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        rolePermissions: undefined,
        _count: undefined
      };
    });

    res.json(formattedRoles);
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: 'Error retrieving roles' });
  }
};

// Get role by ID
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
        },
        _count: {
          select: { userRoles: true }
        }
      }
    });

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Format the permissions for easier frontend consumption
    const permissions = {};
    role.rolePermissions.forEach(rp => {
      permissions[`${rp.permission.module}.${rp.permission.action}`] = rp.value;
    });

    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions,
      userCount: role._count.userRoles,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
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
    const { name, description, permissions = {} } = req.body;

    // Check if role with this name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });

    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists' });
    }

    // Create the role in a transaction
    const newRole = await prisma.$transaction(async (tx) => {
      // Create the role
      const role = await tx.role.create({
        data: {
          name,
          description
        }
      });

      // Add permissions if any are provided
      if (Object.keys(permissions).length > 0) {
        for (const [permKey, value] of Object.entries(permissions)) {
          const [module, action] = permKey.split('.');

          // Find the permission
          const permission = await tx.permission.findFirst({
            where: {
              module,
              action
            }
          });

          if (permission && value > 0) {
            await tx.rolePermission.create({
              data: {
                roleId: role.id,
                permissionId: permission.id,
                value
              }
            });
          }
        }
      }

      return role;
    });

    res.status(201).json({
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
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
    const { name, description, permissions = {} } = req.body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });

    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if the new name already exists on another role
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name,
          NOT: { id }
        }
      });

      if (nameExists) {
        return res.status(400).json({ message: 'Role with this name already exists' });
      }
    }

    // Update in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the role
      await tx.role.update({
        where: { id },
        data: {
          name,
          description
        }
      });

      // Delete all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // Add new permissions
      for (const [permKey, value] of Object.entries(permissions)) {
        const [module, action] = permKey.split('.');

        // Find the permission
        const permission = await tx.permission.findFirst({
          where: {
            module,
            action
          }
        });

        if (permission && value > 0) {
          await tx.rolePermission.create({
            data: {
              roleId: id,
              permissionId: permission.id,
              value
            }
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
      where: { id },
      include: {
        _count: {
          select: { userRoles: true }
        }
      }
    });

    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deletion if the role is assigned to users
    if (existingRole._count.userRoles > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete role that is assigned to users',
        userCount: existingRole._count.userRoles
      });
    }

    // Delete in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });

      // Delete role
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

// Get all permissions
const getAllPermissions = async (req, res) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });

    // Group permissions by module for easier frontend handling
    const groupedPermissions = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});

    res.json({
      permissions,
      groupedByModule: groupedPermissions
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ message: 'Error retrieving permissions' });
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