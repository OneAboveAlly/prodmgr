// backend/scripts/check-modules.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModules() {
  try {
    console.log('Checking modules in the database vs UI...');
    
    // Get all unique modules from the Permission table
    const permissions = await prisma.permission.findMany();
    
    // Extract unique module names from permissions
    const dbModules = [...new Set(permissions.map(p => p.module))].sort();
    console.log('\nModules in the database:');
    console.log(dbModules);
    
    // These are the modules that should be displayed in the UI
    // This list should be maintained manually based on what's in the RoleForm.js component
    const uiModules = [
      'users',
      'roles',
      'timeTracking',
      'leave',
      'auditLogs',
      'permissions' // Added the missing permissions module
      // Add any other modules that should appear in the UI
    ];
    console.log('\nModules expected in UI:');
    console.log(uiModules);
    
    // Find modules that are in the database but not in the UI
    const missingInUi = dbModules.filter(module => !uiModules.includes(module));
    
    // Find modules that are in the UI but not in the database
    const missingInDb = uiModules.filter(module => !dbModules.includes(module));
    
    if (missingInUi.length > 0) {
      console.log('\n⚠️ WARNING: The following modules exist in the database but might not be displayed in the UI:');
      console.log(missingInUi);
    } else {
      console.log('\n✓ All database modules appear to be included in the UI.');
    }
    
    if (missingInDb.length > 0) {
      console.log('\n⚠️ WARNING: The following modules are expected in the UI but don\'t exist in the database:');
      console.log(missingInDb);
    } else {
      console.log('\n✓ All UI modules exist in the database.');
    }
    
    // For each module, check if all its permissions are properly set up
    console.log('\nDetailed permission check by module:');
    for (const module of dbModules) {
      const modulePermissions = permissions.filter(p => p.module === module);
      console.log(`\n${module} (${modulePermissions.length} permissions):`);
      modulePermissions.forEach(p => {
        console.log(`  - ${p.action}: ${p.description || 'No description'}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking modules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkModules();