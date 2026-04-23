const crypto = require('crypto');
const User = require('../models/User');
const Email = require('../models/Email');
const OAuthState = require('../models/OAuthState');
const { getAuthUrl, getTokensFromCode } = require('../config/googleOAuth');
const { fetchEmails } = require('../services/gmailService');

// ─── HMAC secret validation ───────────────────────────────────────────────────
const HMAC_SECRET = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;

if (!HMAC_SECRET || HMAC_SECRET.length < 32) {
  throw new Error('FATAL: HMAC secret (ENCRYPTION_KEY or SESSION_SECRET) must be set and >= 32 characters');
}

const STATE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

// ─── State helpers ────────────────────────────────────────────────────────────

function buildSignedState(userId, nonce) {
  const payload = {
    userId: userId.toString(),
    nonce,
    ts: Date.now(),
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

function parseAndVerifyState(raw) {
  const parts = raw.split('.');
  if (parts.length !== 2) throw new Error('Malformed state');

  const [data, sig] = parts;

  const expected = crypto.createHmac('sha256', HMAC_SECRET).update(data).digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('State signature invalid');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    throw new Error('State payload unreadable');
  }

  if (!payload.userId || !payload.nonce || !payload.ts) {
    throw new Error('State payload incomplete');
  }

  if (Date.now() - payload.ts > STATE_MAX_AGE_MS) {
    throw new Error('State expired');
  }

  return payload;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * INITIATE GMAIL OAUTH FLOW
 * @route  POST /api/gmail/auth/initiate
 * @access Protected
 */
const initiateGmailAuth = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    // Verify the user actually exists in DB before issuing state
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const nonce = crypto.randomBytes(32).toString('hex');

    // Persist nonce server-side for replay protection
    await OAuthState.create({ nonce, userId });

    const stateParam = buildSignedState(userId, nonce);
    const authUrl = getAuthUrl();
    const authUrlWithState = `${authUrl}&state=${encodeURIComponent(stateParam)}`;

    res.status(200).json({
      success: true,
      message: 'Authorization URL generated successfully',
      data: {
        authUrl: authUrlWithState,
        instructions: 'Visit this URL in your browser to authorize Gmail access',
      },
    });
  } catch (error) {
    console.error('Gmail auth initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate Gmail authorization',
      error: error.message,
    });
  }
};

/**
 * HANDLE GMAIL OAUTH CALLBACK
 * @route  GET /api/gmail/callback
 * @access Public (validated via signed state)
 */
const handleGmailCallback = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('Gmail access denied')}`
      );
    }

    if (!code || !state) {
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('Missing authorization code or state')}`
      );
    }

    // 1. Verify HMAC signature, expiry, and payload structure
    let payload;
    try {
      payload = parseAndVerifyState(decodeURIComponent(state));
    } catch (err) {
      console.warn('OAuth state verification failed:', err.message);
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('Invalid or expired authorization request')}`
      );
    }

    const { userId, nonce } = payload;

    // 2. Replay protection: check nonce exists and has not been used
    const storedState = await OAuthState.findOne({ nonce, userId });

    if (!storedState) {
      console.warn(`OAuth nonce not found for userId=${userId}`);
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('Authorization request not found or expired')}`
      );
    }

    if (storedState.used) {
      console.warn(`OAuth replay attempt detected for userId=${userId}`);
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('Authorization request already used')}`
      );
    }

    // 3. Mark nonce as used immediately (one-time use)
    await OAuthState.findByIdAndUpdate(storedState._id, { used: true });

    // 4. Session binding: confirm userId from state matches a real DB user
    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent('User not found')}`
      );
    }

    // 5. Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      throw new Error('Failed to receive access token from Google');
    }

    if (!tokens.refresh_token) {
      console.error('No refresh token received from Google');
      return res.redirect(
        `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent(
          'No refresh token received. Please revoke app access in Google Account settings and try again.'
        )}`
      );
    }

    // 6. Persist tokens — use findByIdAndUpdate to avoid triggering unrelated pre-save hooks
    await User.findByIdAndUpdate(userId, {
      gmailAccessToken: tokens.access_token,
      gmailRefreshToken: tokens.refresh_token,
      gmailConnectedAt: new Date(),
    });

    res.redirect(`${frontendUrl}/dashboard?gmail=connected`);
  } catch (error) {
    console.error('Gmail callback error:', error);
    res.redirect(
      `${frontendUrl}/dashboard?gmail=error&message=${encodeURIComponent(error.message)}`
    );
  }
};

/**
 * CHECK GMAIL CONNECTION STATUS
 * @route  GET /api/gmail/status
 * @access Protected
 */
const checkGmailStatus = async (req, res) => {
  try {
    const user = await User.findById(req.mongoUserId).select('gmailAccessToken gmailConnectedAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        gmailConnected: !!user.gmailAccessToken,
        connectedAt: user.gmailConnectedAt || null,
      },
    });
  } catch (error) {
    console.error('Gmail status check error:', error);
    res.status(500).json({ success: false, message: 'Failed to check Gmail status', error: error.message });
  }
};

/**
 * DISCONNECT GMAIL
 * @route  DELETE /api/gmail/disconnect
 * @access Protected
 */
