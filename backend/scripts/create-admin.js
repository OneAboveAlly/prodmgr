const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const axios = require('axios');

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  firstName: 'SuperAdmin',
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

// Comprehensive list of all permissions from all scripts
const permissions = [
  // User management permissions
  { module: 'users', action: 'read', description: 'Podgląd użytkowników' },
  { module: 'users', action: 'create', description: 'Tworzenie użytkowników' },
  { module: 'users', action: 'update', description: 'Aktualizacja użytkowników' },
  { module: 'users', action: 'delete', description: 'Usuwanie użytkowników' },
  
  // Role management permissions
  { module: 'roles', action: 'read', description: 'Podgląd ról' },
  { module: 'roles', action: 'create', description: 'Tworzenie ról' },
  { module: 'roles', action: 'update', description: 'Aktualizacja ról' },
  { module: 'roles', action: 'delete', description: 'Usuwanie ról' },
  
  // Permission management
  { module: 'permissions', action: 'read', description: 'Podgląd uprawnień' },
  { module: 'permissions', action: 'assign', description: 'Przydzielanie uprawnień' },
  
  // Time tracking permissions
  { module: 'timeTracking', action: 'read', description: 'Podgląd śledzenia czasu' },
  { module: 'timeTracking', action: 'create', description: 'Tworzenie sesji śledzenia czasu' },
  { module: 'timeTracking', action: 'update', description: 'Aktualizacja sesji śledzenia czasu' },
  { module: 'timeTracking', action: 'delete', description: 'Usuwanie sesji śledzenia czasu' },
  { module: 'timeTracking', action: 'manageSettings', description: 'Zarządzanie ustawieniami śledzenia czasu' },
  { module: 'timeTracking', action: 'viewReports', description: 'Podgląd raportów śledzenia czasu' },
  { module: 'timeTracking', action: 'exportReports', description: 'Eksportowanie raportów śledzenia czasu' },
  { module: 'timeTracking', action: 'viewAll', description: 'Podgląd śledzenia czasu wszystkich użytkowników' },
  
  // Leave management permissions
  { module: 'leave', action: 'read', description: 'Podgląd wniosków urlopowych' },
  { module: 'leave', action: 'create', description: 'Tworzenie wniosków urlopowych' },
  { module: 'leave', action: 'update', description: 'Aktualizacja wniosków urlopowych' },
  { module: 'leave', action: 'delete', description: 'Usuwanie wniosków urlopowych' },
  { module: 'leave', action: 'approve', description: 'Zatwierdzanie lub odrzucanie wniosków urlopowych' },
  { module: 'leave', action: 'manageTypes', description: 'Zarządzanie typami urlopów' },
  { module: 'leave', action: 'viewAll', description: 'Podgląd wniosków urlopowych wszystkich użytkowników' },
  
  // Inventory permissions
  { module: 'inventory', action: 'create', description: 'Tworzenie nowych pozycji magazynowych' },
  { module: 'inventory', action: 'read', description: 'Podgląd magazynu i stanów magazynowych' },
  { module: 'inventory', action: 'update', description: 'Aktualizacja pozycji magazynowych' },
  { module: 'inventory', action: 'delete', description: 'Usuwanie pozycji magazynowych' },
  { module: 'inventory', action: 'reserve', description: 'Rezerwowanie przedmiotów magazynowych' },
  { module: 'inventory', action: 'issue', description: 'Wydawanie przedmiotów z magazynu' },
  { module: 'inventory', action: 'manage', description: 'Zarządzanie zarezerwowanymi przedmiotami i poziomami magazynowymi' },
  
  // Production permissions
  { module: 'production', action: 'create', description: 'Tworzenie nowych przewodników produkcyjnych' },
  { module: 'production', action: 'read', description: 'Podgląd przewodników produkcyjnych' },
  { module: 'production', action: 'update', description: 'Aktualizacja przewodników produkcyjnych' },
  { module: 'production', action: 'delete', description: 'Usuwanie przewodników produkcyjnych' },
  { module: 'production', action: 'archive', description: 'Archiwizacja przewodników produkcyjnych' },
  { module: 'production', action: 'assign', description: 'Przypisywanie użytkowników do przewodników' },
  { module: 'production', action: 'work', description: 'Praca nad przewodnikami (rejestrowanie czasu)' },
  { module: 'production', action: 'manage', description: 'Zmiana statusów, zarządzanie priorytetami' },
  { module: 'production', action: 'manageAll', description: 'Zaawansowane zarządzanie produkcją i przewodnikami' },
  { module: 'production', action: 'manualWork', description: 'Dodawanie ręcznych wpisów pracy, datowanie wsteczne' },
  { module: 'production', action: 'view', description: 'Podgląd przewodników produkcyjnych' },
  
  // Audit logs permissions
  { module: 'auditLogs', action: 'read', description: 'Przeglądanie dziennika audytu' },
  { module: 'auditLogs', action: 'export', description: 'Eksportowanie dziennika audytu' },
  
  // Quality control permissions
  { module: 'quality', action: 'create', description: 'Tworzenie szablonów kontroli jakości i przeprowadzanie kontroli' },
  { module: 'quality', action: 'read', description: 'Podgląd szablonów kontroli jakości i wyników' },
  { module: 'quality', action: 'update', description: 'Aktualizacja szablonów kontroli jakości' },
  { module: 'quality', action: 'delete', description: 'Usuwanie szablonów kontroli jakości' },
  
  // OCR permissions
  { module: 'ocr', action: 'create', description: 'Tworzenie nowych skanów OCR' },
  { module: 'ocr', action: 'read', description: 'Przeglądanie wyników OCR' },
  { module: 'ocr', action: 'update', description: 'Edycja wyników OCR' },
  { module: 'ocr', action: 'delete', description: 'Usuwanie skanów OCR' },
  { module: 'ocr', action: 'process', description: 'Przetwarzanie obrazów za pomocą OCR' },
  { module: 'ocr', action: 'manage', description: 'Zarządzanie wynikami OCR' },
  
  // Dashboard permissions
  { module: 'dashboard', action: 'read', description: 'Podgląd panelu produkcji i analityki' },
  
  // Scheduling permissions
  { module: 'scheduling', action: 'create', description: 'Tworzenie harmonogramów produkcji i przydziałów' },
  { module: 'scheduling', action: 'read', description: 'Podgląd harmonogramów produkcji' },
  { module: 'scheduling', action: 'update', description: 'Aktualizacja harmonogramów produkcji i przydziałów' },
  { module: 'scheduling', action: 'delete', description: 'Usuwanie harmonogramów produkcji i przydziałów' },
  
  // Statistics permissions
  { module: 'statistics', action: 'read', description: 'Podgląd podstawowych statystyk' },
  { module: 'statistics', action: 'viewReports', description: 'Podgląd szczegółowych raportów i analiz' },
  { module: 'statistics', action: 'export', description: 'Eksportowanie statystyk i raportów' },
  
  // Chat permissions
  { module: 'chat', action: 'view', description: 'Dostęp do funkcji czatu' },
  { module: 'chat', action: 'send', description: 'Wysyłanie wiadomości' },
  { module: 'chat', action: 'delete', description: 'Usuwanie własnych wiadomości' },
  { module: 'chat', action: 'admin', description: 'Administrowanie wszystkimi wiadomościami czatu' },
  
  // Admin special permissions 
  { module: 'admin', action: 'access', description: 'Specjalne uprawnienie dostępu administratora' },
  { module: '*', action: '*', description: 'Uprawnienie ogólne - pełny dostęp do wszystkiego' }
];

