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
    required: true
  },
  
  // Confidence score (0-1)
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  
  // Probability breakdown
  probabilities: {
    safe: {
      type: Number,
      required: true
    },
    phishing: {
      type: Number,
      required: true
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
