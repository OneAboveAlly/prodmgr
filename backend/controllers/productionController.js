// productionController.js

const productionController = {
  // ...existing code...

  deleteGuide: async (req, res, next) => {
    try {
      const { guideId } = req.params;
      const userPermissionLevel = req.user.permissionLevel;

      // Check permissions
      const permissionKey = 'production.delete';
      if (permissionKey === 'production.delete' && userPermissionLevel >= 1) {
        // Allow Level 1 users to delete production guides
        return next();
      }

      // ...existing code for deleting guide...

    } catch (error) {
      console.error('Error deleting guide:', error);
      res.status(500).json({ message: 'Failed to delete guide' });
    }
  },

  // ...existing code...
};

module.exports = productionController;