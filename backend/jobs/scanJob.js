/**
 * Scheduled Email Scan Job
 * Automatically runs every night at 2 AM to:
 * 1. Fetch new emails from Gmail
 * 2. Classify them using ML service
 * 3. Auto-delete phishing emails
 */

const cron = require('node-cron');
const User = require('../models/User');
const Email = require('../models/Email');
const Classification = require('../models/Classification');
const AuditLog = require('../models/AuditLog');
const gmailService = require('../services/gmailService');
const mlService = require('../services/mlService');

/**
 * Scan and clean function
 * Processes emails for a single user
 */
const scanAndCleanForUser = async (user) => {
  try {
    console.log(`\n🔍 Starting scan for user: ${user.email}`);

    // Step 1: Check if user has Gmail connected
    if (!user.gmailAccessToken) {
      console.log(`⚠️  User ${user.email} has no Gmail connected. Skipping...`);
      return {
        userId: user._id,
        email: user.email,
        skipped: true,
        reason: 'No Gmail connected'
      };
    }

    // Step 2: Fetch new emails from Gmail
    console.log(`📧 Fetching emails for ${user.email}...`);
    const fetchedEmails = await gmailService.fetchEmails(user, 50); // Fetch last 50 emails
    console.log(`✅ Fetched ${fetchedEmails.length} emails`);

    // Step 3: Find unclassified emails
    const emailIds = fetchedEmails.map(email => email._id);
    const existingClassifications = await Classification.find({
      emailId: { $in: emailIds }
    });

    const classifiedEmailIds = existingClassifications.map(c => c.emailId.toString());
    const unclassifiedEmails = fetchedEmails.filter(
      email => !classifiedEmailIds.includes(email._id.toString())
    );

    console.log(`🆕 Found ${unclassifiedEmails.length} unclassified emails`);

    if (unclassifiedEmails.length === 0) {
      console.log(`✅ No new emails to classify for ${user.email}`);
      return {
        userId: user._id,
        email: user.email,
        fetched: fetchedEmails.length,
        classified: 0,
        phishingFound: 0,
        deleted: 0
      };
    }

    // Step 4: Classify emails using ML service
    console.log(`🤖 Classifying ${unclassifiedEmails.length} emails...`);
    const emailTexts = unclassifiedEmails.map(email => ({
      id: email._id,
      text: `${email.subject || ''} ${email.body || ''}`
    }));

    const predictions = await mlService.classifyEmails(emailTexts);
    console.log(`✅ Classification complete`);

    // Step 5: Save classifications to database
    const classificationDocs = predictions.map(pred => ({
      emailId: pred.emailId,
      prediction: pred.prediction,
      confidence: pred.confidence,
      modelVersion: pred.modelVersion || '1.0',
      classifiedAt: new Date()
    }));

    await Classification.insertMany(classificationDocs);
    console.log(`💾 Saved ${classificationDocs.length} classifications`);

    // Step 6: Count phishing emails
    const phishingCount = predictions.filter(p => p.prediction === 'phishing').length;
    console.log(`🚨 Found ${phishingCount} phishing emails`);

    // Step 7: Auto-delete phishing emails (only if user consented)
    let deletedCount = 0;

    if (phishingCount > 0) {
      // Check user consent before deletion
      if (!user.autoDeletePreferences?.enabled) {
        console.log(`⚠️  User ${user.email} has auto-delete DISABLED. Skipping deletion.`);
      } else {
        console.log(`✅ User ${user.email} has auto-delete ENABLED. Processing deletions...`);

        const phishingEmailIds = predictions
          .filter(p => p.prediction === 'phishing')
          .map(p => p.emailId);

        const phishingEmails = await Email.find({
          _id: { $in: phishingEmailIds },
          userId: user._id
        });

        for (const email of phishingEmails) {
          const phishingPrediction = predictions.find(p => p.emailId.toString() === email._id.toString());

          try {
            // Create audit log BEFORE deletion
            await AuditLog.create({
              userId: user._id,
              emailId: email._id,
              gmailId: email.gmailId,
              emailSubject: email.subject,
              emailSender: email.sender,
              reason: 'phishing_auto_delete',
              mlConfidence: phishingPrediction.confidence,
              notes: `Auto-deleted with ${(phishingPrediction.confidence * 100).toFixed(1)}% confidence`,
            });

            // Delete from Gmail
            await gmailService.deleteEmail(
              email.gmailId,
              user.gmailAccessToken,
              user.gmailRefreshToken
            );

            // Delete classification
            await Classification.deleteOne({ emailId: email._id });

            // Delete from database
            await Email.deleteOne({ _id: email._id });

            deletedCount++;
            console.log(`✅ Deleted & logged: ${email.subject}`);

          } catch (deleteError) {
            console.error(`❌ Failed to delete ${email.gmailId}: ${deleteError.message}`);
            
            // Log the error in audit
            try {
              await AuditLog.create({
                userId: user._id,
                emailId: email._id,
                gmailId: email.gmailId,
                emailSubject: email.subject,
                emailSender: email.sender,
                reason: 'phishing_auto_delete',
                mlConfidence: phishingPrediction?.confidence,
                notes: `FAILED - ${deleteError.message}`,
              });
            } catch (auditError) {
              console.error('Audit log creation failed:', auditError.message);
            }
          }
        }

        console.log(`✅ Auto-deleted ${deletedCount} phishing emails`);
      }
    }

    // Step 8: Return results
    return {
      userId: user._id,
      email: user.email,
      fetched: fetchedEmails.length,
      classified: unclassifiedEmails.length,
      phishingFound: phishingCount,
      deleted: deletedCount
    };

  } catch (error) {
    console.error(`❌ Scan error for user ${user.email}:`, error.message);
    return {
      userId: user._id,
      email: user.email,
      error: error.message
    };
  }
};

