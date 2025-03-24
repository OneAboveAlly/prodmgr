const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  firstName: 'Admin',
  lastName: 'User',
  login: 'admin',
  email: 'admin@example.com',
  password: 'admin123', // This will be hashed
  phoneNumber: null
};

// Define roles
const roles = [
  {
    name: 'Admin',
    description: 'Administrator with full access'
  },
  {
    name: 'Manager',
    description: 'Manager with access to most features'
  },
  {
    name: 'User',
    description: 'Regular user with limited access'
  }
];

// Define permissions by module
const permissions = [
  // User management permissions
  { module: 'users', action: 'read', description: 'View users' },
  { module: 'users', action: 'create', description: 'Create users' },
  { module: 'users', action: 'update', description: 'Update users' },
  { module: 'users', action: 'delete', description: 'Delete users' },
  
  // Role management permissions
  { module: 'roles', action: 'read', description: 'View roles' },
  { module: 'roles', action: 'create', description: 'Create roles' },
  { module: 'roles', action: 'update', description: 'Update roles' },
  { module: 'roles', action: 'delete', description: 'Delete roles' },
  
  // Permission management
  { module: 'permissions', action: 'read', description: 'View permissions' },
  { module: 'permissions', action: 'assign', description: 'Assign permissions' },
  
  // To be extended with more modules as your application grows
];

// Role permission mappings (what permissions each role has)
const rolePermissions = {
  'Admin': { 
    // Admin has all permissions with max value
    'users.read': 3, 
    'users.create': 3,
    'users.update': 3,
    'users.delete': 3,
    'roles.read': 3,
    'roles.create': 3,
    'roles.update': 3,
    'roles.delete': 3,
    'permissions.read': 3,
    'permissions.assign': 3
  },
  'Manager': {
    // Manager has most permissions with medium value
    'users.read': 2,
    'users.create': 2,
    'users.update': 2,
    'users.delete': 0, // Managers cannot delete users
    'roles.read': 2,
    'roles.create': 0,
    'roles.update': 0,
    'roles.delete': 0,
    'permissions.read': 2,
    'permissions.assign': 0
  },
  'User': {
    // Regular user has limited permissions
    'users.read': 1,
    'users.create': 0,
    'users.update': 0,
    'users.delete': 0,
    'roles.read': 1,
    'roles.create': 0,
    'roles.update': 0,
    'roles.delete': 0,
    'permissions.read': 0,
    'permissions.assign': 0
  }
};

async function main() {
  try {
    console.log('Starting database seeding...');
    
    // Create roles
    console.log('Creating roles...');
    const createdRoles = {};
    
    for (const role of roles) {
      const existingRole = await prisma.role.findUnique({
        where: { name: role.name }
      });
      
      if (!existingRole) {
        const newRole = await prisma.role.create({
          data: role
        });
        console.log(`Created role: ${newRole.name}`);
        createdRoles[newRole.name] = newRole;
      } else {
        console.log(`Role already exists: ${existingRole.name}`);
        createdRoles[existingRole.name] = existingRole;
      }
    }
    
    // Create permissions
    console.log('Creating permissions...');
    const createdPermissions = {};
    
    for (const permission of permissions) {
      const existingPermission = await prisma.permission.findFirst({
        where: {
          module: permission.module,
          action: permission.action
        }
      });
      
      if (!existingPermission) {
        const newPermission = await prisma.permission.create({
          data: permission
        });
        console.log(`Created permission: ${newPermission.module}.${newPermission.action}`);
        createdPermissions[`${newPermission.module}.${newPermission.action}`] = newPermission;
      } else {
        console.log(`Permission already exists: ${existingPermission.module}.${existingPermission.action}`);
        createdPermissions[`${existingPermission.module}.${existingPermission.action}`] = existingPermission;
      }
    }
    
    // Assign permissions to roles
    console.log('Assigning permissions to roles...');
    
    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      const role = createdRoles[roleName];
      
      if (!role) {
        console.log(`Role not found: ${roleName}`);
        continue;
      }
      
      for (const [permKey, value] of Object.entries(permissions)) {
        const [module, action] = permKey.split('.');
        const permission = createdPermissions[permKey];
        
        if (!permission) {
          console.log(`Permission not found: ${permKey}`);
          continue;
        }
        
        // Check if role permission already exists
        const existingRolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: role.id,
            permissionId: permission.id
          }
        });
        
        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: permission.id,
              value
            }
          });
          console.log(`Assigned permission ${permKey} to role ${roleName} with value ${value}`);
        } else {
          console.log(`Permission ${permKey} already assigned to role ${roleName}`);
        }
      }
    }
    
    // Create admin user if not exists
    console.log('Creating admin user...');
    
    const existingAdmin = await prisma.user.findUnique({
      where: { login: DEFAULT_ADMIN.login }
    });
    
    if (!existingAdmin) {
      // Hash the password
      const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
      
      // Create the admin user in a transaction
      const adminUser = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            firstName: DEFAULT_ADMIN.firstName,
            lastName: DEFAULT_ADMIN.lastName,
            login: DEFAULT_ADMIN.login,
            email: DEFAULT_ADMIN.email,
            phoneNumber: DEFAULT_ADMIN.phoneNumber,
            passwordHash,
            isActive: true
          }
        });
        
        // Assign Admin role
        const adminRole = createdRoles['Admin'];
        if (adminRole) {
          await tx.userRole.create({
            data: {
              userId: user.id,
              roleId: adminRole.id
            }
          });
        }
        
        return user;
      });
      
      console.log(`Created admin user: ${adminUser.login}`);
      console.log(`Admin password: ${DEFAULT_ADMIN.password}`);
      console.log('IMPORTANT: Change this password immediately after first login!');
    } else {
      console.log(`Admin user already exists: ${existingAdmin.login}`);
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();