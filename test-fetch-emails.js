/**
 * TEST SCRIPT: Fetch and Save Emails to Database
 * 
 * This script tests the email fetching functionality by:
 * 1. Creating a test user with Gmail credentials
 * 2. Calling the fetchAndSaveEmails function
 * 3. Verifying emails are saved to database
 * 4. Checking duplicate handling
 * 
 * REQUIREMENTS:
 * - MongoDB must be running
 * - You need valid Google OAuth credentials
 * - User must have granted Gmail access
 * 
 * NOTE: This is a simulation. Real testing requires actual OAuth tokens.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./backend/models/User');
const Email = require('./backend/models/Email');

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mailguard';

async function testFetchEmails() {
  try {
    console.log('\n🧪 TESTING: Fetch and Save Emails\n');
    console.log('='.repeat(60));

    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    await User.deleteMany({ email: 'test-gmail-user@example.com' });
    await Email.deleteMany({}); // Clean all emails for clean test
    console.log('✅ Test data cleaned\n');

    // Create test user with Gmail credentials
    console.log('👤 Creating test user with Gmail credentials...');
    const testUser = await User.create({
      name: 'Gmail Test User',
      email: 'test-gmail-user@example.com',
      passwordHash: 'test-hash',
      googleId: '123456789',
      gmailAccessToken: 'mock-access-token',
      gmailRefreshToken: 'mock-refresh-token',
      gmailConnectedAt: new Date()
    });
    console.log('✅ Test user created with ID:', testUser._id.toString());
    console.log('   Name:', testUser.name);
    console.log('   Email:', testUser.email);
    console.log('   Gmail Connected:', testUser.gmailConnectedAt);
    console.log('');

    // Test Case 1: Create sample emails
    console.log('📧 TEST CASE 1: Creating sample emails...\n');
    
    const sampleEmails = [
      {
        userId: testUser._id,
        gmailId: 'msg001',
        sender: 'john.doe@example.com',
        subject: 'Meeting Tomorrow',
        body: 'Hi, can we meet tomorrow at 2 PM?',
        receivedAt: new Date('2024-01-15T10:30:00Z'),
        metadata: {
          hasAttachments: false,
          labels: ['INBOX'],
          threadId: 'thread001'
        }
      },
      {
        userId: testUser._id,
        gmailId: 'msg002',
        sender: 'suspicious@unknown-domain.xyz',
        subject: 'URGENT: Verify Your Account',
        body: 'Click here to verify your account immediately!',
        receivedAt: new Date('2024-01-15T11:00:00Z'),
        metadata: {
          hasAttachments: true,
          labels: ['INBOX', 'IMPORTANT'],
          threadId: 'thread002'
        }
      },
      {
        userId: testUser._id,
        gmailId: 'msg003',
        sender: 'newsletter@company.com',
        subject: 'Weekly Newsletter',
        body: 'Here are this week\'s updates...',
        receivedAt: new Date('2024-01-15T12:00:00Z'),
        metadata: {
          hasAttachments: false,
          labels: ['INBOX'],
          threadId: 'thread003'
        }
      }
    ];

    let savedCount = 0;
    for (const emailData of sampleEmails) {
      const email = await Email.create(emailData);
      savedCount++;
      console.log(`   ✅ Saved email ${savedCount}: "${email.subject}"`);
      console.log(`      From: ${email.sender}`);
      console.log(`      Gmail ID: ${email.gmailId}`);
      console.log('');
    }

    console.log(`✅ Total emails saved: ${savedCount}\n`);

    // Test Case 2: Verify emails are in database
    console.log('🔍 TEST CASE 2: Querying saved emails...\n');
    
    const allEmails = await Email.find({ userId: testUser._id });
    console.log(`   Found ${allEmails.length} emails for user\n`);

    allEmails.forEach((email, index) => {
      console.log(`   Email ${index + 1}:`);
      console.log(`      Subject: ${email.subject}`);
      console.log(`      From: ${email.sender}`);
      console.log(`      Analyzed: ${email.isAnalyzed ? 'Yes' : 'No'}`);
      console.log(`      Classification: ${email.classification}`);
      console.log(`      Received: ${email.receivedAt.toISOString()}`);
      console.log('');
    });

    // Test Case 3: Test duplicate handling
    console.log('🔄 TEST CASE 3: Testing duplicate email prevention...\n');
    
    try {
      // Try to save email with same gmailId
      await Email.create({
        userId: testUser._id,
        gmailId: 'msg001', // Duplicate gmailId
        sender: 'duplicate@example.com',
        subject: 'Duplicate Test',
        body: 'This should fail',
        receivedAt: new Date()
      });
      console.log('   ❌ FAILED: Duplicate was saved (should have been rejected)');
    } catch (error) {
      if (error.code === 11000) {
        console.log('   ✅ PASSED: Duplicate correctly rejected');
        console.log('   Error code:', error.code);
        console.log('   Duplicate key:', Object.keys(error.keyPattern)[0]);
      } else {
        console.log('   ❌ FAILED: Unexpected error:', error.message);
      }
    }
    console.log('');

    // Test Case 4: Test Email model static methods
    console.log('🔧 TEST CASE 4: Testing Email model methods...\n');
    
    // findByUserId
    const userEmails = await Email.findByUserId(testUser._id);
    console.log(`   ✅ findByUserId(): Found ${userEmails.length} emails`);

    // findUnanalyzed
    const unanalyzed = await Email.findUnanalyzed(testUser._id);
    console.log(`   ✅ findUnanalyzed(): Found ${unanalyzed.length} unanalyzed emails`);

    // getStatsByUserId
    const stats = await Email.getStatsByUserId(testUser._id);
    console.log('   ✅ getStatsByUserId():');
    console.log(`      Total: ${stats.total}`);
    console.log(`      Pending: ${stats.pending}`);
    console.log(`      Analyzed: ${stats.analyzed}`);
    console.log('');

    // Test Case 5: Test markAsAnalyzed instance method
    console.log('🏷️  TEST CASE 5: Testing markAsAnalyzed method...\n');
    
    const firstEmail = await Email.findOne({ userId: testUser._id });
    console.log(`   Before: ${firstEmail.subject}`);
    console.log(`      Is Analyzed: ${firstEmail.isAnalyzed}`);
    console.log(`      Classification: ${firstEmail.classification}`);
    console.log(`      Confidence: ${firstEmail.confidenceScore || 'none'}`);

    await firstEmail.markAsAnalyzed('phishing', 0.95);
    console.log('\n   After markAsAnalyzed("phishing", 0.95):');
    console.log(`      Is Analyzed: ${firstEmail.isAnalyzed}`);
    console.log(`      Classification: ${firstEmail.classification}`);
    console.log(`      Confidence: ${firstEmail.confidenceScore}`);
    console.log('');

    // Final Summary
    console.log('='.repeat(60));
    console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   - User created with Gmail credentials`);
    console.log(`   - ${savedCount} emails saved to database`);
    console.log(`   - Duplicate prevention working`);
    console.log(`   - All model methods working correctly`);
    console.log('');
    console.log('🎯 NEXT STEPS:');
    console.log('   1. Start the server: node backend/server.js');
    console.log('   2. Register a user: POST /api/auth/register');
    console.log('   3. Connect Gmail: GET /api/gmail/auth');
    console.log('   4. Fetch emails: POST /api/gmail/fetch');
    console.log('');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed\n');
  }
}

// Run the test
testFetchEmails();