/**
 * Main scan job function
 * Scans all users and generates report
 */
const runScanJob = async () => {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🌙 NIGHTLY EMAIL SCAN JOB STARTED');
    console.log(`📅 Time: ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Get all users
    const users = await User.find({});
    console.log(`👥 Found ${users.length} users to scan`);

    if (users.length === 0) {
      console.log('⚠️  No users found. Job complete.');
      return;
    }

    // Scan each user
    const results = [];
    for (const user of users) {
      const result = await scanAndCleanForUser(user);
      results.push(result);
    }

    // Generate summary report
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 SCAN JOB SUMMARY REPORT');
    console.log('═══════════════════════════════════════════════════════');

    const totalFetched = results.reduce((sum, r) => sum + (r.fetched || 0), 0);
    const totalClassified = results.reduce((sum, r) => sum + (r.classified || 0), 0);
    const totalPhishing = results.reduce((sum, r) => sum + (r.phishingFound || 0), 0);
    const totalDeleted = results.reduce((sum, r) => sum + (r.deleted || 0), 0);
    const totalErrors = results.filter(r => r.error).length;
    const totalSkipped = results.filter(r => r.skipped).length;

    console.log(`\n📧 Total Emails Fetched: ${totalFetched}`);
    console.log(`🆕 Total Classified: ${totalClassified}`);
    console.log(`🚨 Total Phishing Found: ${totalPhishing}`);
    console.log(`🧹 Total Deleted: ${totalDeleted}`);
    console.log(`⚠️  Errors: ${totalErrors}`);
    console.log(`⏭️  Skipped Users: ${totalSkipped}`);

    console.log('\n📋 Per-User Results:');
    results.forEach((result, index) => {
      console.log(`\n  ${index + 1}. ${result.email}`);
      if (result.skipped) {
        console.log(`     ⏭️  Skipped: ${result.reason}`);
      } else if (result.error) {
        console.log(`     ❌ Error: ${result.error}`);
      } else {
        console.log(`     📧 Fetched: ${result.fetched}`);
        console.log(`     🆕 Classified: ${result.classified}`);
        console.log(`     🚨 Phishing: ${result.phishingFound}`);
        console.log(`     🧹 Deleted: ${result.deleted}`);
      }
    });

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ NIGHTLY SCAN JOB COMPLETE');
    console.log(`📅 Finished: ${new Date().toLocaleString()}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ SCAN JOB CRITICAL ERROR:', error);
  }
};

/**
 * Schedule the nightly scan job
 * Cron syntax: minute hour day month weekday
 * '0 2 * * *' = Every day at 2:00 AM
 * 
 * For testing, use: '* * * * *' = Every minute
 */
const startScanJob = () => {
  // Production schedule: Every night at 2 AM
  const schedule = '0 2 * * *';
  
  // For testing: Every minute (uncomment to test)
  // const schedule = '* * * * *';

  console.log('\n🕐 Scheduled Email Scan Job initialized');
  console.log(`📅 Schedule: ${schedule} (Every night at 2:00 AM)`);
  console.log('⚙️  Job will automatically fetch, classify, and clean phishing emails\n');

  // Create cron job
  const job = cron.schedule(schedule, runScanJob, {
    scheduled: true,
    timezone: "America/New_York" // Change to your timezone
  });

  return job;
};

module.exports = {
  startScanJob,
  runScanJob // Export for manual testing
};
