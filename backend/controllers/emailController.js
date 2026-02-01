// Email Controller
// Handles email classification and related operations

const Email = require('../models/Email');
const Classification = require('../models/Classification');
const mlService = require('../services/mlService');
const { deleteEmail: deleteGmailEmail } = require('../services/gmailService');
const User = require('../models/User');

/**
 * Classify all unclassified emails using ML service
 * POST /api/emails/classify
 */
exports.classifyEmails = async (req, res) => {
  try {
    console.log('📊 Starting email classification...');

    // Check if ML service is available
    const isHealthy = await mlService.checkHealth();
    if (!isHealthy) {
      return res.status(503).json({
        success: false,
        error: 'ML service is not available'
      });
    }

    // Find all emails that haven't been classified yet
    const classifiedEmailIds = await Classification.distinct('emailId');
    const unclassifiedEmails = await Email.find({
      _id: { $nin: classifiedEmailIds }
    }).limit(100); // Process in batches

    if (unclassifiedEmails.length === 0) {
      return res.json({
        success: true,
        message: 'No unclassified emails found',
        stats: {
          processed: 0,
          phishing: 0,
          safe: 0
        }
      });
    }

    console.log(`📧 Found ${unclassifiedEmails.length} unclassified emails`);

    // Classify each email
    const results = {
      processed: 0,
      phishing: 0,
      safe: 0,
      errors: 0
    };

    for (const email of unclassifiedEmails) {
      try {
        // Combine subject and body for better classification
        const emailText = `${email.subject || ''} ${email.body || ''}`.trim();

        if (!emailText) {
          console.log(`⏭️  Skipping email ${email._id} - no text content`);
          continue;
        }

        // Get prediction from ML service
        console.log(`🤖 Classifying email: ${email.subject?.substring(0, 50) || 'No subject'}...`);
        const prediction = await mlService.predictEmail(emailText);

        // Save classification to database
        await Classification.create({
          emailId: email._id,
          prediction: prediction.prediction,
          confidence: prediction.confidence,
          probabilities: prediction.probabilities
        });

        // Update stats
        results.processed++;
        if (prediction.prediction === 'phishing') {
          results.phishing++;
        } else {
          results.safe++;
        }

        console.log(`✅ Classified as: ${prediction.prediction} (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`);

      } catch (error) {
        console.error(`❌ Error classifying email ${email._id}:`, error.message);
        results.errors++;
      }
    }

    console.log('🎉 Classification complete!');

    res.json({
      success: true,
      message: `Successfully classified ${results.processed} emails`,
      stats: results
    });

  } catch (error) {
    console.error('❌ Classification error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get classification statistics
 * GET /api/emails/stats
 */
exports.getClassificationStats = async (req, res) => {
  try {
    const stats = await Classification.aggregate([
      {
        $group: {
          _id: '$prediction',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      }
    ]);

    const totalEmails = await Email.countDocuments();
    const classifiedCount = await Classification.countDocuments();

    res.json({
      success: true,
      data: {
        totalEmails,
        classifiedCount,
        unclassifiedCount: totalEmails - classifiedCount,
        byPrediction: stats
      }
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get all classified emails with predictions
 * GET /api/emails/classified
 */
exports.getClassifiedEmails = async (req, res) => {
  try {
    const { prediction, limit = 50 } = req.query;

    // Build query
    const query = {};
    if (prediction) {
      query.prediction = prediction;
    }

    const classifications = await Classification
      .find(query)
      .populate('emailId')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: classifications.length,
      data: classifications
    });

  } catch (error) {
    console.error('❌ Get classified emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete a single email from Gmail and Database
 * DELETE /api/emails/:id
 */
exports.deleteEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From auth middleware

    console.log(`🗑️  Delete request for email ID: ${id} by user: ${userId}`);

    // Step 1: Find the email in database
    const email = await Email.findOne({ _id: id, userId: userId });

    if (!email) {
      return res.status(404).json({
        success: false,
        error: 'Email not found or you do not have permission to delete it'
      });
    }

    console.log(`📧 Found email: ${email.subject} (Gmail ID: ${email.gmailId})`);

    // Step 2: Get user's Gmail tokens
    const user = await User.findById(userId);

    if (!user || !user.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Gmail not connected. Cannot delete email from Gmail.'
      });
    }

    // Step 3: Delete from Gmail using Gmail API
    try {
      await deleteGmailEmail(
        email.gmailId,
        user.gmailAccessToken,
        user.gmailRefreshToken
      );
      console.log(`✅ Email deleted from Gmail: ${email.gmailId}`);
    } catch (gmailError) {
      console.error(`⚠️  Gmail deletion failed: ${gmailError.message}`);
      // Continue to delete from DB even if Gmail deletion fails
      // (email might already be deleted from Gmail)
    }

    // Step 4: Delete associated classification
    await Classification.deleteOne({ emailId: email._id });
    console.log(`✅ Classification deleted for email: ${email._id}`);

    // Step 5: Delete email from database
    await Email.deleteOne({ _id: email._id });
    console.log(`✅ Email deleted from database: ${email._id}`);

    // Step 6: Return success response
    res.json({
      success: true,
      message: 'Email deleted successfully',
      deletedEmail: {
        id: email._id,
        subject: email.subject,
        sender: email.sender,
        gmailId: email.gmailId
      }
    });

  } catch (error) {
    console.error('❌ Delete email error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Bulk delete multiple emails from Gmail and Database
 * POST /api/emails/bulk-delete
 * Body: { emailIds: [id1, id2, id3] }
 */
exports.bulkDeleteEmails = async (req, res) => {
  try {
    const { emailIds } = req.body;
    const userId = req.user.id; // From auth middleware

    console.log(`🗑️  Bulk delete request for ${emailIds?.length || 0} emails by user: ${userId}`);

    // Step 1: Validate input
    if (!emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'emailIds array is required and must not be empty'
      });
    }

    // Limit bulk delete to prevent abuse
    if (emailIds.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete more than 100 emails at once'
      });
    }

    // Step 2: Find all emails belonging to the user
    const emails = await Email.find({
      _id: { $in: emailIds },
      userId: userId // Security: only delete user's own emails
    });

    if (emails.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No emails found or you do not have permission to delete them'
      });
    }

    console.log(`📧 Found ${emails.length} emails to delete`);

    // Step 3: Get user's Gmail tokens
    const user = await User.findById(userId);

    if (!user || !user.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Gmail not connected. Cannot delete emails from Gmail.'
      });
    }

    // Step 4: Delete each email from Gmail and database
    const results = {
      total: emails.length,
      successful: 0,
      failed: 0,
      gmailErrors: 0,
      deletedEmails: []
    };

    for (const email of emails) {
      try {
        // Delete from Gmail
        try {
          await deleteGmailEmail(
            email.gmailId,
            user.gmailAccessToken,
            user.gmailRefreshToken
          );
          console.log(`✅ Gmail deleted: ${email.gmailId}`);
        } catch (gmailError) {
          console.error(`⚠️  Gmail deletion failed for ${email.gmailId}: ${gmailError.message}`);
          results.gmailErrors++;
          // Continue to delete from DB even if Gmail deletion fails
        }

        // Delete classification
        await Classification.deleteOne({ emailId: email._id });

        // Delete from database
        await Email.deleteOne({ _id: email._id });

        results.successful++;
        results.deletedEmails.push({
          id: email._id,
          subject: email.subject,
          sender: email.sender
        });

        console.log(`✅ Deleted: ${email.subject}`);

      } catch (error) {
        console.error(`❌ Failed to delete email ${email._id}:`, error.message);
        results.failed++;
      }
    }

    console.log(`✅ Bulk delete complete: ${results.successful} successful, ${results.failed} failed`);

    // Step 5: Return results
    res.json({
      success: true,
      message: `Successfully deleted ${results.successful} out of ${results.total} emails`,
      results: results
    });

  } catch (error) {
    console.error('❌ Bulk delete emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
