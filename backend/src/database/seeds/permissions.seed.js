const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const permissions = [
  // Production
  {
    module: 'production',
    action: 'read',
    description: 'Przeglądanie przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'create',
    description: 'Tworzenie nowych przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'update',
    description: 'Edycja przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'delete',
    description: 'Usuwanie przewodników produkcyjnych'
  },
  {
    module: 'production',
    action: 'work',
    description: 'Wykonywanie pracy w ramach kroków produkcyjnych'
  },
  {
    module: 'production',
    action: 'manageAll',
    description: 'Pełne zarządzanie produkcją i wszystkimi krokami'
  },

  // Inventory
  {
    module: 'inventory',
    action: 'read',
    description: 'Przeglądanie elementów magazynowych'
  },
  {
    module: 'inventory',
    action: 'create',
    description: 'Dodawanie nowych elementów magazynowych'
  },
  {
    module: 'inventory',
    action: 'update',
    description: 'Edycja elementów magazynowych'
  },
  {
    module: 'inventory',
    action: 'manage',
    description: 'Zarządzanie rezerwacjami i stanem magazynowym'
  }
];

async function main() {
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        module_action: {
          module: perm.module,
          action: perm.action
        }
      },
      update: {},
      create: {
        module: perm.module,
        action: perm.action,
        description: perm.description
      }
    });
  }

  console.log('✅ Permissions updated');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