async function main() {
  try {
    console.log('Starting comprehensive database seeding...');
    
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
    
    // Assign all permissions to all roles with maximum level (3) for Admin
    console.log('Assigning permissions to roles...');
    
    // Get all permissions from the database (including any pre-existing ones)
    const allPermissionsFromDB = await prisma.permission.findMany();
    
    // Assign to Admin role
    const adminRole = createdRoles['Admin'];
    if (adminRole) {
      for (const permission of allPermissionsFromDB) {
        // Check if role permission already exists
        const existingRolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        
        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id,
              value: 3  // Maximum level
            }
          });
          console.log(`Assigned permission ${permission.module}.${permission.action} to role Admin with maximum value 3`);
        } else {
          // Update existing permission to maximum level
          await prisma.rolePermission.update({
            where: {
              id: existingRolePermission.id
            },
            data: {
              value: 3  // Maximum level
            }
          });
          console.log(`Updated permission ${permission.module}.${permission.action} for Admin role to maximum value 3`);
        }
      }
    }
    
    // Assign to Manager role (level 2)
    const managerRole = createdRoles['Manager'];
    if (managerRole) {
      for (const permission of allPermissionsFromDB) {
        const existingRolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: managerRole.id,
            permissionId: permission.id
          }
        });
        
        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              roleId: managerRole.id,
              permissionId: permission.id,
              value: 2  // Medium level
            }
          });
          console.log(`Assigned permission ${permission.module}.${permission.action} to role Manager with value 2`);
        } else {
          // Ensure manager has at least level 2 for all permissions
          if (existingRolePermission.value < 2) {
            await prisma.rolePermission.update({
              where: {
                id: existingRolePermission.id
              },
              data: {
                value: 2
              }
            });
            console.log(`Updated permission ${permission.module}.${permission.action} for Manager role to value 2`);
          }
        }
      }
    }
    
    // Assign to User role (level 1)
    const userRole = createdRoles['User'];
    if (userRole) {
      for (const permission of allPermissionsFromDB) {
        const existingRolePermission = await prisma.rolePermission.findFirst({
          where: {
            roleId: userRole.id,
            permissionId: permission.id
          }
        });
        
        if (!existingRolePermission) {
          await prisma.rolePermission.create({
            data: {
              roleId: userRole.id,
              permissionId: permission.id,
              value: 1  // Basic level
            }
          });
          console.log(`Assigned permission ${permission.module}.${permission.action} to role User with value 1`);
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
    
    // Try to refresh permissions cache if server is running
    try {
      console.log('Attempting to refresh permissions cache...');
      await axios.post('http://localhost:5000/api/roles/permissions/refresh', {});
      console.log('✅ Permissions cache refreshed successfully');
    } catch (e) {
      console.log('⚠️ Server not running or endpoint not available - permissions will be refreshed on next server start');
    }
    
  } catch (error) {
    console.error('Error during database seeding:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();