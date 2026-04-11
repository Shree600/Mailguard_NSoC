// Classification Model
// Stores ML predictions for emails

const mongoose = require('mongoose');

const classificationSchema = new mongoose.Schema({
  // Reference to the email that was classified
  emailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email',
    required: true
  },
  
  // Prediction result: "phishing" or "safe"
  prediction: {
    type: String,
    enum: ['phishing', 'safe'],
    required: [true, 'Prediction is required'],
    trim: true
  },
  
  // Confidence score (0-1)
  confidence: {
    type: Number,
    required: [true, 'Confidence score is required'],
    min: [0, 'Confidence must be at least 0'],
    max: [1, 'Confidence cannot exceed 1']
  },
  
  // Probability breakdown
  probabilities: {
    safe: {
      type: Number,
      required: [true, 'Safe probability is required'],
      min: [0, 'Probability must be at least 0'],
      max: [1, 'Probability cannot exceed 1']
    },
    phishing: {
      type: Number,
      required: [true, 'Phishing probability is required'],
      min: [0, 'Probability must be at least 0'],
      max: [1, 'Probability cannot exceed 1']
    }
  },

  // Lightweight explainability signals from ML service
  explanation: {
    top_signals: [
      {
        token: { type: String, trim: true },
        score: { type: Number, min: 0 }
      }
    ],
    method: {
      type: String,
      default: 'unavailable',
      trim: true
    }
  },
  
  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for faster queries
classificationSchema.index({ emailId: 1 }, { unique: true }); // Prevent duplicates
classificationSchema.index({ prediction: 1 });
classificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Classification', classificationSchema);
