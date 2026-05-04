// Import mongoose for schema creation
const mongoose = require('mongoose');
const { encryptIfNeeded, decryptIfNeeded } = require('../utils/encryption');

/**
 * User Schema Definition
 * Defines the structure of user documents in MongoDB
 * Now uses Clerk for authentication
 */
const userSchema = new mongoose.Schema(
  {
    // Clerk User ID (primary identifier from Clerk authentication)
    clerkId: {
      type: String,
      required: [true, 'Clerk ID is required'],
      unique: true,
    },

    // User's email address (synced from Clerk)
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // Ensures no duplicate emails
      lowercase: true, // Converts email to lowercase
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ], // Email validation regex
    },

    // User's full name (synced from Clerk)
    name: {
      type: String,
      trim: true, // Removes whitespace from both ends
    },

    // User role for authorization (admin, user, analyst)
    role: {
      type: String,
      enum: ['user', 'admin', 'analyst'],
      default: 'user',
    },

    // ================================================
    // GMAIL OAUTH INTEGRATION FIELDS
    // ================================================

    // Google user ID (unique identifier from Google)
    googleId: {
      type: String,
      default: null,
      sparse: true, // Allows multiple null values, but unique non-null values
    },

    // Gmail access token (short-lived, used for API calls)
    gmailAccessToken: {
      type: String,
      default: null,
    },

    // Gmail refresh token (long-lived, used to get new access tokens)
    gmailRefreshToken: {
      type: String,
      default: null,
    },

    // Timestamp when Gmail was last connected
    gmailConnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

/**
 * Pre-save hook: Encrypt Gmail refresh token before saving to database
 */
userSchema.pre('save', function (next) {
  try {
    // Only encrypt if gmailRefreshToken is modified and not null
    if (this.isModified('gmailRefreshToken') && this.gmailRefreshToken) {
      this.gmailRefreshToken = encryptIfNeeded(this.gmailRefreshToken);
    }
    next();
  } catch (error) {
    next(error);
  }
});

function encryptRefreshTokenUpdate(update) {
  if (!update || Array.isArray(update)) return;

  if (Object.prototype.hasOwnProperty.call(update, 'gmailRefreshToken')) {
    update.gmailRefreshToken = encryptIfNeeded(update.gmailRefreshToken);
  }

  ['$set', '$setOnInsert'].forEach((operator) => {
    if (
      update[operator] &&
      Object.prototype.hasOwnProperty.call(update[operator], 'gmailRefreshToken')
    ) {
      update[operator].gmailRefreshToken = encryptIfNeeded(update[operator].gmailRefreshToken);
    }
  });
}

function encryptRefreshTokenInQuery(next) {
  try {
    encryptRefreshTokenUpdate(this.getUpdate());
    next();
  } catch (error) {
    next(error);
  }
}

userSchema.pre('findOneAndUpdate', encryptRefreshTokenInQuery);
userSchema.pre('updateOne', encryptRefreshTokenInQuery);
userSchema.pre('updateMany', encryptRefreshTokenInQuery);

/**
 * Post-find hook: Decrypt Gmail refresh token after retrieval
 * Applied to find, findOne, findById operations
 */
const decryptRefreshToken = function (doc) {
  if (doc && doc.gmailRefreshToken) {
    try {
      doc.gmailRefreshToken = decryptIfNeeded(doc.gmailRefreshToken);
    } catch (error) {
      console.error('❌ Failed to decrypt refresh token:', error.message);
      doc.gmailRefreshToken = null; // Clear corrupted token
    }
  }
};

userSchema.post('find', function (docs) {
  if (Array.isArray(docs)) {
    docs.forEach(decryptRefreshToken);
  }
});

userSchema.post('findOne', decryptRefreshToken);
userSchema.post('findById', decryptRefreshToken);

/**
 * Create and export User model
 * This model will be used to interact with the 'users' collection
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
