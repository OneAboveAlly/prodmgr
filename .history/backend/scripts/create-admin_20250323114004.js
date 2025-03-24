const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Utwórz rolę admin, jeśli nie istnieje
    const adminRole = await prisma.role.upsert({
      where: { name: 'Administrator' },
      update: {},
      create: {
        name: 'Administrator',
        description: 'Pełny dostęp do systemu'
      }
    });

    console.log('Role created:', adminRole);

    // Utwórz użytkownika admin
    const passwordHash = await bcrypt.hash('admin123', 10);
    
    const adminUser = await prisma.user.upsert({
      where: { login: 'admin' },
      update: {
        passwordHash
      },
      create: {
        firstName: 'Admin',
        lastName: 'System',
        login: 'admin',
        email: 'admin@example.com',
        passwordHash,
        isActive: true
      }
    });

    console.log('User created:', adminUser);

    // Przypisz rolę admin do użytkownika
    const userRole = await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id
      }
    });

    console.log('User role assigned:', userRole);

    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();