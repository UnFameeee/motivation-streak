const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

/**
 * Middleware to authenticate user using JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from the token
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] } // Don't include password
      });
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      if (!user.is_active) {
        return res.status(401).json({ message: 'User account is inactive' });
      }
      
      // Add user to request object
      req.user = user;
      
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      return res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (err) {
    console.error('Authentication error:', err.message);
    res.status(500).json({ message: 'Server Error' });
  }
};

/**
 * Middleware to check if user is admin
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied, admin privileges required' });
  }
};

/**
 * Optional authentication middleware - doesn't reject if no token is present
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Continue without authentication
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });
      
      if (user && user.is_active) {
        req.user = user;
      }
      
      next();
    } catch (err) {
      // Continue without authentication if token is invalid
      next();
    }
  } catch (err) {
    console.error('Optional authentication error:', err.message);
    next();
  }
};

module.exports = {
  authenticate,
  isAdmin,
  optionalAuth
}; 