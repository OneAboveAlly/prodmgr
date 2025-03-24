const jwt = require('jsonwebtoken');

const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const checkPermission = (module, action, minValue = 1) => {
  return (req, res, next) => {
    try {
      // First check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Check if permissions exist in the token
      const permKey = `${module}.${action}`;
      
      // If permissions are not in token, deny access
      // This is simplified - in a real app, you might want to fetch fresh permissions
      if (!req.user.permissions) {
        return res.status(403).json({ 
          message: 'Access forbidden - no permissions found',
          requiredPermission: permKey,
          requiredValue: minValue
        });
      }
      
      const permValue = req.user.permissions[permKey] || 0;
      
      if (permValue < minValue) {
        return res.status(403).json({ 
          message: 'Access forbidden - insufficient permissions',
          requiredPermission: permKey,
          requiredValue: minValue,
          actualValue: permValue
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

module.exports = { checkAuth, checkPermission };