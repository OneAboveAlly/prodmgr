// backend/scripts/add-audit-logs-permission.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAuditLogsPermission() {
  try {
    console.log('Checking if auditLogs.read permission exists...');
    
    // Check if the permission already exists
    const existingPermission = await prisma.permission.findFirst({
      where: {
        module: 'auditLogs',
        action: 'read'
      }
    });
    
    if (existingPermission) {
      console.log('✓ Permission auditLogs.read already exists.');
      return;
    }
    
    // Create the permission if it doesn't exist
    const newPermission = await prisma.permission.create({
      data: {
        module: 'auditLogs',
        action: 'read',
        description: 'View audit logs'
      }
    });
    
    console.log('✓ Successfully created auditLogs.read permission!');
    console.log('Permission details:', newPermission);
    console.log('\nRemember to assign this permission to appropriate roles.');
    
  } catch (error) {
    console.error('Error adding permission:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAuditLogsPermission();