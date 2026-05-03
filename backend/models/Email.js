// Import mongoose for schema creation
const mongoose = require('mongoose');

const EMAIL_FIELD_MAX_LENGTHS = {
  gmailId: 255,
  body: 100000,
  htmlBody: 500000,
  threadId: 255,
  snippet: 1000,
  labelId: 128,
};

/**
 * Email Schema Definition
 * Stores emails fetched from Gmail for phishing analysis
 */
const emailSchema = new mongoose.Schema(
  {
    // Reference to the user who owns this email
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References the User model
      required: [true, 'User ID is required'],
      index: true, // Index for faster queries by user
    },

    // Unique Gmail message ID
    gmailId: {
      type: String,
      required: [true, 'Gmail ID is required'],
      unique: true, // Prevents duplicate emails
      index: true, // Index for faster lookups
      maxlength: [
        EMAIL_FIELD_MAX_LENGTHS.gmailId,
        `Gmail ID cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.gmailId} characters`,
      ],
    },

    // Email sender (from address)
    sender: {
      type: String,
      required: [true, 'Sender is required'],
      trim: true,
      lowercase: true,
      maxlength: [320, 'Email address cannot exceed 320 characters'],
    },

    // Email subject line
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      default: '(No Subject)',
      maxlength: [998, 'Subject cannot exceed 998 characters'],
    },

    // Email body content (plain text)
    body: {
      type: String,
      required: [true, 'Body is required'],
      default: '',
      maxlength: [
        EMAIL_FIELD_MAX_LENGTHS.body,
        `Body cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.body} characters`,
      ],
    },

    // Original HTML body (if available)
    htmlBody: {
      type: String,
      default: null,
      maxlength: [
        EMAIL_FIELD_MAX_LENGTHS.htmlBody,
        `HTML body cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.htmlBody} characters`,
      ],
    },

    // Timestamp when email was received in Gmail
    receivedAt: {
      type: Date,
      required: [true, 'Received date is required'],
      index: true, // Index for sorting by date
    },

    // Timestamp when email was fetched/imported into our system
    fetchedAt: {
      type: Date,
      default: Date.now,
    },

    // Phishing classification (will be used in Phase 3 with ML)
    classification: {
      type: String,
      enum: ['pending', 'legitimate', 'phishing', 'suspicious'],
      default: 'pending',
    },

    // Confidence score from ML model (0-100)
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // Whether email has been analyzed
    isAnalyzed: {
      type: Boolean,
      default: false,
    },

    // Additional metadata
    metadata: {
      threadId: {
        type: String,
        maxlength: [
          EMAIL_FIELD_MAX_LENGTHS.threadId,
          `Thread ID cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.threadId} characters`,
        ],
      }, // Gmail thread ID
      labelIds: [
        {
          type: String,
          maxlength: [
            EMAIL_FIELD_MAX_LENGTHS.labelId,
            `Label ID cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.labelId} characters`,
          ],
        },
      ], // Gmail labels
      snippet: {
        type: String,
        maxlength: [
          EMAIL_FIELD_MAX_LENGTHS.snippet,
          `Snippet cannot exceed ${EMAIL_FIELD_MAX_LENGTHS.snippet} characters`,
        ],
      }, // Email preview snippet
      hasAttachments: { type: Boolean, default: false },
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

/**
 * INDEXES
 * Compound indexes for common query patterns
 */

// Index for getting user's emails sorted by date
emailSchema.index({ userId: 1, receivedAt: -1 });

// Index for finding unanalyzed emails
emailSchema.index({ isAnalyzed: 1, userId: 1 });

// Index for classification queries
emailSchema.index({ userId: 1, classification: 1 });

// Text index for full-text search on subject, sender, and body
// CRITICAL: Enables fast search without regex scanning entire collection
// Performance: O(log n) index lookup vs O(n) collection scan
emailSchema.index(
  { 
    subject: 'text', 
    sender: 'text', 
    body: 'text' 
  },
  {
    name: 'email_text_search',
    weights: {
      subject: 10,  // Subject matches weighted higher
      sender: 5,    // Sender matches weighted medium
      body: 1       // Body matches weighted normal
    },
    default_language: 'english'
  }
);

// Compound index for date range queries with sorting
// Optimizes: Email.find({ userId, receivedAt: {...} }).sort({ receivedAt: -1 })
emailSchema.index({ userId: 1, receivedAt: -1, classification: 1 });

/**
 * INSTANCE METHODS
 */

// Method to mark email as analyzed
emailSchema.methods.markAsAnalyzed = function(classification, confidenceScore) {
  this.isAnalyzed = true;
  this.classification = classification;
  this.confidenceScore = confidenceScore;
  return this.save();
};

/**
 * STATIC METHODS
 */

// Get all emails for a user
emailSchema.statics.findByUserId = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ receivedAt: -1 })
    .limit(limit)
    .select('-htmlBody'); // Exclude HTML body for performance
};

// Get unanalyzed emails for a user
emailSchema.statics.findUnanalyzed = function(userId) {
  return this.find({ userId, isAnalyzed: false })
    .sort({ receivedAt: -1 })
    .select('-htmlBody');
};

// Get phishing emails for a user
emailSchema.statics.findPhishing = function(userId) {
  return this.find({ userId, classification: 'phishing' })
    .sort({ receivedAt: -1 })
    .select('-htmlBody -body');
};

// Count emails by classification
emailSchema.statics.getStatsByUserId = async function(userId) {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { 
      $group: {
        _id: '$classification',
        count: { $sum: 1 }
      }
    }
  ]);

  // Format results
  const result = {
    total: 0,
    pending: 0,
    legitimate: 0,
    phishing: 0,
    suspicious: 0
  };

  stats.forEach(stat => {
    result[stat._id] = stat.count;
    result.total += stat.count;
  });

  return result;
};

/**
 * Create and export Email model
 */
const Email = mongoose.model('Email', emailSchema);

module.exports = Email;
