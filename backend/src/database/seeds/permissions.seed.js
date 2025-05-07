// backend/src/database/seeds/permissions.seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const permissions = [
  // Production
  {
    module: 'production',
    action: 'read',
    description: 'Podgląd przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'create',
    description: 'Tworzenie nowych przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'update',
    description: 'Aktualizacja przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'delete',
    description: 'Usuwanie przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'work',
    description: 'Praca nad przewodnikami (rejestrowanie czasu)'
  },
  {
    module: 'production',
    action: 'manageAll',
    description: 'Zaawansowane zarządzanie produkcją i przewodnikami'
  },
  {
    module: 'production',
    action: 'assign',
    description: 'Przypisywanie użytkowników do przewodników'
  },

  // Inventory
  {
    module: 'inventory',
    action: 'read',
    description: 'Podgląd magazynu i stanów magazynowych'
  },
  {
    module: 'inventory',
    action: 'create',
    description: 'Tworzenie nowych pozycji magazynowych'
  },
  {
    module: 'inventory',
    action: 'update',
    description: 'Aktualizacja pozycji magazynowych'
  },
  {
    module: 'inventory',
    action: 'manage',
    description: 'Zarządzanie zarezerwowanymi przedmiotami i poziomami magazynowymi'
  },
  
  // Statistics
  {
    module: 'statistics',
    action: 'read',
    description: 'Podgląd podstawowych statystyk'
  },
  {
    module: 'statistics',
    action: 'viewReports',
    description: 'Podgląd szczegółowych raportów i analiz'
  },
  {
    module: 'statistics',
    action: 'export',
    description: 'Eksportowanie statystyk i raportów'
  },
  
  // OCR
  {
    module: 'ocr',
    action: 'process',
    description: 'Przetwarzanie obrazów za pomocą OCR'
  },
  {
    module: 'ocr',
    action: 'manage',
    description: 'Zarządzanie wynikami OCR'
  }
];

async function main() {
  console.log('Seeding permissions...');
  
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: perm.module,
          action: perm.action
        }
      },
      update: {
        description: perm.description
      },
      create: {
        module: perm.module,
        action: perm.action,
        description: perm.description
      }
    });
  }

  console.log('✅ Permissions seeded successfully');
  
  // Create or update roles with the new permissions
  
  // Find admin role
  const adminRole = await prisma.role.findFirst({
    where: { name: { in: ['Admin', 'Administrator'] } }
  });
  
  if (adminRole) {
    console.log('Updating Admin role permissions...');
    
    // Get all permissions
    const allPermissions = await prisma.permission.findMany();
    
    // Ensure admin has all permissions with max value (3)
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: perm.id
          }
        },
        update: {
          value: 3
        },
        create: {
          roleId: adminRole.id,
          permissionId: perm.id,
          value: 3
        }
      });
    }
    
    console.log('✅ Admin role updated with all permissions');
  }
  
  // Find or create Warehouseman role
  let warehousemanRole = await prisma.role.findFirst({
    where: { name: 'Warehouseman' }
  });
  
  if (!warehousemanRole) {
    console.log('Creating Warehouseman role...');
    
    warehousemanRole = await prisma.role.create({
      data: {
        name: 'Warehouseman',
        description: 'Manages inventory and warehouse operations'
      }
    });
  }
  
  // Get inventory and related permissions
  const warehousePermissions = await prisma.permission.findMany({
    where: {
      OR: [
        { module: 'inventory' },
        { 
          module: 'production',
          action: { in: ['read'] }
        }
      ]
    }
  });
  
  // Assign warehouse permissions
  for (const perm of warehousePermissions) {
    let value = 2; // Default to level 2 for warehouse permissions
    
    // For production.read, set to level 1
    if (perm.module === 'production') {
      value = 1;
    }
    
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: warehousemanRole.id,
          permissionId: perm.id
        }
      },
      update: {
        value
      },
      create: {
        roleId: warehousemanRole.id,
        permissionId: perm.id,
        value
      }
    });
  }
  
  console.log('✅ Warehouseman role permissions updated');
  
  // Find or create CEO role
  let ceoRole = await prisma.role.findFirst({
    where: { name: 'CEO' }
  });
  
  if (!ceoRole) {
    console.log('Creating CEO role...');
    
    ceoRole = await prisma.role.create({
      data: {
        name: 'CEO',
        description: 'Top management with access to all reports and statistics'
      }
    });
  }
  
  // Get all permissions for CEO
  const allPermissions = await prisma.permission.findMany();
  
  // Assign CEO permissions
  for (const perm of allPermissions) {
    // Different permission levels based on module
    let value = 2; // Default to level 2
    
    // Statistics and viewing at level 3
    if (perm.module === 'statistics' || perm.action === 'read') {
      value = 3;
    }
    
    // Management permissions at level 1
    if (['create', 'update', 'delete'].includes(perm.action)) {
      value = 1;
    }
    
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: ceoRole.id,
          permissionId: perm.id
        }
      },
      update: {
        value
      },
      create: {
        roleId: ceoRole.id,
        permissionId: perm.id,
        value
      }
    });
  }
  
  console.log('✅ CEO role permissions updated');
}

main()
  .catch(e => {
    console.error('Error seeding permissions:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());