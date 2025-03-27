// backend/scripts/seed-leave-types.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Vacation',
    description: 'Annual vacation leave',
    paid: true,
    color: '#4F46E5' // Indigo
  },
  {
    name: 'Sick Leave',
    description: 'Leave for health-related reasons',
    paid: true,
    color: '#EF4444' // Red
  },
  {
    name: 'Personal Time Off',
    description: 'Leave for personal matters',
    paid: true,
    color: '#10B981' // Green
  },
  {
    name: 'Family Emergency',
    description: 'Leave to handle family emergencies',
    paid: true,
    color: '#F59E0B' // Amber
  },
  {
    name: 'Unpaid Leave',
    description: 'Extended leave without pay',
    paid: false,
    color: '#6B7280' // Gray
  }
];

async function main() {
  console.log('Starting to seed default leave types...');
  
  try {
    for (const leaveType of DEFAULT_LEAVE_TYPES) {
      // Check if the leave type already exists
      const existingLeaveType = await prisma.leaveType.findFirst({
        where: { name: leaveType.name }
      });
      
      if (!existingLeaveType) {
        await prisma.leaveType.create({
          data: leaveType
        });
        console.log(`Created leave type: ${leaveType.name}`);
      } else {
        console.log(`Leave type already exists: ${leaveType.name}`);
      }
    }
    
    console.log('Default leave types seeded successfully!');
  } catch (error) {
    console.error('Error seeding leave types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();