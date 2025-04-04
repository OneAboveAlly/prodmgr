C:\Users\nowat\production-manager\backend\src\controllers\production.controller.js:2335
  addStepComment,
  ^
ReferenceError: addStepComment is not defined
    at Object.<anonymous> (C:\Users\nowat\production-manager\backend\src\controllers\production.controller.js:2335:3)
    at Module._compile (node:internal/modules/cjs/loader:1554:14)
    at Object..js (node:internal/modules/cjs/loader:1706:10)
    at Module.load (node:internal/modules/cjs/loader:1289:32)
    at Function._load (node:internal/modules/cjs/loader:1108:12)
    at TracingChannel.traceSync (node:diagnostics_channel:322:14)
    at wrapModuleLoad (node:internal/modules/cjs/loader:220:24)
    at Module.require (node:internal/modules/cjs/loader:1311:12)
    at require (node:internal/modules/helpers:136:16)
    at Object.<anonymous> (C:\Users\nowat\production-manager\backend\src\routes\production.routes.js:4:30)
Node.js v22.14.0
[nodemon] app crashed - waiting for file changes before starting...

There's a problem with how your functions are organized in the production.controller.js file. The issue is that the function definitions for addStepComment, assignUserToGuide, removeUserFromGuide, getAssignedUsers, assignMultipleUsersToGuide, and addManualWorkEntry are defined after they're referenced in the module.exports statement.

Let me explain how to fix this issue:

The Problem
In JavaScript, variable and function declarations are hoisted to the top of their scope, but function expressions assigned to variables are not. Looking at your file, it appears that you've placed these function definitions inside another function's body (updateStepInventoryStatus), which is causing them to be out of scope when the module.exports statement runs.

How to Fix It
Remove the function definitions from inside the updateStepInventoryStatus function
Place them at the appropriate location in the file (before the module.exports statement)
Here's the exact fix:

Open your production.controller.js file
Look for these function definitions (they start around line 2000, inside the updateStepInventoryStatus function, after the "Audit logging" comment)
Cut all six function definitions:
addStepComment
assignUserToGuide
removeUserFromGuide
getAssignedUsers
assignMultipleUsersToGuide
addManualWorkEntry
Paste them just before the module.exports statement at the bottom of the file
The correct structure should be:
// ... (existing code and functions)

// Update the status of inventory assigned to a step
const updateStepInventoryStatus = async (req, res) => {
  // ... (function implementation)
};

// Add these functions OUTSIDE and AFTER the updateStepInventoryStatus function
// Add a comment to a step
const addStepComment = async (req, res) => {
  // ... (function implementation)
};

const assignUserToGuide = async (req, res) => {
  // ... (function implementation)
};

// ... (remaining functions)

// Export all functions
module.exports = {
  handleFileUpload,
  createProductionGuide,
  // ... (other exports)
  addStepComment,
  assignUserToGuide,
  removeUserFromGuide,
  getAssignedUsers,
  assignMultipleUsersToGuide,
  addManualWorkEntry,
  // ... (remaining exports)
};

This issue is common in Node.js when organizing large controller files. The functions must be defined before they're referenced in the module.exports statement, and they must be defined at the proper scope level (not inside another function).