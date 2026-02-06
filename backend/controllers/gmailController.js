// Import required modules
const User = require('../models/User');
const Email = require('../models/Email');
const { getAuthUrl, getTokensFromCode } = require('../config/googleOAuth');
const { fetchEmails } = require('../services/gmailService');

/**
 * INITIATE GMAIL OAUTH FLOW
 * @route   GET /api/gmail/auth
 * @access  Protected (requires JWT token)
 * @desc    Redirect user to Google OAuth consent screen
 */
const initiateGmailAuth = async (req, res) => {
  try {
    // MongoDB user ID is attached by syncUserMiddleware
    const userId = req.mongoUserId;

    // Generate Google OAuth authorization URL
    const authUrl = getAuthUrl();

    // Store userId in session/state for callback verification
    // In production, use a more secure method (like signed state parameter)
    // For now, we'll include userId in the redirect
    const stateParam = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrlWithState = `${authUrl}&state=${stateParam}`;

    // Return the authorization URL
    res.status(200).json({
      success: true,
      message: 'Authorization URL generated successfully',
      data: {
        authUrl: authUrlWithState,
        instructions: 'Visit this URL in your browser to authorize Gmail access'
      }
    });

  } catch (error) {
    console.error('Gmail auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Gmail authorization',
      error: error.message
    });
  }
};

/**
 * HANDLE GMAIL OAUTH CALLBACK
 * @route   GET /api/gmail/callback
 * @access  Public (but validates state parameter)
 * @desc    Exchange authorization code for tokens and save to user
 */
const handleGmailCallback = async (req, res) => {
  try {
    // Get authorization code and state from query parameters
    const { code, state, error } = req.query;

    // Check if user denied access
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'User denied Gmail access',
        error: error
      });
    }

    // Validate that code exists
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is missing'
      });
    }

    // Decode state parameter to get userId
    let userId;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = stateData.userId;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter'
      });
    }

    // Exchange authorization code for tokens
    const tokens = await getTokensFromCode(code);

    // Validate tokens - CRITICAL: Both access_token AND refresh_token are required
    if (!tokens.access_token) {
      throw new Error('Failed to receive access token from Google');
    }

    // CRITICAL: Refresh token is REQUIRED for long-term Gmail access
    // Without it, user will lose Gmail connection after ~1 hour when access token expires
    if (!tokens.refresh_token) {
      console.error('❌ CRITICAL: No refresh token received from Google');
      console.error('This usually happens when:');
      console.error('  1. User previously authorized and refresh token already exists');
      console.error('  2. OAuth prompt is not set to "consent"');
      console.error('  3. User is testing with same account repeatedly');
      
      // Redirect with specific error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('No refresh token received. Please revoke app access in Google Account settings and try again.')}`);
    }

    // Update user with Gmail tokens
    const user = await User.findByIdAndUpdate(
      userId,
      {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token, // Now guaranteed to exist
        gmailConnectedAt: new Date()
      },
      { new: true, select: '-passwordHash' } // Return updated user without password
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Redirect to dashboard with success message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?gmail=connected`);

  } catch (error) {
    console.error('Gmail callback error:', error);
    
    // Redirect to dashboard with error message
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent(error.message)}`);
  }
};

/**
 * CHECK GMAIL CONNECTION STATUS
 * @route   GET /api/gmail/status
 * @access  Protected (requires JWT token)
 * @desc    Check if user has connected Gmail
 */
const checkGmailStatus = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Get user from database
    const user = await User.findById(userId).select('gmailAccessToken gmailConnectedAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if Gmail is connected
    const isConnected = !!user.gmailAccessToken;

    res.status(200).json({
      success: true,
      data: {
        gmailConnected: isConnected,
        connectedAt: user.gmailConnectedAt || null
      }
    });

  } catch (error) {
    console.error('Gmail status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Gmail status',
      error: error.message
    });
  }
};

/**
 * DISCONNECT GMAIL
 * @route   DELETE /api/gmail/disconnect
 * @access  Protected (requires JWT token)
 * @desc    Remove Gmail tokens from user account
 */
const disconnectGmail = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Remove Gmail tokens from user
    const user = await User.findByIdAndUpdate(
      userId,
      {
        gmailAccessToken: null,
        gmailRefreshToken: null,
        gmailConnectedAt: null
      },
      { new: true, select: 'name email' }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gmail disconnected successfully',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        gmailConnected: false
      }
    });

  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Gmail',
      error: error.message
    });
  }
};

