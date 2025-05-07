const { PrismaClient } = require('@prisma/client');
const { logAudit } = require('../utils/auditLogger');
const prisma = new PrismaClient();

// Cache dla modułów z uprawnieniami, żeby uniknąć ciągłego zapytania do bazy
let permissionsCache = {
  timestamp: 0,
  data: null,
  ttl: 5 * 60 * 1000 // 5 minut w milisekundach
};

// Funkcja do czyszczenia cache'u
const clearPermissionsCache = () => {
  permissionsCache = {
    timestamp: 0,
    data: null,
    ttl: 5 * 60 * 1000
  };
};

// Pomocnicza funkcja do grupowania uprawnień według modułu
const groupPermissionsByModule = (permissions) => {
  const groupedByModule = {};
  
  permissions.forEach(permission => {
    if (!groupedByModule[permission.module]) {
      groupedByModule[permission.module] = [];
    }
    groupedByModule[permission.module].push(permission);
  });
  
  return groupedByModule;
};

// Get all roles with pagination
const getAllRoles = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const roles = await prisma.role.findMany({
      skip,
      take: limit,
      orderBy: { name: 'asc' },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });
    
    const total = await prisma.role.count();
    
    // Transform roles to include formatted permissions
    const formattedRoles = roles.map(role => {
      const permissions = {};
      
      role.rolePermissions.forEach(rp => {
        const key = `${rp.permission.module}.${rp.permission.action}`;
        permissions[key] = rp.value;
      });
      
      return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
        userCount: 0 // Will be populated in the next step
      };
    });
    
    // Get user counts for each role
    const roleCounts = await prisma.userRole.groupBy({
      by: ['roleId'],
      _count: {
        userId: true
      }
    });
    
    // Add user counts to formatted roles
    roleCounts.forEach(count => {
      const role = formattedRoles.find(r => r.id === count.roleId);
      if (role) {
        role.userCount = count._count.userId;
      }
    });
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'roles',
      targetId: null,
      meta: { page, limit }
    });
    
    res.json({
      roles: formattedRoles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({ message: 'Error retrieving roles' });
  }
};

// Get all permissions grouped by module
const getAllPermissions = async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.refresh === 'true';
    
    // Sprawdź, czy cache jest aktualny
    if (!forceRefresh && permissionsCache.data && now - permissionsCache.timestamp < permissionsCache.ttl) {
      return res.json(permissionsCache.data);
    }
    
    // Jeśli nie, pobierz dane z bazy
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });
    
    // Grupuj uprawnienia według modułu
    const groupedByModule = groupPermissionsByModule(permissions);
    
    // Zaktualizuj cache
    permissionsCache = {
      timestamp: now,
      data: {
        permissions,
        groupedByModule
      },
      ttl: 5 * 60 * 1000
    };
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'permissions',
      targetId: null,
      meta: { count: permissions.length, forceRefresh }
    });
    
    res.json({
      permissions,
      groupedByModule
    });
  } catch (error) {
    console.error('Error getting permissions:', error);
    res.status(500).json({ message: 'Error retrieving permissions' });
  }
};

