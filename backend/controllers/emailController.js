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
    const userId = req.mongoUserId;

    // Get user's emails
    const userEmails = await Email.find({ userId }).select('_id');
    const emailIds = userEmails.map(e => e._id);

    // Get classifications for user's emails
    const classifications = await Classification.find({
      emailId: { $in: emailIds }
    });

    // Count by prediction
    const phishing = classifications.filter(c => c.prediction === 'phishing').length;
    const safe = classifications.filter(c => c.prediction === 'safe').length;
    const total = userEmails.length;

    res.json({
      success: true,
      total: total,
      phishing: phishing,
      safe: safe,
      legitimate: safe,
      classified: classifications.length,
      unclassified: total - classifications.length
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
 * Query params: page, limit, prediction, search, dateFrom, dateTo
 */
exports.getClassifiedEmails = async (req, res) => {
  try {
    const userId = req.mongoUserId;
    const { 
      prediction, 
      limit = 50, 
      page = 1,
      search = '',
      dateFrom,
      dateTo,
      sortBy = 'receivedAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = { userId };
    
    // Add date range filter if provided
    if (dateFrom || dateTo) {
      filter.receivedAt = {};
      if (dateFrom) {
        filter.receivedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.receivedAt.$lte = new Date(dateTo);
      }
    }
    
    // Add search filter if provided
    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { sender: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const limitNum = Math.min(Math.max(parseInt(limit), 1), 100); // Between 1 and 100
    const pageNum = Math.max(parseInt(page), 1);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalEmails = await Email.countDocuments(filter);
    const totalPages = Math.ceil(totalEmails / limitNum);

    // Determine sort direction
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortObj = { [sortBy]: sortDirection };

    // Get user's emails with pagination
    const userEmails = await Email.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    // Get classifications for these emails
    const emailIds = userEmails.map(e => e._id);
    const classifications = await Classification.find({
      emailId: { $in: emailIds }
    });

    // Create a map of emailId -> classification
    const classificationMap = {};
    classifications.forEach(c => {
      classificationMap[c.emailId.toString()] = c;
    });

    // Combine emails with their classifications
    const emailsWithClassifications = userEmails.map(email => {
      const classification = classificationMap[email._id.toString()];
      return {
        _id: email._id,
        subject: email.subject,
        sender: email.sender,
        body: email.body?.substring(0, 200) || '',
        receivedAt: email.receivedAt,
        gmailId: email.gmailId,
        prediction: classification?.prediction || 'pending',
        confidence: classification?.confidence || 0,
        classified: !!classification
      };
    });

    // Filter by prediction if specified (post-query filter for pending emails)
    let filteredEmails = emailsWithClassifications;
    if (prediction) {
      filteredEmails = emailsWithClassifications.filter(e => e.prediction === prediction);
    }

    res.json({
      success: true,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalEmails,
        totalPages: totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      },
      count: filteredEmails.length,
      emails: filteredEmails
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
    const userId = req.mongoUserId; // From syncUserMiddleware

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

    // Step 3: Delete from Gmail using Gmail API (MUST succeed before DB deletion)
    try {
      await deleteGmailEmail(
        email.gmailId,
        user.gmailAccessToken,
        user.gmailRefreshToken
      );
      console.log(`✅ Email deleted from Gmail: ${email.gmailId}`);
    } catch (gmailError) {
      console.error(`❌ Gmail deletion failed: ${gmailError.message}`);
      
      // If Gmail deletion fails, do NOT delete from database
      // Return error to user indicating the problem
      return res.status(500).json({
        success: false,
        error: 'Failed to delete email from Gmail. Database record preserved.',
        details: gmailError.message
      });
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
    const userId = req.mongoUserId; // From syncUserMiddleware

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
        // Delete from Gmail (MUST succeed before DB deletion)
        try {
          await deleteGmailEmail(
            email.gmailId,
            user.gmailAccessToken,
            user.gmailRefreshToken
          );
          console.log(`✅ Gmail deleted: ${email.gmailId}`);
        } catch (gmailError) {
          console.error(`❌ Gmail deletion failed for ${email.gmailId}: ${gmailError.message}`);
          results.gmailErrors++;
          results.failed++;
          // Skip DB deletion if Gmail deletion fails
          continue;
        }

        // Only proceed if Gmail deletion succeeded
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

/**
 * Auto clean all phishing emails
 * POST /api/emails/clean-phishing
 * Finds all emails classified as phishing and deletes them
 */
exports.cleanPhishingEmails = async (req, res) => {
  try {
    const userId = req.mongoUserId; // From syncUserMiddleware

    console.log(`🧹 Auto-clean phishing emails request by user: ${userId}`);

    // Step 1: Find all phishing classifications for user's emails
    const userEmails = await Email.find({ userId: userId }).select('_id');
    const userEmailIds = userEmails.map(e => e._id);

    // Find all phishing classifications
    const phishingClassifications = await Classification.find({
      emailId: { $in: userEmailIds },
      prediction: 'phishing'
    });

    if (phishingClassifications.length === 0) {
      return res.json({
        success: true,
        message: 'No phishing emails found to clean',
        results: {
          total: 0,
          deleted: 0,
          failed: 0
        }
      });
    }

    console.log(`🎯 Found ${phishingClassifications.length} phishing emails to delete`);

    // Step 2: Get user's Gmail tokens
    const user = await User.findById(userId);

    if (!user || !user.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        error: 'Gmail not connected. Cannot delete emails from Gmail.'
      });
    }

    // Step 3: Extract email IDs from classifications
    const phishingEmailIds = phishingClassifications.map(c => c.emailId);

    // Step 4: Find all phishing emails
    const phishingEmails = await Email.find({
      _id: { $in: phishingEmailIds },
      userId: userId
    });

    // Step 5: Delete each phishing email
    const results = {
      total: phishingEmails.length,
      deleted: 0,
      failed: 0,
      gmailErrors: 0,
      storageSaved: 0, // Approximate storage in bytes
      deletedEmails: []
    };

    for (const email of phishingEmails) {
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
        }

        // Estimate storage saved (rough estimate: subject + body length)
        const emailSize = (email.subject?.length || 0) + (email.body?.length || 0);
        results.storageSaved += emailSize;

        // Delete classification
        await Classification.deleteOne({ emailId: email._id });

        // Delete from database
        await Email.deleteOne({ _id: email._id });

        results.deleted++;
        results.deletedEmails.push({
          id: email._id,
          subject: email.subject,
          sender: email.sender
        });

        console.log(`✅ Phishing email deleted: ${email.subject}`);

      } catch (error) {
        console.error(`❌ Failed to delete phishing email ${email._id}:`, error.message);
        results.failed++;
      }
    }

    // Convert bytes to KB/MB for display
    const storageSavedKB = (results.storageSaved / 1024).toFixed(2);
    const storageSavedMB = (results.storageSaved / (1024 * 1024)).toFixed(2);

    console.log(`✅ Clean phishing complete: ${results.deleted} deleted, ${results.failed} failed`);
    console.log(`💾 Approximate storage saved: ${storageSavedMB} MB`);

    // Step 6: Return results
    res.json({
      success: true,
      message: `Successfully cleaned ${results.deleted} phishing emails`,
      results: {
        total: results.total,
        deleted: results.deleted,
        failed: results.failed,
        gmailErrors: results.gmailErrors,
        storageSaved: {
          bytes: results.storageSaved,
          kb: storageSavedKB,
          mb: storageSavedMB
        },
        deletedEmails: results.deletedEmails
      }
    });

  } catch (error) {
    console.error('❌ Clean phishing emails error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
