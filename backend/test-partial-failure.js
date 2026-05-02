// Test script to verify partial failure handling in batch email classification
// Usage: node test-partial-failure.js

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN; // Set this in .env

/**
 * Test 1: Verify response includes failed email IDs
 */
async function testPartialFailureResponse() {
  console.log('\n🧪 TEST 1: Partial Failure Response Structure');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/emails/classify`,
      { forceReclassify: false },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Response received');
    console.log('\n📋 Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));

    // Verify response has required fields
    const hasStatus = response.data.hasOwnProperty('status');
    const hasValidation = response.data.hasOwnProperty('validation');
    const hasFailedEmails = response.data.validation?.hasOwnProperty('failedEmails');

    console.log('\n✅ Required Fields Check:');
    console.log(`  - "status" field present: ${hasStatus}`);
    console.log(`  - "validation" object present: ${hasValidation}`);
    console.log(`  - "failedEmails" array present: ${hasFailedEmails}`);

    if (response.data.status === 'partial-failure') {
      console.log('\n⚠️  Partial Failure Detected:');
      console.log(`  - Total Requested: ${response.data.validation.expectedCount}`);
      console.log(`  - Success: ${response.data.validation.successCount}`);
      console.log(`  - Failed: ${response.data.validation.failureCount}`);
      console.log(`  - Failed IDs:`, response.data.validation.failedEmails);
    } else if (response.data.status === 'success') {
      console.log('\n✅ All emails classified successfully');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

/**
 * Test 2: Verify complete failure handling
 */
async function testCompleteFailure() {
  console.log('\n🧪 TEST 2: Complete Failure Handling');
  console.log('='.repeat(50));
  
  try {
    // Try to classify when ML service is down
    const response = await axios.post(
      `${API_BASE_URL}/api/emails/classify`,
      { forceReclassify: true },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success === false && response.data.status === 'partial-failure') {
      console.log('✅ Complete failure properly handled with success: false');
    }

  } catch (error) {
    console.error('Expected error (for testing):', error.message);
  }
}

/**
 * Test 3: Verify validation counters match
 */
async function testValidationCounters() {
  console.log('\n🧪 TEST 3: Validation Counter Accuracy');
  console.log('='.repeat(50));
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/emails/classify`,
      { forceReclassify: false },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const validation = response.data.validation;
    const expectedSum = validation.successCount + validation.failureCount;

    console.log('Validation Counters:');
    console.log(`  - Expected: ${validation.expectedCount}`);
    console.log(`  - Success: ${validation.successCount}`);
    console.log(`  - Failure: ${validation.failureCount}`);
    console.log(`  - Sum (success + failure): ${expectedSum}`);

    if (expectedSum === validation.expectedCount) {
      console.log('✅ Counters match correctly');
    } else {
      console.log('❌ Counter mismatch detected');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 MAILGUARD - PARTIAL FAILURE HANDLING TESTS');
  console.log('='.repeat(50));
  
  if (!AUTH_TOKEN) {
    console.log('⚠️  AUTH_TOKEN not set. Set TEST_AUTH_TOKEN in .env');
    console.log('Skipping tests...');
    return;
  }

  await testPartialFailureResponse();
  await testValidationCounters();
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed');
}

runAllTests().catch(console.error);
