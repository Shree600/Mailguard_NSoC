// Test script for ML Service Client
// Run with: node test-ml-service.js
// Make sure Python ML service is running on port 8000

const mlService = require('./backend/services/mlService');

async function testMLService() {
  console.log('🧪 Testing ML Service Client\n');
  console.log('='*50);
  console.log('Make sure Python ML service is running:');
  console.log('  cd ml-service');
  console.log('  uvicorn app:app --reload --port 8000');
  console.log('='*50 + '\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    console.log('-'.repeat(50));
    const isHealthy = await mlService.checkHealth();
    console.log('✅ Health status:', isHealthy ? 'OK' : 'FAILED');
    
    if (!isHealthy) {
      console.log('\n❌ ML service is not running. Please start it first.');
      return;
    }

    // Test 2: Service info
    console.log('\nTest 2: Service Info');
    console.log('-'.repeat(50));
    const info = await mlService.getServiceInfo();
    console.log('✅ Service info:', info);

    // Test 3: Predict phishing email
    console.log('\nTest 3: Predict Phishing Email');
    console.log('-'.repeat(50));
    const phishingText = 'URGENT! Your account will be closed. Click here to verify now and claim your prize!';
    console.log('Input:', phishingText.substring(0, 50) + '...');
    const result1 = await mlService.predictEmail(phishingText);
    console.log('✅ Prediction:', result1);

    // Test 4: Predict safe email
    console.log('\nTest 4: Predict Safe Email');
    console.log('-'.repeat(50));
    const safeText = 'Hi team, please review the attached quarterly report. Let me know if you have questions.';
    console.log('Input:', safeText.substring(0, 50) + '...');
    const result2 = await mlService.predictEmail(safeText);
    console.log('✅ Prediction:', result2);

    // Test 5: Error handling - empty text
    console.log('\nTest 5: Error Handling - Empty Text');
    console.log('-'.repeat(50));
    try {
      await mlService.predictEmail('');
      console.log('❌ Should have thrown an error');
    } catch (error) {
      console.log('✅ Correctly caught error:', error.message);
    }

    console.log('\n' + '='*50);
    console.log('✅ All tests passed!');
    console.log('='*50);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the Python ML service is running:');
    console.error('  cd ml-service');
    console.error('  uvicorn app:app --reload --port 8000');
  }
}

testMLService();
