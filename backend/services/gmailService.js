// Import Gmail OAuth configuration
const { getGmailClient } = require('../config/googleOAuth');
const User = require('../models/User');
const { encryptIfNeeded } = require('../utils/encryption');

/**
 * Gmail Service
 * Handles fetching and parsing emails from Gmail API
 */

/**
 * Fetch emails from Gmail for a user
 * @param {Object} user - User object with Gmail tokens
 * @param {number} maxResults - Maximum number of emails to fetch (default: 20)
 * @param {string} searchQuery - Gmail search query (default: 'in:inbox')
 * @returns {Promise<Array>} Array of parsed email objects
 */
const fetchEmails = async (user, maxResults = 20, searchQuery = 'in:inbox') => {
  try {
    // Validate user has Gmail tokens
    if (!user.gmailAccessToken) {
      throw new Error('User has not connected Gmail. Please authenticate first.');
    }

    // CRITICAL: Validate refresh token exists
    // Without refresh token, Gmail connection will fail after access token expires (~1 hour)
    if (!user.gmailRefreshToken) {
      const error = new Error('Gmail refresh token is missing. Please reconnect Gmail to restore long-term access.');
      error.code = 401;
      error.requiresReauth = true; // Flag for frontend to show reconnect button
      throw error;
    }

    console.log(`🔐 Authenticating with Gmail for user: ${user.email}`);
    console.log(`   Access Token: ${user.gmailAccessToken ? '✓ Present' : '✗ Missing'}`);
    console.log(`   Refresh Token: ${user.gmailRefreshToken ? '✓ Present' : '✗ Missing'}`);

    // Create authenticated Gmail client with token refresh callback
    const gmail = getGmailClient(
      user.gmailAccessToken, 
      user.gmailRefreshToken,
      async (newTokens) => {
        // Save refreshed tokens to database
        try {
          await User.findByIdAndUpdate(user._id, {
            gmailAccessToken: newTokens.accessToken,
            gmailRefreshToken: encryptIfNeeded(newTokens.refreshToken)
          });
          console.log(`✅ Updated refreshed tokens for user: ${user.email}`);
        } catch (error) {
          console.error('❌ Failed to save refreshed tokens:', error.message);
        }
      },
      async (authError) => {
        // Handle authentication errors (invalid_grant, etc.)
        console.error(`❌ Gmail OAuth Error for ${user.email}:`, authError.message);
        // Clear invalid tokens from database
        try {
          await User.findByIdAndUpdate(user._id, {
            gmailAccessToken: null,
            gmailRefreshToken: null,
            gmailConnectedAt: null
          });
          console.log(`🧹 Cleared invalid tokens for user: ${user.email}`);
        } catch (error) {
          console.error('❌ Failed to clear invalid tokens:', error.message);
        }
      }
    );

    console.log(`📧 Fetching up to ${maxResults} emails for user: ${user.email}`);
    console.log(`🔍 Using search query: "${searchQuery}"`);

    // Step 1: List message IDs with pagination
    let allMessages = [];
    let pageToken = null;
    let pageCount = 0;
    const MAX_PAGES = 50; // Safety limit: 50 pages * 100 = 5000 message IDs max
    const MAX_RETRIES = 3; // Retry transient failures up to 3 times

    do {
      pageCount++;
      console.log(`📄 Fetching page ${pageCount}/${MAX_PAGES}...`);

      // PRODUCTION SAFETY: Stop if we've fetched too many pages
      // Prevents memory exhaustion and excessive API calls
      if (pageCount > MAX_PAGES) {
        console.warn(`⚠️  Reached max page limit (${MAX_PAGES}). Stopping pagination.`);
        console.warn(`   Total messages collected: ${allMessages.length}`);
        break;
      }

      // Retry logic for pagination (handles transient failures)
      let listResponse = null;
      let retryCount = 0;
      
      while (retryCount < MAX_RETRIES) {
        try {
          listResponse = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 100, // Fetch 100 per page (Gmail API supports up to 500, but 100 is more reliable)
            q: searchQuery,
            pageToken: pageToken
          });
          break; // Success, exit retry loop
        } catch (retryError) {
          retryCount++;
          
          // Check if error is retryable (5xx, timeout, network)
          const isRetryable = 
            (retryError.code >= 500 && retryError.code < 600) ||
            retryError.code === 'ETIMEDOUT' ||
            retryError.code === 'ESOCKETTIMEDOUT' ||
            retryError.code === 'ECONNRESET' ||
            retryError.message?.includes('timeout');
          
          if (!isRetryable || retryCount >= MAX_RETRIES) {
            // Not retryable or max retries reached, throw error
            throw retryError;
          }
          
          // Exponential backoff: 1s, 2s, 4s
          const backoffMs = Math.pow(2, retryCount - 1) * 1000;
          console.warn(`   ⚠️  Pagination failed (attempt ${retryCount}/${MAX_RETRIES}), retrying in ${backoffMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }

      // Add messages from this page
      if (listResponse.data.messages && listResponse.data.messages.length > 0) {
        allMessages = allMessages.concat(listResponse.data.messages);
        console.log(`✅ Page ${pageCount}: Found ${listResponse.data.messages.length} emails (Total: ${allMessages.length})`);
      } else {
        console.log(`📭 Page ${pageCount}: No messages found, stopping pagination.`);
        break; // No more messages, exit loop
      }

      // Get next page token
      pageToken = listResponse.data.nextPageToken;

      // RATE LIMITING: Add small delay between pages to avoid hitting Gmail API limits
      // Gmail allows 250 quota units per user per second (list = 5 units)
      // Adding 100ms delay = max 10 requests/sec = 50 quota units/sec (well under limit)
      if (pageToken) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } while (pageToken); // Continue while there are more pages

    // Check if any messages exist
    if (allMessages.length === 0) {
      console.log('📭 No emails found in Gmail inbox');
      return [];
    }

    console.log(`✅ Total emails found across ${pageCount} pages: ${allMessages.length}`);

    // Limit to maxResults AFTER pagination (prevents refetching pages)
    const messagesToFetch = allMessages.slice(0, maxResults);
    console.log(`📥 Fetching full details for ${messagesToFetch.length} emails...`);

    // Step 2: Fetch full details for each message
    // CRITICAL: Do NOT use Promise.all with hundreds of requests - it will hit rate limits!
    // Instead, process in batches with delays between batches
    const BATCH_SIZE = 10; // Process 10 emails at a time
    const BATCH_DELAY = 200; // 200ms delay between batches
    const validEmails = [];
    let failedCount = 0;

    for (let i = 0; i < messagesToFetch.length; i += BATCH_SIZE) {
      const batch = messagesToFetch.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(messagesToFetch.length / BATCH_SIZE);
      
      console.log(`   Batch ${batchNumber}/${totalBatches}: Processing ${batch.length} emails...`);

      // Process this batch in parallel
      const batchPromises = batch.map(async (message) => {
        // Retry logic for individual message fetch
        let retryCount = 0;
        const MAX_MESSAGE_RETRIES = 2; // Retry each message up to 2 times
        
        while (retryCount < MAX_MESSAGE_RETRIES) {
          try {
            // Get full message details
            const messageDetails = await gmail.users.messages.get({
              userId: 'me',
              id: message.id,
              format: 'full', // Get full message including body
            });

            // Parse the email
            const parsedEmail = parseGmailMessage(messageDetails.data);
            
            return parsedEmail;
          } catch (error) {
            retryCount++;
            
            // Check if error is retryable
            const isRetryable = 
              (error.code >= 500 && error.code < 600) ||
              error.code === 'ETIMEDOUT' ||
              error.code === 'ESOCKETTIMEDOUT' ||
              error.code === 'ECONNRESET' ||
              error.message?.includes('timeout');
            
            // If not retryable or max retries reached, log and skip
            if (!isRetryable || retryCount >= MAX_MESSAGE_RETRIES) {
              console.error(`   ❌ Error fetching message ${message.id} (attempt ${retryCount}): ${error.message}`);
              return null; // Skip this email
            }
            
            // Exponential backoff for retry: 500ms, 1s
            const backoffMs = Math.pow(2, retryCount - 1) * 500;
            await new Promise(resolve => setTimeout(resolve, backoffMs));
          }
        }
        
        // If we get here, all retries failed
        return null;
      });

      // Wait for this batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add successful results to validEmails
      batchResults.forEach(email => {
        if (email !== null) {
          validEmails.push(email);
        } else {
          failedCount++;
        }
      });

      // Add delay between batches to avoid rate limits (except for last batch)
      if (i + BATCH_SIZE < messagesToFetch.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    console.log(`✅ Successfully parsed ${validEmails.length} emails`);
    if (failedCount > 0) {
      console.warn(`⚠️  Failed to fetch ${failedCount} emails (skipped)`);
    }

    return validEmails;

  } catch (error) {
    console.error('❌ Gmail fetch error:', error.message);
    console.error('   Error details:', {
      code: error.code,
      status: error.status,
      message: error.message,
      type: error.constructor.name
    });
    
    // Preserve requiresReauth flag if it exists (set by validation above)
    if (error.requiresReauth) {
      throw error; // Pass through with requiresReauth flag
    }
    
    // Handle invalid_grant specifically (expired/revoked refresh token)
    if (error.message && error.message.includes('invalid_grant')) {
      console.error('🚨 Invalid grant error: Refresh token is expired, revoked, or invalid');
      console.error('   This usually means:');
      console.error('   1. User revoked access to the app');
      console.error('   2. Refresh token expired (unused for 6+ months)');
      console.error('   3. User changed their Google password');
      console.error('   4. Token limit exceeded (>50 tokens per user)');
      
      const invalidGrantError = new Error('Gmail connection has expired or been revoked. Please reconnect your Gmail account.');
      invalidGrantError.code = 401;
      invalidGrantError.requiresReauth = true;
      invalidGrantError.authError = 'invalid_grant';
      throw invalidGrantError;
    }
    
    // Provide helpful error messages based on error type
    if (error.code === 401 || error.code === 403) {
      const authError = new Error('Gmail authentication failed. Token may be expired. Please reconnect Gmail.');
      authError.code = 401;
      authError.requiresReauth = true; // Flag for frontend
      throw authError;
    }
    
    if (error.code === 429) {
      const rateLimitError = new Error('Gmail API rate limit exceeded. Please try again later.');
      rateLimitError.code = 429;
      rateLimitError.retryAfter = error.response?.headers?.['retry-after'] || 60; // Seconds to wait
      throw rateLimitError;
    }
    
    // Network timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || error.message?.includes('timeout')) {
      const timeoutError = new Error('Gmail request timed out. Please check your internet connection and try again.');
      timeoutError.code = 504;
      timeoutError.isTransient = true; // Can retry
      throw timeoutError;
    }
    
    // Network connection errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
      const networkError = new Error('Cannot connect to Gmail servers. Check your internet connection.');
      networkError.code = 503;
      networkError.isTransient = true; // Can retry
      throw networkError;
    }
    
    // Gmail server errors (5xx) - often transient
    if (error.code >= 500 && error.code < 600) {
      const serverError = new Error(`Gmail servers are experiencing issues (${error.code}). Please try again in a few minutes.`);
      serverError.code = error.code;
      serverError.isTransient = true; // Can retry
      throw serverError;
    }
    
    // Generic error
    const genericError = new Error(`Failed to fetch emails from Gmail: ${error.message}`);
    genericError.code = error.code || 500;
    throw genericError;
  }
};

/**
 * Parse Gmail message into structured format
 * @param {Object} message - Raw Gmail message object
 * @returns {Object} Parsed email object
 */
const parseGmailMessage = (message) => {
  // Extract headers
  const headers = message.payload.headers;
  const getHeader = (name) => {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header ? header.value : '';
  };

  // Get basic email information from headers
  const sender = getHeader('From');
  const subject = getHeader('Subject') || '(No Subject)';
  const date = getHeader('Date');
  const to = getHeader('To');
  const cc = getHeader('Cc');

  // Parse email body
  const { textBody, htmlBody } = extractEmailBody(message.payload);

  // Extract additional metadata
  const labelIds = message.labelIds || [];
  const threadId = message.threadId;
  const snippet = message.snippet || '';

  // Check for attachments
  const hasAttachments = checkForAttachments(message.payload);

  // Parse received date
  const receivedAt = new Date(parseInt(message.internalDate));

  return {
    gmailId: message.id,
    sender: extractEmail(sender), // Extract just the email address
    senderName: extractName(sender), // Extract sender name
    subject: subject,
    body: textBody || snippet, // Use text body or snippet as fallback
    htmlBody: htmlBody,
    receivedAt: receivedAt,
    metadata: {
      threadId: threadId,
      labelIds: labelIds,
      snippet: snippet,
      hasAttachments: hasAttachments,
      to: to,
      cc: cc,
      originalDate: date,
    }
  };
};

/**
 * Extract email body from message payload
 * Handles multipart messages and nested parts
 * @param {Object} payload - Gmail message payload
 * @returns {Object} Object with textBody and htmlBody
 */
const extractEmailBody = (payload) => {
  let textBody = '';
  let htmlBody = '';

  // Function to recursively search for body parts
  const findBodyParts = (part) => {
    if (part.mimeType === 'text/plain' && part.body.data) {
      // Plain text part
      textBody = decodeBase64(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body.data) {
      // HTML part
      htmlBody = decodeBase64(part.body.data);
    } else if (part.parts) {
      // Multipart message - recursively search
      part.parts.forEach(subPart => findBodyParts(subPart));
    }
  };

  // Start searching from payload
  if (payload.body && payload.body.data) {
    // Simple message with body directly in payload
    textBody = decodeBase64(payload.body.data);
  } else if (payload.parts) {
    // Multipart message
    payload.parts.forEach(part => findBodyParts(part));
  }

  return { textBody, htmlBody };
};

/**
 * Decode base64url encoded string
 * @param {string} encoded - Base64url encoded string
 * @returns {string} Decoded string
 */
const decodeBase64 = (encoded) => {
  try {
    // Replace URL-safe characters
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Decode from base64
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    console.error('Error decoding base64:', error.message);
    return '';
  }
};

/**
 * Extract email address from "Name <email@domain.com>" format
 * @param {string} fromHeader - From header value
 * @returns {string} Email address
 */
const extractEmail = (fromHeader) => {
  if (!fromHeader) return '';
  
  // Match email in angle brackets or the whole string
  const emailMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/([^\s]+@[^\s]+)/);
  return emailMatch ? emailMatch[1] : fromHeader;
};

/**
 * Extract name from "Name <email@domain.com>" format
 * @param {string} fromHeader - From header value
 * @returns {string} Sender name
 */
const extractName = (fromHeader) => {
  if (!fromHeader) return '';
  
  // Extract name before email
  const nameMatch = fromHeader.match(/^"?([^"<]+)"?\s*</);
  if (nameMatch) {
    return nameMatch[1].trim();
  }
  
  // If no angle brackets, try to extract name before @
  const emailOnly = fromHeader.match(/([^@\s]+)@/);
  return emailOnly ? emailOnly[1] : fromHeader;
};

/**
 * Check if message has attachments
 * @param {Object} payload - Gmail message payload
 * @returns {boolean} True if has attachments
 */
const checkForAttachments = (payload) => {
  let hasAttachments = false;

  const checkParts = (part) => {
    if (part.filename && part.filename.length > 0 && part.body.attachmentId) {
      hasAttachments = true;
    }
    if (part.parts) {
      part.parts.forEach(subPart => checkParts(subPart));
    }
  };

  if (payload.parts) {
    payload.parts.forEach(part => checkParts(part));
  }

  return hasAttachments;
};

/**
 * Get user's email address from Gmail
 * @param {Object} user - User object with Gmail tokens
 * @returns {Promise<string>} Gmail address
 */
const getGmailAddress = async (user) => {
  try {
    if (!user.gmailAccessToken) {
      throw new Error('User has not connected Gmail');
    }

    // CRITICAL: Validate refresh token exists
    if (!user.gmailRefreshToken) {
      const error = new Error('Gmail refresh token is missing. Please reconnect Gmail.');
      error.code = 401;
      error.requiresReauth = true;
      throw error;
    }

    // Create authenticated Gmail client with token refresh callback
    const gmail = getGmailClient(
      user.gmailAccessToken, 
      user.gmailRefreshToken,
      async (newTokens) => {
        // Save refreshed tokens to database
        try {
          await User.findByIdAndUpdate(user._id, {
            gmailAccessToken: newTokens.accessToken,
            gmailRefreshToken: encryptIfNeeded(newTokens.refreshToken)
          });
          console.log(`✅ Updated refreshed tokens for user: ${user.email}`);
        } catch (error) {
          console.error('❌ Failed to save refreshed tokens:', error.message);
        }
      }
    );
    
    const profile = await gmail.users.getProfile({
      userId: 'me'
    });

    return profile.data.emailAddress;
  } catch (error) {
    console.error('Error getting Gmail address:', error.message);
    
    // Preserve requiresReauth flag if already set
    if (error.requiresReauth) {
      throw error;
    }
    
    // Auth errors
    if (error.code === 401 || error.code === 403) {
      const authError = new Error('Gmail authentication failed. Please reconnect Gmail.');
      authError.code = 401;
      authError.requiresReauth = true;
      throw authError;
    }
    
    // Network/timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || 
        error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' ||
        error.message?.includes('timeout')) {
      const networkError = new Error('Cannot connect to Gmail. Please check your internet connection.');
      networkError.code = 503;
      networkError.isTransient = true;
      throw networkError;
    }
    
    throw error;
  }
};

/**
 * Delete an email from Gmail
 * @param {string} gmailId - Gmail message ID to delete
 * @param {string} accessToken - User's Gmail access token
 * @param {string} refreshToken - User's Gmail refresh token
 * @returns {Promise<Object>} Deletion result
 */
const deleteEmail = async (gmailId, accessToken, refreshToken) => {
  try {
    // Validate inputs
    if (!gmailId) {
      throw new Error('Gmail message ID is required for deletion');
    }

    if (!accessToken) {
      throw new Error('User has not connected Gmail. Access token is required.');
    }

    console.log(`🗑️  Attempting to delete Gmail message: ${gmailId}`);

    // Create authenticated Gmail client with auth error handling
    const gmail = getGmailClient(
      accessToken, 
      refreshToken, 
      null, // No token refresh callback for delete (we don't have user context)
      (authError) => {
        console.error('❌ Gmail Auth Error during deletion:', authError.message);
      }
    );

    // Delete the email using Gmail API
    // Note: This moves email to trash (use trash) instead of permanent delete
    // Gmail API: messages.trash() moves to trash, messages.delete() permanently deletes
    await gmail.users.messages.trash({
      userId: 'me',
      id: gmailId,
    });

    console.log(`✅ Successfully moved Gmail message to trash: ${gmailId}`);

    return {
      success: true,
      gmailId: gmailId,
      message: 'Email moved to trash successfully',
    };

  } catch (error) {
    console.error(`❌ Error deleting Gmail message ${gmailId}:`, error.message);

    // Handle specific Gmail API errors
    if (error.code === 401 || error.code === 403) {
      const authError = new Error('Gmail authentication failed. Token may be expired. Please reconnect Gmail.');
      authError.code = 401;
      authError.requiresReauth = true;
      throw authError;
    }

    if (error.code === 404) {
      // Email not found - not really an error, might be already deleted
      console.log(`   ℹ️  Email ${gmailId} not found (may be already deleted)`);
      return {
        success: true,
        gmailId: gmailId,
        message: 'Email not found (may be already deleted)',
      };
    }

    // Network/timeout errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT' || 
        error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' ||
        error.message?.includes('timeout')) {
      const networkError = new Error('Cannot connect to Gmail. Please check your internet connection.');
      networkError.code = 503;
      networkError.isTransient = true;
      throw networkError;
    }

    // Generic error with original message
    const genericError = new Error(`Failed to delete email from Gmail: ${error.message}`);
    genericError.code = error.code || 500;
    throw genericError;
  }
};

// Export service functions
module.exports = {
  fetchEmails,
  parseGmailMessage,
  getGmailAddress,
  extractEmail,
  extractName,
  deleteEmail, // New function added
};
