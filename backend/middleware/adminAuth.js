const User = require('../models/User');

/**
 * ADMIN AUTHORIZATION MIDDLEWARE
 * Verifies that authenticated user has admin role
 * Must be used AFTER authMiddleware and syncUserMiddleware
 * 
 * Usage: router.post('/admin/endpoint', authMiddleware, syncUserMiddleware, adminAuth, handler);
 */
const adminAuth = async (req, res, next) => {
  try {
    const userId = req.mongoUserId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Fetch user from database to check role
    const user = await User.findById(userId).select('role email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has admin role
    if (user.role !== 'admin') {
      console.warn(`⚠️  Unauthorized admin access attempt by user: ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Log admin action for audit trail
    console.log(`🔐 Admin action by: ${user.email} | Route: ${req.method} ${req.originalUrl}`);

    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      error: error.message
    });
  }
};

module.exports = adminAuth;
