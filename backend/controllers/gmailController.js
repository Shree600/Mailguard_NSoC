// Import required modules
const User = require('../models/User');
const { getAuthUrl, getTokensFromCode } = require('../config/googleOAuth');

/**
 * INITIATE GMAIL OAUTH FLOW
 * @route   GET /api/gmail/auth
 * @access  Protected (requires JWT token)
 * @desc    Redirect user to Google OAuth consent screen
 */
const initiateGmailAuth = async (req, res) => {
  try {
    // userId is attached by authMiddleware from JWT token
    const userId = req.userId;

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

    // Validate tokens
    if (!tokens.access_token) {
      throw new Error('Failed to receive access token from Google');
    }

    // Update user with Gmail tokens
    const user = await User.findByIdAndUpdate(
      userId,
      {
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token || null,
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

    // Success response
    res.status(200).json({
      success: true,
      message: 'Gmail connected successfully!',
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        gmailConnected: true,
        connectedAt: user.gmailConnectedAt
      }
    });

  } catch (error) {
    console.error('Gmail callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete Gmail authorization',
      error: error.message
    });
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
    const userId = req.userId;

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
    const userId = req.userId;

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

// Export controller functions
module.exports = {
  initiateGmailAuth,
  handleGmailCallback,
  checkGmailStatus,
  disconnectGmail
};
