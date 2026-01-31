// Test script for Email model
require('dotenv').config();
const mongoose = require('mongoose');
const Email = require('./backend/models/Email');
const User = require('./backend/models/User');

console.log('==============================================');
console.log('Email Model Test');
console.log('==============================================\n');

async function testEmailModel() {
  try {
    // Step 1: Connect to MongoDB
    console.log('✓ Step 1: Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('  ✅ Connected to MongoDB\n');

    // Cleanup any leftover test data first
    await Email.deleteMany({ gmailId: { $in: ['gmail_id_1', 'gmail_id_2', 'gmail_id_3'] } });

    // Step 2: Create test user
    console.log('✓ Step 2: Creating Test User...');
    const testUser = await User.create({
      name: 'Email Test User',
      email: `emailtest.${Date.now()}@example.com`,
      passwordHash: 'hashed_password_test'
    });
    console.log('  ✅ Test user created:', testUser._id);
    console.log('');

    // Step 3: Verify Email schema fields
    console.log('✓ Step 3: Verifying Email Schema Fields');
    const schemaFields = Object.keys(Email.schema.paths);
    console.log('  Schema fields:', schemaFields.slice(0, 10).join(', '), '...');
    
    const requiredFields = ['userId', 'gmailId', 'sender', 'subject', 'body', 'receivedAt'];
    const hasAllFields = requiredFields.every(field => schemaFields.includes(field));
    
    if (hasAllFields) {
      console.log('  ✅ All required fields present\n');
    } else {
      throw new Error('Missing required fields');
    }

    // Step 4: Create test emails
    console.log('✓ Step 4: Creating Test Emails...');
    
    const testEmails = [
      {
        userId: testUser._id,
        gmailId: 'gmail_id_1',
        sender: 'legitimate@company.com',
        subject: 'Welcome to our service',
        body: 'Thank you for signing up! Here is your confirmation.',
        receivedAt: new Date('2026-01-30'),
        classification: 'legitimate'
      },
      {
        userId: testUser._id,
        gmailId: 'gmail_id_2',
        sender: 'phishing@scam.com',
        subject: 'URGENT: Verify your account now!',
        body: 'Click here to verify your account or it will be suspended!',
        receivedAt: new Date('2026-01-31'),
        classification: 'phishing'
      },
      {
        userId: testUser._id,
        gmailId: 'gmail_id_3',
        sender: 'newsletter@marketing.com',
        subject: 'Monthly Newsletter',
        body: 'Check out our latest products and offers.',
        receivedAt: new Date('2026-01-29'),
        classification: 'pending'
      }
    ];

    const createdEmails = await Email.insertMany(testEmails);
    console.log('  ✅ Created', createdEmails.length, 'test emails\n');

    // Step 5: Test static method - findByUserId
    console.log('✓ Step 5: Testing findByUserId() Method');
    const userEmails = await Email.findByUserId(testUser._id);
    console.log('  ✅ Found', userEmails.length, 'emails for user');
    console.log('  ✅ Sorted by date (most recent first):', 
      userEmails[0].receivedAt > userEmails[1].receivedAt);
    console.log('');

    // Step 6: Test static method - findUnanalyzed
    console.log('✓ Step 6: Testing findUnanalyzed() Method');
    const unanalyzed = await Email.findUnanalyzed(testUser._id);
    console.log('  ✅ Found', unanalyzed.length, 'unanalyzed emails');
    console.log('');

    // Step 7: Test static method - findPhishing
    console.log('✓ Step 7: Testing findPhishing() Method');
    const phishing = await Email.findPhishing(testUser._id);
    console.log('  ✅ Found', phishing.length, 'phishing emails');
    console.log('  ✅ Subject:', phishing[0].subject);
    console.log('');

    // Step 8: Test static method - getStatsByUserId
    console.log('✓ Step 8: Testing getStatsByUserId() Method');
    const stats = await Email.getStatsByUserId(testUser._id);
    console.log('  ✅ Stats:', JSON.stringify(stats, null, 2));
    console.log('');

    // Step 9: Test instance method - markAsAnalyzed
    console.log('✓ Step 9: Testing markAsAnalyzed() Method');
    const pendingEmail = await Email.findOne({ gmailId: 'gmail_id_3' });
    await pendingEmail.markAsAnalyzed('legitimate', 85);
    console.log('  ✅ Email marked as analyzed');
    console.log('  ✅ Classification:', pendingEmail.classification);
    console.log('  ✅ Confidence:', pendingEmail.confidenceScore + '%');
    console.log('');

    // Step 10: Test relationship with User model
    console.log('✓ Step 10: Testing User Relationship');
    const emailWithUser = await Email.findOne({ gmailId: 'gmail_id_1' })
      .populate('userId', 'name email');
    console.log('  ✅ Email populated with user data');
    console.log('  ✅ User name:', emailWithUser.userId.name);
    console.log('  ✅ User email:', emailWithUser.userId.email);
    console.log('');

    // Cleanup
    console.log('✓ Step 11: Cleanup');
    await Email.deleteMany({ userId: testUser._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('  ✅ Test data deleted\n');

    console.log('==============================================');
    console.log('✅ All tests passed!');
    console.log('==============================================');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ MongoDB connection closed');
  }
}

// Run tests
testEmailModel();
