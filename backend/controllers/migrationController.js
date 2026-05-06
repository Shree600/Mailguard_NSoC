// Migration Controller
// Handle data migration tasks for Clerk authentication

const Email = require('../models/Email');
const User = require('../models/User');
const MigrationLog = require('../models/MigrationLog');

/**
 * Migrate all emails to current user
 * POST /api/migration/update-emails
 * @access Protected - requires authentication
 */
exports.migrateEmailsToCurrentUser = async (req, res) => {
  try {
    const currentUserId = req.mongoUserId; // From syncUserMiddleware
    const { sourceUserId, emailIds } = req.body;

    console.log(`🔄 Starting email migration for user: ${currentUserId}`);

    // Get current user info
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Eligibility Check
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized: Only admins can perform migrations' });
    }

    if (!sourceUserId && (!emailIds || emailIds.length === 0)) {
      return res.status(400).json({ success: false, error: 'Must provide sourceUserId or array of emailIds' });
    }

    console.log(`👤 Current admin: ${currentUser.email} (${currentUser.name})`);

    // Build the query safely
    const query = { userId: { $ne: currentUserId } };
    if (sourceUserId) query.userId = sourceUserId;
    if (emailIds && emailIds.length > 0) query._id = { $in: emailIds };

    // Find emails
    const emailsToMigrate = await Email.find(query);

    console.log(`📧 Found ${emailsToMigrate.length} emails to migrate`);

    if (emailsToMigrate.length === 0) {
      return res.json({
        success: true,
        message: 'No eligible emails found for migration',
        updated: 0
      });
    }

    // Audit Logging
    const records = emailsToMigrate.map(email => ({
      emailId: email._id,
      originalUserId: email.userId
    }));

    const migrationLog = new MigrationLog({
      migratedBy: currentUserId,
      records: records,
      status: 'completed'
    });
    await migrationLog.save();

    // Update emails
    const targetEmailIds = emailsToMigrate.map(e => e._id);
    const updateResult = await Email.updateMany(
      { _id: { $in: targetEmailIds } },
      { $set: { userId: currentUserId } }
    );

    console.log(`✅ Migration complete: ${updateResult.modifiedCount} emails updated`);

    res.json({
      success: true,
      message: 'Email migration completed successfully',
      migrationId: migrationLog._id,
      updated: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get migration status
 * GET /api/migration/status
 * @access Protected - requires authentication
 */
exports.getMigrationStatus = async (req, res) => {
  try {
    const currentUserId = req.mongoUserId;

    // Count emails by userId
    const userEmailCount = await Email.countDocuments({ userId: currentUserId });
    const otherEmailCount = await Email.countDocuments({ userId: { $ne: currentUserId } });
    const totalEmails = await Email.countDocuments();

    // Get current user info
    const currentUser = await User.findById(currentUserId).select('name email clerkId');

    res.json({
      success: true,
      user: currentUser,
      emailCounts: {
        currentUser: userEmailCount,
        otherUsers: otherEmailCount,
        total: totalEmails
      },
      needsMigration: otherEmailCount > 0
    });

  } catch (error) {
    console.error('❌ Status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Rollback a completed migration
 * POST /api/migration/rollback
 * @access Protected - requires authentication (admin only)
 */
exports.rollbackMigration = async (req, res) => {
  try {
    const { migrationId } = req.body;
    const currentUserId = req.mongoUserId;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const log = await MigrationLog.findById(migrationId);
    if (!log) {
      return res.status(404).json({ success: false, error: 'Migration log not found' });
    }
    if (log.status === 'rolled_back') {
      return res.status(400).json({ success: false, error: 'Already rolled back' });
    }

    const bulkOps = log.records.map(record => ({
      updateOne: {
        filter: { _id: record.emailId },
        update: { $set: { userId: record.originalUserId } }
      }
    }));

    if (bulkOps.length > 0) {
      await Email.bulkWrite(bulkOps);
    }

    log.status = 'rolled_back';
    log.rolledBackAt = Date.now();
    await log.save();

    res.json({ success: true, message: 'Migration rolled back successfully' });
  } catch (error) {
    console.error('❌ Rollback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
