// Import jsonwebtoken for token verification
const jwt = require('jsonwebtoken');

/**
 * JWT AUTHENTICATION MIDDLEWARE
 * Protects routes by verifying JWT token
 * Attaches userId to request object for use in protected routes
 * 
 * Usage: Add this middleware to any route that requires authentication
 * Example: router.get('/profile', authMiddleware, getProfile);
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    // Expected format: "Bearer <token>"
    const authHeader = req.headers.authorization;

    // Check if Authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Check if header follows "Bearer <token>" format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format. Use: Bearer <token>',
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(' ')[1];

    // Verify token is present
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify and decode the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach userId to request object
    // This makes the userId available in all protected route handlers
    req.userId = decoded.userId;

    // Call next middleware or route handler
    next();
  } catch (error) {
    // Handle invalid or expired tokens
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.',
      });
    }

    // Handle any other errors
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
    });
  }
};

// Export the middleware
module.exports = authMiddleware;
