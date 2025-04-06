const express = require('express');
const router = express.Router();
const { checkPermissions } = require('../middleware/permissions');

// Route to delete a production guide
router.delete('/guide/:id', checkPermissions('production.delete'), async (req, res) => {
    try {
        const guideId = req.params.id;
        // Logic to delete the production guide
        await deleteGuide(guideId);
        res.status(200).send({ message: 'Production guide deleted successfully.' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to delete production guide.' });
    }
});

module.exports = router;

// Middleware to check permissions
function checkPermissions(requiredPermission) {
    return (req, res, next) => {
        const actualValue = req.user.permissionLevel;

        if (requiredPermission === 'production.delete' && actualValue >= 1) {
            // Allow Level 1 users to delete production guides
            return next();
        }

        res.status(403).send({ error: 'Insufficient permissions.' });
    };
}

// Function to delete a guide
async function deleteGuide(guideId) {
    // Implement the logic to delete the guide from the database
    // Example: await GuideModel.findByIdAndDelete(guideId);
}