// Force refresh permissions cache
const refreshPermissionsCache = async (req, res) => {
  try {
    clearPermissionsCache();
    
    // Pobierz zaktualizowane dane
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { module: 'asc' },
        { action: 'asc' }
      ]
    });
    
    // Lista polskich opisów uprawnień
    const polishDescriptions = {
      // chat permissions
      'chat.view': 'Dostęp do funkcji czatu',
      'chat.send': 'Wysyłanie wiadomości',
      'chat.delete': 'Usuwanie własnych wiadomości',
      'chat.admin': 'Administrowanie wszystkimi wiadomościami czatu',
      
      // dashboard permissions
      'dashboard.read': 'Podgląd panelu produkcji i analityki',
      
      // leave permissions
      'leave.approve': 'Zatwierdzanie lub odrzucanie wniosków urlopowych',
      'leave.create': 'Tworzenie wniosków urlopowych',
      'leave.delete': 'Usuwanie wniosków urlopowych',
      'leave.manageTypes': 'Zarządzanie typami urlopów',
      'leave.read': 'Podgląd wniosków urlopowych',
      'leave.update': 'Aktualizacja wniosków urlopowych',
      'leave.viewAll': 'Podgląd wniosków urlopowych wszystkich użytkowników',
      
      // permissions management
      'permissions.assign': 'Przydzielanie uprawnień',
      'permissions.read': 'Podgląd uprawnień',
      
      // roles permissions
      'roles.create': 'Tworzenie ról',
      'roles.delete': 'Usuwanie ról',
      'roles.read': 'Podgląd ról',
      'roles.update': 'Aktualizacja ról',
      
      // scheduling permissions
      'scheduling.create': 'Tworzenie harmonogramów produkcji i przydziałów',
      'scheduling.delete': 'Usuwanie harmonogramów produkcji i przydziałów',
      'scheduling.read': 'Podgląd harmonogramów produkcji',
      'scheduling.update': 'Aktualizacja harmonogramów produkcji i przydziałów',
      
      // time tracking permissions
      'timeTracking.create': 'Tworzenie sesji śledzenia czasu',
      'timeTracking.delete': 'Usuwanie sesji śledzenia czasu',
      'timeTracking.exportReports': 'Eksportowanie raportów śledzenia czasu',
      'timeTracking.manageSettings': 'Zarządzanie ustawieniami śledzenia czasu',
      'timeTracking.read': 'Podgląd śledzenia czasu',
      'timeTracking.update': 'Aktualizacja sesji śledzenia czasu',
      'timeTracking.viewAll': 'Podgląd śledzenia czasu wszystkich użytkowników',
      'timeTracking.viewReports': 'Podgląd raportów śledzenia czasu',
      
      // users permissions
      'users.create': 'Tworzenie użytkowników',
      'users.delete': 'Usuwanie użytkowników',
      'users.read': 'Podgląd użytkowników',
      'users.update': 'Aktualizacja użytkowników',
      
      // quality permissions
      'quality.create': 'Tworzenie szablonów kontroli jakości i przeprowadzanie kontroli',
      'quality.read': 'Podgląd szablonów kontroli jakości i wyników',
      'quality.update': 'Aktualizacja szablonów kontroli jakości',
      'quality.delete': 'Usuwanie szablonów kontroli jakości',

      // auditLogs permissions
      'auditLogs.read': 'Przeglądanie dziennika audytu',
      'auditLogs.export': 'Eksportowanie dziennika audytu',

      // OCR permissions
      'ocr.create': 'Tworzenie nowych skanów OCR',
      'ocr.read': 'Przeglądanie wyników OCR',
      'ocr.update': 'Edycja wyników OCR',
      'ocr.delete': 'Usuwanie skanów OCR',
      'ocr.process': 'Przetwarzanie obrazów za pomocą OCR',
      'ocr.manage': 'Zarządzanie wynikami OCR',

      // production permissions
      'production.create': 'Tworzenie nowych przewodników produkcyjnych',
      'production.read': 'Podgląd przewodników produkcyjnych',
      'production.update': 'Aktualizacja przewodników produkcyjnych',
      'production.delete': 'Usuwanie przewodników produkcyjnych',
      'production.archive': 'Archiwizacja przewodników produkcyjnych',
      'production.assign': 'Przypisywanie użytkowników do przewodników',
      'production.work': 'Praca nad przewodnikami (rejestrowanie czasu)',
      'production.manage': 'Zmiana statusów, zarządzanie priorytetami',
      'production.manageAll': 'Zaawansowane zarządzanie produkcją i przewodnikami',
      'production.manualWork': 'Dodawanie ręcznych wpisów pracy, datowanie wsteczne',
      'production.view': 'Podgląd przewodników produkcyjnych',

      // inventory permissions
      'inventory.create': 'Tworzenie nowych pozycji magazynowych',
      'inventory.read': 'Podgląd magazynu i stanów magazynowych',
      'inventory.update': 'Aktualizacja pozycji magazynowych',
      'inventory.delete': 'Usuwanie pozycji magazynowych',
      'inventory.reserve': 'Rezerwowanie przedmiotów magazynowych',
      'inventory.issue': 'Wydawanie przedmiotów z magazynu',
      'inventory.manage': 'Zarządzanie zarezerwowanymi przedmiotami i poziomami magazynowymi',

      // statistics permissions
      'statistics.read': 'Podgląd podstawowych statystyk',
      'statistics.viewReports': 'Podgląd szczegółowych raportów i analiz',
      'statistics.export': 'Eksportowanie statystyk i raportów',

      // admin permissions
      'admin.access': 'Specjalne uprawnienie dostępu administratora',
      '*.all': 'Uprawnienie ogólne - pełny dostęp do wszystkiego',
      '*.read': 'Uprawnienie do podglądu danych w każdym module',
    };
    
    // Aktualizuj opisy uprawnień w bazie danych
    let updatedCount = 0;
    for (const permission of permissions) {
      const key = `${permission.module}.${permission.action}`;
      if (polishDescriptions[key]) {
        await prisma.permission.update({
          where: { id: permission.id },
          data: { description: polishDescriptions[key] }
        });
        updatedCount++;
      }
    }
    
    // Grupuj uprawnienia według modułu
    const groupedByModule = groupPermissionsByModule(permissions);
    
    // Zaktualizuj cache
    permissionsCache = {
      timestamp: Date.now(),
      data: {
        permissions,
        groupedByModule
      },
      ttl: 5 * 60 * 1000
    };
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'refresh',
      module: 'permissions',
      targetId: null,
      meta: { count: permissions.length, updatedDescriptions: updatedCount }
    });
    
    res.json({
      success: true,
      message: 'Permissions cache refreshed successfully',
      count: permissions.length,
      updatedDescriptions: updatedCount
    });
  } catch (error) {
    console.error('Error refreshing permissions cache:', error);
    res.status(500).json({ message: 'Error refreshing permissions cache' });
  }
};

