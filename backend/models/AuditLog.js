// Audit Log Model
// Tracks all email deletion activities for compliance and investigation

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // User who owns the deleted email
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Email that was deleted
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
    },

    // Gmail ID for reference
    gmailId: {
      type: String,
      required: true,
    },

    // Email subject (snapshot)
    emailSubject: {
      type: String,
      required: true,
    },

    // Email sender (snapshot)
    emailSender: {
      type: String,
      required: true,
    },

    // Reason: 'phishing_auto_delete' or 'user_manual_delete'
    reason: {
      type: String,
      enum: ['phishing_auto_delete', 'user_manual_delete'],
      required: true,
      index: true,
    },

    // ML classification confidence (0-1)
    mlConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: null,
    },

    // Audit lifecycle status
    status: {
      type: String,
      enum: ['pending', 'deleted', 'recovered', 'failed'],
      default: 'pending',
    },

    // Additional notes
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying user's audit logs
auditLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
