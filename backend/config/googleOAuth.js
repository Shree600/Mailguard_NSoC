// Import Google APIs library
const { google } = require('googleapis');

/**
 * Google OAuth2 Configuration
 * Handles OAuth2 client creation and authentication for Gmail API
 * 
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable Gmail API
 * 4. Create OAuth 2.0 credentials
 * 5. Add authorized redirect URI
 * 6. Copy Client ID and Client Secret to .env file
 */

/**
 * Create and configure OAuth2 client
 * @returns {OAuth2Client} Configured OAuth2 client instance
 */
const createOAuth2Client = () => {
  // Validate that required environment variables exist
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('Missing Google OAuth credentials in environment variables');
  }

  // Create OAuth2 client with credentials from environment
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,      // Client ID from Google Console
    process.env.GOOGLE_CLIENT_SECRET,  // Client Secret from Google Console
    process.env.GOOGLE_REDIRECT_URI    // Redirect URI (must match Google Console)
  );

  return oauth2Client;
};

/**
 * Generate Google OAuth authorization URL
 * @returns {string} Authorization URL for user consent
 */
const getAuthUrl = () => {
  const oauth2Client = createOAuth2Client();

  // Define scopes - what permissions we're requesting
  const scopes = [
    'https://www.googleapis.com/auth/gmail.modify',    // Read and delete emails
    'https://www.googleapis.com/auth/userinfo.email',  // Get user email
    'https://www.googleapis.com/auth/userinfo.profile' // Get user profile
  ];

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',  // Get refresh token for long-term access
    scope: scopes,
    prompt: 'consent'        // Force consent screen to get refresh token
  });

  return authUrl;
};

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Promise<Object>} Object containing access_token and refresh_token
 */
const getTokensFromCode = async (code) => {
  const oauth2Client = createOAuth2Client();

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    return tokens;
  } catch (error) {
    console.error('Error getting tokens from code:', error.message);
    throw new Error('Failed to exchange authorization code for tokens');
  }
};

/**
 * Create authenticated Gmail client using stored tokens
 * @param {string} accessToken - User's access token
 * @param {string} refreshToken - User's refresh token
 * @returns {gmail_v1.Gmail} Authenticated Gmail API client
 */
const getGmailClient = (accessToken, refreshToken) => {
  const oauth2Client = createOAuth2Client();

  // Set credentials (tokens) on the OAuth2 client
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  // Create and return Gmail API client
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  return gmail;
};

// Export all functions
module.exports = {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getGmailClient
};
