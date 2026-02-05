// Feedback Controller
// Handles user feedback on email classifications for reinforcement learning

const Feedback = require('../models/Feedback');
const Classification = require('../models/Classification');
const Email = require('../models/Email');

/**
 * Submit feedback on an email classification
 * POST /api/feedback
 * 
 * Request body:
 * {
 *   emailId: "mongoId",
 *   correctLabel: "phishing" or "legitimate",
 *   notes: "optional explanation"
 * }
 */
exports.submitFeedback = async (req, res) => {
  try {
    const { emailId, gmailId, correctLabel, notes } = req.body;
    const userId = req.mongoUserId; // From syncUserMiddleware

    // Validate required fields - accept EITHER emailId OR gmailId
    if ((!emailId && !gmailId) || !correctLabel) {
      return res.status(400).json({
        success: false,
        error: 'Either emailId or gmailId must be provided along with correctLabel'
      });
    }

    // Validate correctLabel value
    if (!['phishing', 'legitimate'].includes(correctLabel)) {
      return res.status(400).json({
        success: false,
        error: 'correctLabel must be either "phishing" or "legitimate"'
      });
    }

    console.log(`📝 Processing feedback for email (emailId: ${emailId}, gmailId: ${gmailId}) from user ${userId}`);

    // Find email by either MongoDB _id or gmailId
    let email;
    if (emailId) {
      // Lookup by MongoDB ObjectId
      email = await Email.findById(emailId);
    } else {
      // Lookup by gmailId
      email = await Email.findOne({ gmailId, userId }); // Include userId for security
    }

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found'
      });
    }

    // Check if email belongs to this user (security check)
    if (email.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only provide feedback on your own emails'
      });
    }

    // Get the classification for this email
    const classification = await Classification.findOne({ emailId: email._id });
    if (!classification) {
      return res.status(404).json({
        success: false,
        error: 'No classification found for this email. Please classify it first.'
      });
    }

    // Map ML service prediction format to feedback format
    // ML service uses "safe" but we use "legitimate" for consistency
    const predictedLabel = classification.prediction === 'phishing' 
      ? 'phishing' 
      : 'legitimate';

    // Use findOneAndUpdate with upsert for atomic operation
    // This prevents race conditions and handles both create and update in one operation
    const feedback = await Feedback.findOneAndUpdate(
      { 
        emailId: email._id, 
        userId 
      },
      {
        predictedLabel,
        correctLabel,
        notes: notes || undefined,
        usedInTraining: false // Reset training flag on update
      },
      {
        upsert: true, // Create if doesn't exist
        new: true, // Return updated document
        runValidators: true, // Run schema validations
        setDefaultsOnInsert: true // Set default values on insert
      }
    );

    // Determine if this was an update or new feedback
    const isUpdate = feedback.updatedAt && 
                     (Date.now() - feedback.updatedAt.getTime() < 1000);

    // Return success response
    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate ? 'Feedback updated successfully' : 'Feedback submitted successfully',
      feedback: {
        id: feedback._id,
        emailId: feedback.emailId,
        predictedLabel: feedback.predictedLabel,
        correctLabel: feedback.correctLabel,
        wasCorrect: feedback.isPredictionCorrect(),
        createdAt: feedback.createdAt,
        updatedAt: feedback.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    
    // Handle duplicate key error (shouldn't happen due to check above, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Feedback already exists for this email. Use PUT to update.'
      });
    }

    // Handle specific error types
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid email ID format'
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
      details: error.message
    });
  }
};

/**
 * Get all feedback submitted by the current user
 * GET /api/feedback
 */
exports.getUserFeedback = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Get all feedback with email details populated
    const feedbacks = await Feedback.find({ userId })
      .populate({
        path: 'emailId',
        select: 'subject sender receivedAt'
      })
      .sort({ createdAt: -1 }); // Most recent first

    return res.json({
      success: true,
      count: feedbacks.length,
      feedbacks: feedbacks.map(f => ({
        id: f._id,
        email: f.emailId ? {
          id: f.emailId._id,
          subject: f.emailId.subject,
          sender: f.emailId.sender,
          receivedAt: f.emailId.receivedAt
        } : null,
        predictedLabel: f.predictedLabel,
        correctLabel: f.correctLabel,
        wasCorrect: f.isPredictionCorrect(),
        notes: f.notes,
        usedInTraining: f.usedInTraining,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching user feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch feedback',
      details: error.message
    });
  }
};

/**
 * Get feedback statistics
 * GET /api/feedback/stats
 */
exports.getFeedbackStats = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Get user-specific stats
    const userFeedbacks = await Feedback.find({ userId });
    
    const userStats = {
      total: userFeedbacks.length,
      correct: 0,
      incorrect: 0,
      accuracy: 0
    };

    userFeedbacks.forEach(f => {
      if (f.isPredictionCorrect()) {
        userStats.correct++;
      } else {
        userStats.incorrect++;
      }
    });

    if (userStats.total > 0) {
      userStats.accuracy = ((userStats.correct / userStats.total) * 100).toFixed(2);
    }

    // Get global stats using the static method
    const globalStats = await Feedback.getStats();

    return res.json({
      success: true,
      stats: {
        user: userStats,
        global: globalStats
      }
    });

  } catch (error) {
    console.error('❌ Error fetching feedback stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
};

/**
 * Delete feedback
 * DELETE /api/feedback/:id
 */
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.mongoUserId;

    // Find feedback
    const feedback = await Feedback.findById(id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found'
      });
    }

    // Check ownership
    if (feedback.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own feedback'
      });
    }

    await Feedback.findByIdAndDelete(id);

    console.log(`✅ Deleted feedback ${id}`);

    return res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting feedback:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete feedback',
      details: error.message
    });
  }
};