/**
 * FETCH AND SAVE EMAILS FROM GMAIL
 * @route   POST /api/gmail/fetch
 * @access  Protected (requires JWT token)
 * @desc    Fetch emails from Gmail and save to database
 * @body    { maxResults, dateFrom, dateTo, query }
 */
const fetchAndSaveEmails = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Get parameters from request body
    const { 
      maxResults = 50,
      dateFrom,
      dateTo,
      query = '', // Gmail search query (e.g., "from:someone@example.com" or "has:attachment")
      fetchAll = false // Fetch all emails without limit
    } = req.body;

    // Validate maxResults (ignored if fetchAll is true)
    const validatedMax = fetchAll ? 500 : Math.min(Math.max(parseInt(maxResults), 1), 100); // Between 1 and 100, or 500 for fetchAll
    
    // Get user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if Gmail is connected
    if (!user.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect Gmail first.',
        action: 'Call GET /api/gmail/auth to connect Gmail'
      });
    }

    // Build Gmail search query
    let gmailSearchQuery = 'in:inbox';
    
    // Add date filters if provided
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      gmailSearchQuery += ` after:${fromDate.getFullYear()}/${(fromDate.getMonth() + 1)}/${fromDate.getDate()}`;
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      gmailSearchQuery += ` before:${toDate.getFullYear()}/${(toDate.getMonth() + 1)}/${toDate.getDate()}`;
    }
    
    // Add user's custom query if provided
    if (query) {
      gmailSearchQuery += ` ${query}`;
    }
    
    // Fetch emails from Gmail using service
    const fetchedEmails = await fetchEmails(user, validatedMax, gmailSearchQuery);

    if (fetchedEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No emails found in Gmail inbox',
        data: {
          fetched: 0,
          saved: 0,
          duplicates: 0,
          errors: 0
        }
      });
    }

    // Statistics tracking
    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // Process and save each email
    for (const fetchedEmail of fetchedEmails) {
      try {
        // Prepare email document
        const emailDoc = {
          userId: user._id,
          gmailId: fetchedEmail.gmailId,
          sender: fetchedEmail.sender,
          subject: fetchedEmail.subject,
          body: fetchedEmail.body,
          htmlBody: fetchedEmail.htmlBody,
          receivedAt: fetchedEmail.receivedAt,
          fetchedAt: new Date(),
          metadata: fetchedEmail.metadata
        };

        // Try to save email (will fail if duplicate gmailId exists)
        const email = new Email(emailDoc);
        await email.save();
        savedCount++;

      } catch (error) {
        // Check if it's a duplicate key error
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`   ❌ Error saving: ${error.message}`);
        }
      }
    }

    // Return success response with refetch suggestion
    const totalInDb = await Email.countDocuments({ userId: user._id });
    const shouldRefetch = savedCount > 0 && savedCount === fetchedEmails.length; // All were new
    
    res.status(200).json({
      success: true,
      message: savedCount > 0 ? `Fetched ${savedCount} new emails!` : 'No new emails found',
      data: {
        fetched: fetchedEmails.length,
        saved: savedCount,
        duplicates: duplicateCount,
        errors: errorCount,
        totalInDatabase: totalInDb,
        shouldRefetch: shouldRefetch // Suggest fetching more if we got all new
      }
    });

  } catch (error) {
    console.error('Fetch and save error:', error);
    
    // Handle specific error types with appropriate status codes
    if (error.code === 401 || error.message.includes('Token may be expired') || error.message.includes('authentication failed')) {
      return res.status(401).json({
        success: false,
        message: 'Gmail token expired. Please reconnect Gmail.',
        action: 'Call DELETE /api/gmail/disconnect then GET /api/gmail/auth'
      });
    }
    
    if (error.code === 429) {
      return res.status(429).json({
        success: false,
        message: 'Gmail API rate limit exceeded. Please try again later.',
        retryAfter: '60 seconds'
      });
    }
    
    if (error.code === 503 || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Cannot connect to Gmail servers',
        error: 'Check your internet connection and try again'
      });
    }

    // Generic error
    res.status(500).json({
      success: false,
      message: 'Failed to fetch and save emails',
      error: error.message
    });
  }
};

// Export controller functions
module.exports = {
  initiateGmailAuth,
  handleGmailCallback,
  checkGmailStatus,
  disconnectGmail,
  fetchAndSaveEmails

};
