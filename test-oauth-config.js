// Test script for Google OAuth configuration
require('dotenv').config();
const { createOAuth2Client, getAuthUrl } = require('./backend/config/googleOAuth');

console.log('==============================================');
console.log('Google OAuth Configuration Test');
console.log('==============================================\n');

try {
  // Test 1: Check environment variables
  console.log('✓ Test 1: Environment Variables');
  console.log('  GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
  console.log('  GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI || '❌ Missing');
  console.log('');

  // Test 2: Create OAuth2 client
  console.log('✓ Test 2: Create OAuth2 Client');
  const oauth2Client = createOAuth2Client();
  console.log('  ✅ OAuth2 client created successfully');
  console.log('');

  // Test 3: Generate auth URL
  console.log('✓ Test 3: Generate Authorization URL');
  const authUrl = getAuthUrl();
  console.log('  ✅ Auth URL generated successfully');
  console.log('  URL:', authUrl.substring(0, 80) + '...');
  console.log('');

  console.log('==============================================');
  console.log('✅ All tests passed!');
  console.log('==============================================');
} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.log('\n⚠️  Make sure to:');
  console.log('1. Create a Google Cloud project');
  console.log('2. Enable Gmail API');
  console.log('3. Create OAuth 2.0 credentials');
  console.log('4. Add credentials to .env file');
}
