// src/utils/permissionUtils.js

/**
 * Production module permission levels
 */
export const PRODUCTION_PERMISSIONS = {
    VIEW: {
      module: 'production',
      action: 'view',
      level: 1,
      description: 'View production guides'
    },
    CREATE: {
      module: 'production',
      action: 'create',
      level: 1,
      description: 'Create new production guides'
    },
    UPDATE: {
      module: 'production',
      action: 'update',
      level: 1,
      description: 'Update existing guides'
    },
    DELETE: {
      module: 'production',
      action: 'delete',
      level: 2,
      description: 'Delete guides (higher permission level)'
    },
    WORK: {
      module: 'production',
      action: 'work',
      level: 1,
      description: 'Work on steps, log time'
    },
    ASSIGN: {
      module: 'production',
      action: 'assign',
      level: 1,
      description: 'Assign users to guides'
    },
    MANAGE: {
      module: 'production',
      action: 'manage',
      level: 2,
      description: 'Change statuses, manage priorities'
    },
    MANAGE_ALL: {
      module: 'production',
      action: 'manageAll',
      level: 3,
      description: 'Full management rights, override restrictions'
    },
    MANUAL_WORK: {
      module: 'production',
      action: 'manualWork',
      level: 2,
      description: 'Add manual work entries, backdate work'
    }
  };
  
  /**
   * Check if user has the required permission for an action
   * @param {Object} user - The user object from AuthContext
   * @param {Object} permission - The permission object from PRODUCTION_PERMISSIONS
   * @returns {boolean} Whether the user has the required permission
   */
  export const hasProductionPermission = (user, permission) => {
    if (!user || !permission) return false;
    
    // Admin users bypass permission checks
    if (user.roles && user.roles.some(role => role.name === 'Admin')) {
      return true;
    }
    
    // Check if user has the specific permission with required level
    const permissionKey = `${permission.module}.${permission.action}`;
    return user.permissions && 
      user.permissions[permissionKey] !== undefined && 
      user.permissions[permissionKey] >= permission.level;
  };
  
  /**
   * Checks if user can edit a specific guide
   * @param {Object} user - The user object from AuthContext
   * @param {Object} guide - The guide object
   * @returns {boolean} Whether the user can edit the guide
   */
  export const canEditGuide = (user, guide) => {
    if (!user || !guide) return false;
    
    // Users with manageAll can edit any guide
    if (hasProductionPermission(user, PRODUCTION_PERMISSIONS.MANAGE_ALL)) {
      return true;
    }
    
    // Users with update permission can edit guides they created
    if (hasProductionPermission(user, PRODUCTION_PERMISSIONS.UPDATE)) {
      // Creator can edit their own guides
      if (guide.createdById === user.id) {
        return true;
      }
      
      // Users assigned to a guide can edit it if they have update permission
      if (guide.assignedUsers && guide.assignedUsers.some(assignment => assignment.userId === user.id)) {
        return true;
      }
    }
    
    return false;
  };
  
  /**
   * Checks if user can work on a specific step
   * @param {Object} user - The user object from AuthContext 
   * @param {Object} step - The step object
   * @param {Object} guide - The guide object containing the step
   * @returns {boolean} Whether the user can work on the step
   */
  export const canWorkOnStep = (user, step, guide) => {
    if (!user || !step) return false;
    
    // Users with manageAll can work on any step
    if (hasProductionPermission(user, PRODUCTION_PERMISSIONS.MANAGE_ALL)) {
      return true;
    }
    
    // Users with work permission
    if (hasProductionPermission(user, PRODUCTION_PERMISSIONS.WORK)) {
      // If step has assigned role, check if user has that role
      if (step.assignedToRole) {
        return user.roles && user.roles.some(role => role.id === step.assignedToRole);
      }
      
      // If guide has assigned users, check if user is assigned
      if (guide && guide.assignedUsers) {
        return guide.assignedUsers.some(assignment => assignment.userId === user.id);
      }
      
      // Guide creator can always work on steps
      if (guide && guide.createdById === user.id) {
        return true;
      }
    }
    
    return false;
  };
  
  /**
   * Generates a list of all users who should be notified about a step change
   * @param {Object} step - The step that was updated
   * @param {Object} guide - The guide containing the step
   * @returns {Array} Array of user IDs who should be notified
   */
  export const getStepNotificationRecipients = (step, guide) => {
    if (!step || !guide) return [];
    
    const recipients = new Set();
    
    // Guide creator should be notified
    if (guide.createdById) {
      recipients.add(guide.createdById);
    }
    
    // Users assigned to the guide should be notified
    if (guide.assignedUsers && Array.isArray(guide.assignedUsers)) {
      guide.assignedUsers.forEach(assignment => {
        if (assignment.userId) {
          recipients.add(assignment.userId);
        }
      });
    }
    
    // Users who have logged work on this step should be notified
    if (step.workSessions && Array.isArray(step.workSessions)) {
      step.workSessions.forEach(session => {
        if (session.userId) {
          recipients.add(session.userId);
        }
      });
    }
    
    return [...recipients];
  };