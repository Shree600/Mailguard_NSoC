// Import mongoose for schema creation
const mongoose = require('mongoose');

/**
 * Feedback Schema Definition
 * Stores user feedback on phishing predictions for reinforcement learning
 * This allows the model to learn from corrections and improve over time
 */
const feedbackSchema = new mongoose.Schema(
  {
    // Reference to the email that was classified
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email', // References the Email model
      required: [true, 'Email ID is required'],
      index: true, // Index for faster queries by email
    },

    // Reference to the user who provided the feedback
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // References the User model
      required: [true, 'User ID is required'],
      index: true, // Index for faster queries by user
    },

    // The label that was originally predicted by the ML model
    predictedLabel: {
      type: String,
      required: [true, 'Predicted label is required'],
      enum: ['phishing', 'legitimate'], // Only allow these two values
      trim: true,
    },

    // The correct label as provided by the user
    correctLabel: {
      type: String,
      required: [true, 'Correct label is required'],
      enum: ['phishing', 'legitimate'], // Only allow these two values
      trim: true,
    },

    // Optional: User comments or notes about the feedback
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },

    // Track if this feedback was used in retraining
    usedInTraining: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true,
  }
);

/**
 * Compound Index
 * Ensures one user cannot submit multiple feedback for the same email
 * This prevents duplicate feedback entries
 */
feedbackSchema.index({ emailId: 1, userId: 1 }, { unique: true });

/**
 * Instance Method: Check if prediction was correct
 * Returns true if predicted label matches correct label
 */
feedbackSchema.methods.isPredictionCorrect = function () {
  return this.predictedLabel === this.correctLabel;
};

/**
 * Static Method: Get feedback statistics
 * Returns count of correct vs incorrect predictions
 */
feedbackSchema.statics.getStats = async function () {
  const feedbacks = await this.find();
  
  const stats = {
    total: feedbacks.length,
    correct: 0,
    incorrect: 0,
    accuracy: 0,
  };

  feedbacks.forEach((feedback) => {
    if (feedback.predictedLabel === feedback.correctLabel) {
      stats.correct++;
    } else {
      stats.incorrect++;
    }
  });

  if (stats.total > 0) {
    stats.accuracy = ((stats.correct / stats.total) * 100).toFixed(2);
  }

  return stats;
};

// Create and export the Feedback model
const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
