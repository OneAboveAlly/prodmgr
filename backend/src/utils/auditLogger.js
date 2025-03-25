const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Log an audit action
 * @param {Object} params
 * @param {string} params.userId - Who did it
 * @param {string} params.action - What happened, e.g., "create", "update"
 * @param {string} params.module - On what module, e.g., "users", "roles"
 * @param {string} [params.targetId] - ID of the affected object (userId, roleId, etc)
 * @param {object} [params.meta] - Any extra info (JSON)
 */
const logAudit = async ({ userId, action, module, targetId = null, meta = null }) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        module,
        targetId,
        meta,
      },
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

module.exports = { logAudit };
