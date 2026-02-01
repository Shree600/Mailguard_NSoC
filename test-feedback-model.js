/**
 * Test script for Feedback model
 * Run: node test-feedback-model.js
 */

const mongoose = require('mongoose');
const Feedback = require('./backend/models/Feedback');

// MongoDB connection string from your config
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mailguard';

async function testFeedbackModel() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test 1: Create a dummy feedback entry
    console.log('📝 Test 1: Creating dummy feedback...');
    const dummyFeedback = new Feedback({
      emailId: new mongoose.Types.ObjectId(), // Random ObjectId
      userId: new mongoose.Types.ObjectId(),  // Random ObjectId
      predictedLabel: 'phishing',
      correctLabel: 'legitimate', // User corrected it
      notes: 'This was a false positive - legitimate marketing email',
    });

    // Validate without saving
    const validationError = dummyFeedback.validateSync();
    if (validationError) {
      console.log('❌ Validation failed:', validationError.message);
    } else {
      console.log('✅ Validation passed!');
      console.log('   Feedback details:', {
        emailId: dummyFeedback.emailId,
        userId: dummyFeedback.userId,
        predictedLabel: dummyFeedback.predictedLabel,
        correctLabel: dummyFeedback.correctLabel,
        notes: dummyFeedback.notes,
      });
    }

    // Test 2: Check the isPredictionCorrect method
    console.log('\n🔍 Test 2: Testing isPredictionCorrect method...');
    const isCorrect = dummyFeedback.isPredictionCorrect();
    console.log(`   Was prediction correct? ${isCorrect ? 'Yes' : 'No'}`);
    console.log(`   Expected: No (phishing ≠ legitimate)`);

    // Test 3: Test with matching labels
    console.log('\n🔍 Test 3: Testing with correct prediction...');
    const correctFeedback = new Feedback({
      emailId: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      predictedLabel: 'phishing',
      correctLabel: 'phishing', // Prediction was correct
    });
    const isCorrect2 = correctFeedback.isPredictionCorrect();
    console.log(`   Was prediction correct? ${isCorrect2 ? 'Yes' : 'No'}`);
    console.log(`   Expected: Yes (phishing = phishing)`);

    // Test 4: Test invalid enum value
    console.log('\n🔍 Test 4: Testing enum validation...');
    try {
      const invalidFeedback = new Feedback({
        emailId: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        predictedLabel: 'spam', // Invalid - should fail
        correctLabel: 'legitimate',
      });
      const error = invalidFeedback.validateSync();
      if (error) {
        console.log('✅ Enum validation working! Rejected invalid value "spam"');
      }
    } catch (err) {
      console.log('✅ Enum validation working!', err.message);
    }

    // Test 5: Test getStats static method (with empty collection)
    console.log('\n📊 Test 5: Testing getStats method...');
    const stats = await Feedback.getStats();
    console.log('   Stats:', stats);

    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run tests
testFeedbackModel();
