/**
 * CLERK USER SYNC MIDDLEWARE
 * Ensures Clerk user exists in MongoDB database
 * Creates user if not exists, then proceeds to next middleware
 */

const User = require('../models/User');
const { clerkClient } = require('@clerk/clerk-sdk-node');

const syncUserMiddleware = async (req, res, next) => {
  try {
    const clerkUserId = req.userId; // Set by authMiddleware

    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if user exists in MongoDB by Clerk ID
    let user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      // User doesn't exist by Clerk ID, fetch from Clerk
      console.log(`📝 Syncing user in database for Clerk ID: ${clerkUserId}`);
      
      try {
        // Fetch user details from Clerk
        const clerkUser = await clerkClient.users.getUser(clerkUserId);
        const userEmail = clerkUser.emailAddresses[0]?.emailAddress || '';
        const userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';
        
        // Check if user exists by email (from old JWT system)
        user = await User.findOne({ email: userEmail });
        
        if (user) {
          // User exists by email, update with Clerk ID
          console.log(`🔄 Updating existing user with Clerk ID: ${userEmail}`);
          user.clerkId = clerkUserId;
          user.name = userName;
          await user.save();
          console.log(`✅ User updated with Clerk ID: ${user.email}`);
        } else {
          // Create new user
          user = await User.create({
            clerkId: clerkUserId,
            email: userEmail,
            name: userName,
          });
          console.log(`✅ User created in database: ${user.email}`);
        }
      } catch (clerkError) {
        console.error('❌ Failed to sync user from Clerk:', clerkError);
        return res.status(500).json({
          success: false,
          message: 'Failed to sync user with Clerk'
        });
      }
    }

    // Attach MongoDB user ID to request
    req.mongoUserId = user._id;
    
    next();
  } catch (error) {
    console.error('❌ User sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync user data',
      error: error.message
    });
  }
};

module.exports = syncUserMiddleware;