// Get a single role by ID
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
        }
      }
    });
    
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Transform permissions to a more convenient format
    const permissions = {};
    role.rolePermissions.forEach(rp => {
      const key = `${rp.permission.module}.${rp.permission.action}`;
      permissions[key] = rp.value;
    });
    
    const formattedRole = {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions,
    };
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'read',
      module: 'roles',
      targetId: id,
      meta: { name: role.name }
    });
    
    res.json(formattedRole);
  } catch (error) {
    console.error('Error getting role:', error);
    res.status(500).json({ message: 'Error retrieving role' });
  }
};

// Create a new role
const createRole = async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Check if role with this name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name }
    });
    
    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists' });
    }
    
    // Create role and its permissions in a transaction
    const role = await prisma.$transaction(async (tx) => {
      // Create the role
      const newRole = await tx.role.create({
        data: {
          name,
          description
        }
      });
      
      // Create role permissions
      if (permissions) {
        const permissionsToCreate = [];
        
        // Get all permissions from the database
        const dbPermissions = await tx.permission.findMany();
        const dbPermMap = {};
        dbPermissions.forEach(p => {
          dbPermMap[`${p.module}.${p.action}`] = p.id;
        });
        
        // Prepare permissions to create
        for (const [key, value] of Object.entries(permissions)) {
          if (value > 0 && dbPermMap[key]) {
            permissionsToCreate.push({
              roleId: newRole.id,
              permissionId: dbPermMap[key],
              value
            });
          }
        }
        
        if (permissionsToCreate.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionsToCreate
          });
        }
      }
      
      return newRole;
    });
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'create',
      module: 'roles',
      targetId: role.id,
      meta: { name, description }
    });
    
    res.status(201).json({
      id: role.id,
      name: role.name,
      description: role.description,
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
    const { name, description, permissions } = req.body;
    
    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id }
    });
    
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if name is taken by another role
    if (name !== existingRole.name) {
      const nameExists = await prisma.role.findFirst({
        where: {
          name,
          id: { not: id }
        }
      });
      
      if (nameExists) {
        return res.status(400).json({ message: 'Another role with this name already exists' });
      }
    }
    
    // Update role and permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Update the role
      await tx.role.update({
        where: { id },
        data: {
          name,
          description
        }
      });
      
      // Update permissions if provided
      if (permissions) {
        // Delete existing role permissions
        await tx.rolePermission.deleteMany({
          where: { roleId: id }
        });
        
        // Get all permissions from the database
        const dbPermissions = await tx.permission.findMany();
        const dbPermMap = {};
        dbPermissions.forEach(p => {
          dbPermMap[`${p.module}.${p.action}`] = p.id;
        });
        
        // Prepare permissions to create
        const permissionsToCreate = [];
        for (const [key, value] of Object.entries(permissions)) {
          if (value > 0 && dbPermMap[key]) {
            permissionsToCreate.push({
              roleId: id,
              permissionId: dbPermMap[key],
              value
            });
          }
        }
        
        if (permissionsToCreate.length > 0) {
          await tx.rolePermission.createMany({
            data: permissionsToCreate
          });
        }
      }
    });
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'update',
      module: 'roles',
      targetId: id,
      meta: { 
        name, 
        description,
        previousName: existingRole.name,
        previousDescription: existingRole.description
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
      where: { id }
    });
    
    if (!existingRole) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Check if role is in use
    const roleInUse = await prisma.userRole.findFirst({
      where: { roleId: id }
    });
    
    if (roleInUse) {
      return res.status(400).json({
        message: 'Cannot delete role that is assigned to users. Remove all users from this role first.'
      });
    }
    
    // Delete role and its permissions in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete role permissions
      await tx.rolePermission.deleteMany({
        where: { roleId: id }
      });
      
      // Delete the role
      await tx.role.delete({
        where: { id }
      });
    });
    
    // 🔥 Logujemy kto i co zrobił
    await logAudit({
      userId: req.user.id,
      action: 'delete',
      module: 'roles',
      targetId: id,
      meta: { 
        name: existingRole.name,
        description: existingRole.description 
      }
    });
    
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ message: 'Error deleting role' });
  }
};

module.exports = {
  getAllRoles,
  getAllPermissions,
  refreshPermissionsCache,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};