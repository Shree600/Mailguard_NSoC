/**
 * CLERK USER SYNC MIDDLEWARE
 * Ensures Clerk user exists in MongoDB database.
 * Only links accounts via VERIFIED email addresses.
 */

const User = require('../models/User');
const { clerkClient } = require('@clerk/clerk-sdk-node');

const syncUserMiddleware = async (req, res, next) => {
  try {
    const clerkUserId = req.userId; // Set by Clerk authMiddleware

    if (!clerkUserId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Fast path: user already synced
    let user = await User.findOne({ clerkId: clerkUserId });

    if (!user) {
      console.log(`📝 Syncing new user for Clerk ID: ${clerkUserId}`);

      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (clerkError) {
        console.error('❌ Failed to fetch user from Clerk:', clerkError);
        return res.status(500).json({ success: false, message: 'Failed to sync user with Clerk' });
      }

      // Only trust verified email addresses — never link on unverified email
      const verifiedEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId && e.verification?.status === 'verified'
      );

      if (!verifiedEmail) {
        console.warn(`⚠️ Clerk user ${clerkUserId} has no verified primary email`);
        return res.status(403).json({
          success: false,
          message: 'Account email is not verified. Please verify your email before continuing.',
        });
      }

      const userEmail = verifiedEmail.emailAddress.toLowerCase();
      const userName =
        `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User';

      // Check for existing account by verified email only
      user = await User.findOne({ email: userEmail });

      if (user) {
        // Link existing account to Clerk ID
        console.log(`🔄 Linking existing account to Clerk ID: ${userEmail}`);
        user.clerkId = clerkUserId;
        user.name = userName;
        await user.save();
        console.log(`✅ Account linked: ${user.email}`);
      } else {
        user = await User.create({ clerkId: clerkUserId, email: userEmail, name: userName });
        console.log(`✅ New user created: ${user.email}`);
      }
    }

    req.mongoUserId = user._id;
    next();
  } catch (error) {
    console.error('❌ User sync error:', error);
    res.status(500).json({ success: false, message: 'Failed to sync user data', error: error.message });
  }
};

module.exports = syncUserMiddleware;
