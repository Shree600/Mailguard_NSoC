// Import mongoose for schema creation
const mongoose = require('mongoose');

/**
 * User Schema Definition
 * Defines the structure of user documents in MongoDB
 */
const userSchema = new mongoose.Schema(
  {
    // User's full name
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true, // Removes whitespace from both ends
    },

    // User's email address
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

    // Hashed password (never store plain text passwords)
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
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
 * Create and export User model
 * This model will be used to interact with the 'users' collection
 */
const User = mongoose.model('User', userSchema);

module.exports = User;
