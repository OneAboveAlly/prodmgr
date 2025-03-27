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
  
  // Time tracking permissions
  { module: 'timeTracking', action: 'read', description: 'View time tracking' },
  { module: 'timeTracking', action: 'create', description: 'Create time tracking sessions' },
  { module: 'timeTracking', action: 'update', description: 'Update time tracking sessions' },
  { module: 'timeTracking', action: 'delete', description: 'Delete time tracking sessions' },
  { module: 'timeTracking', action: 'manageSettings', description: 'Manage time tracking settings' },
  { module: 'timeTracking', action: 'viewReports', description: 'View time tracking reports' },
  { module: 'timeTracking', action: 'exportReports', description: 'Export time tracking reports' },
  { module: 'timeTracking', action: 'viewAll', description: 'View all users time tracking' },
  
  // Leave management permissions
  { module: 'leave', action: 'read', description: 'View leave requests' },
  { module: 'leave', action: 'create', description: 'Create leave requests' },
  { module: 'leave', action: 'update', description: 'Update leave requests' },
  { module: 'leave', action: 'delete', description: 'Delete leave requests' },
  { module: 'leave', action: 'approve', description: 'Approve or reject leave requests' },
  { module: 'leave', action: 'manageTypes', description: 'Manage leave types' },
  { module: 'leave', action: 'viewAll', description: 'View all users leave requests' },
  
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
    'permissions.assign': 3,
    'timeTracking.read': 3,
    'timeTracking.create': 3,
    'timeTracking.update': 3,
    'timeTracking.delete': 3,
    'timeTracking.manageSettings': 3,
    'timeTracking.viewReports': 3,
    'timeTracking.exportReports': 3,
    'timeTracking.viewAll': 3,
    'leave.read': 3,
    'leave.create': 3,
    'leave.update': 3,
    'leave.delete': 3,
    'leave.approve': 3,
    'leave.manageTypes': 3,
    'leave.viewAll': 3
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
    'permissions.assign': 0,
    'timeTracking.read': 2,
    'timeTracking.create': 2,
    'timeTracking.update': 2,
    'timeTracking.delete': 0,
    'timeTracking.manageSettings': 1,
    'timeTracking.viewReports': 2,
    'timeTracking.exportReports': 2,
    'timeTracking.viewAll': 2,
    'leave.read': 2,
    'leave.create': 2,
    'leave.update': 2,
    'leave.delete': 0,
    'leave.approve': 2,
    'leave.manageTypes': 0,
    'leave.viewAll': 2
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
    'permissions.assign': 0,
    'timeTracking.read': 1,
    'timeTracking.create': 1,
    'timeTracking.update': 1,
    'timeTracking.delete': 0,
    'timeTracking.manageSettings': 0,
    'timeTracking.viewReports': 1,
    'timeTracking.exportReports': 0,
    'timeTracking.viewAll': 0,
    'leave.read': 1,
    'leave.create': 1,
    'leave.update': 1,
    'leave.delete': 0,
    'leave.approve': 0,
    'leave.manageTypes': 0,
    'leave.viewAll': 0
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