const disconnectGmail = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.mongoUserId,
      { gmailAccessToken: null, gmailRefreshToken: null, gmailConnectedAt: null },
      { new: true, select: 'name email' }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Gmail disconnected successfully',
      data: { userId: user._id, name: user.name, email: user.email, gmailConnected: false },
    });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect Gmail', error: error.message });
  }
};

/**
 * FETCH AND SAVE EMAILS FROM GMAIL
 * @route  POST /api/gmail/fetch
 * @access Protected
 * @body   { maxResults, dateFrom, dateTo, query, fetchAll, timeRange }
 */
const fetchAndSaveEmails = async (req, res) => {
  try {
    const userId = req.mongoUserId;
    const {
      maxResults = 50,
      dateFrom,
      dateTo,
      query = '',
      fetchAll = false,
      timeRange = '1h',
    } = req.body;

    const validatedMax = fetchAll ? 500 : Math.min(Math.max(parseInt(maxResults), 1), 100);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.gmailAccessToken) {
      return res.status(400).json({
        success: false,
        message: 'Gmail not connected. Please connect Gmail first.',
        action: 'Call POST /api/gmail/auth/initiate to connect Gmail',
      });
    }

    const timeRangeMap = {
      '5m': '5m', '15m': '15m', '30m': '30m',
      '1h': '1h', '6h': '6h', '12h': '12h',
      '1d': '1d', '3d': '3d', '7d': '7d', '30d': '30d',
      'all': null,
    };

    let gmailSearchQuery = 'in:inbox';

    if (!dateFrom && !dateTo && !query) {
      const gmailTimeRange = timeRangeMap[timeRange] || '1h';
      if (gmailTimeRange) {
        gmailSearchQuery += ` newer_than:${gmailTimeRange}`;
        console.log(`📅 Filtering emails: Last ${timeRange} (newer_than:${gmailTimeRange})`);
        console.log(`⏰ Current time: ${new Date().toLocaleString()}`);
      } else {
        console.log('📅 Fetching all inbox emails (no time filter)');
      }
    }

    if (dateFrom) {
      const d = new Date(dateFrom);
      gmailSearchQuery += ` after:${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      gmailSearchQuery += ` before:${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
    }
    if (query) {
      gmailSearchQuery += ` ${query}`;
    }

    let fetchedEmails;
    try {
      fetchedEmails = await fetchEmails(user, validatedMax, gmailSearchQuery);
    } catch (fetchError) {
      if (fetchError.requiresReauth || fetchError.authError === 'invalid_grant') {
        return res.status(401).json({
          success: false,
          message: fetchError.message,
          requiresReauth: true,
          authError: fetchError.authError || 'token_expired',
          action: 'Please reconnect your Gmail account by going to Settings > Connected Accounts',
        });
      }
      throw fetchError;
    }

    if (fetchedEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No emails found in Gmail inbox',
        data: { fetched: 0, saved: 0, duplicates: 0, errors: 0 },
      });
    }

    let savedCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const fetchedEmail of fetchedEmails) {
      try {
        const email = new Email({
          userId: user._id,
          gmailId: fetchedEmail.gmailId,
          sender: fetchedEmail.sender,
          subject: fetchedEmail.subject,
          body: fetchedEmail.body,
          htmlBody: fetchedEmail.htmlBody,
          receivedAt: fetchedEmail.receivedAt,
          fetchedAt: new Date(),
          metadata: fetchedEmail.metadata,
        });
        await email.save();
        savedCount++;
      } catch (error) {
        if (error.code === 11000) {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`❌ Error saving email: ${error.message}`);
        }
      }
    }

    const totalInDb = await Email.countDocuments({ userId: user._id });

    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        message: savedCount > 0 ? `Fetched ${savedCount} new emails!` : 'No new emails found',
        data: {
          fetched: fetchedEmails.length,
          saved: savedCount,
          duplicates: duplicateCount,
          errors: errorCount,
          totalInDatabase: totalInDb,
          shouldRefetch: savedCount > 0 && savedCount === fetchedEmails.length,
        },
      });
    }
  } catch (error) {
    console.error('Fetch and save error:', error);

    if (res.headersSent) return;

    if (error.code === 401 || error.message?.includes('Token may be expired') || error.message?.includes('authentication failed')) {
      return res.status(401).json({
        success: false,
        message: 'Gmail token expired. Please reconnect Gmail.',
        action: 'Call DELETE /api/gmail/disconnect then POST /api/gmail/auth/initiate',
      });
    }

    if (error.code === 429) {
      return res.status(429).json({
        success: false,
        message: 'Gmail API rate limit exceeded. Please try again later.',
        retryAfter: '60 seconds',
      });
    }

    if (error.code === 503 || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        success: false,
        message: 'Cannot connect to Gmail servers',
        error: 'Check your internet connection and try again',
      });
    }

    res.status(500).json({ success: false, message: 'Failed to fetch and save emails', error: error.message });
  }
};

module.exports = {
  initiateGmailAuth,
  handleGmailCallback,
  checkGmailStatus,
  disconnectGmail,
  fetchAndSaveEmails,
};
