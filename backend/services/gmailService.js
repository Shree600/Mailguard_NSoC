// Import Gmail OAuth configuration
const { getGmailClient } = require('../config/googleOAuth');

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

    // Create authenticated Gmail client
    const gmail = getGmailClient(user.gmailAccessToken, user.gmailRefreshToken);

    console.log(`📧 Fetching latest ${maxResults} emails for user: ${user.email}`);
    console.log(`🔍 Using search query: "${searchQuery}"`);

    // Step 1: List message IDs
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: maxResults,
      q: searchQuery, // Use provided search query
    });

    // Check if any messages exist
    if (!listResponse.data.messages || listResponse.data.messages.length === 0) {
      console.log('📭 No emails found in Gmail inbox');
      return [];
    }

    console.log(`✅ Found ${listResponse.data.messages.length} emails`);

    // Step 2: Fetch full details for each message
    const emailPromises = listResponse.data.messages.map(async (message) => {
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
        console.error(`❌ Error fetching message ${message.id}:`, error.message);
        return null; // Skip this email if fetch fails
      }
    });

    // Wait for all emails to be fetched
    const emails = await Promise.all(emailPromises);

    // Filter out any null values (failed fetches)
    const validEmails = emails.filter(email => email !== null);

    console.log(`✅ Successfully parsed ${validEmails.length} emails`);

    return validEmails;

  } catch (error) {
    console.error('❌ Gmail fetch error:', error.message);
    
    // Provide helpful error messages
    if (error.code === 401) {
      throw new Error('Gmail authentication failed. Token may be expired. Please reconnect Gmail.');
    }
    
    throw new Error(`Failed to fetch emails from Gmail: ${error.message}`);
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

    const gmail = getGmailClient(user.gmailAccessToken, user.gmailRefreshToken);
    
    const profile = await gmail.users.getProfile({
      userId: 'me'
    });

    return profile.data.emailAddress;
  } catch (error) {
    console.error('Error getting Gmail address:', error.message);
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

    // Create authenticated Gmail client
    const gmail = getGmailClient(accessToken, refreshToken);

    // Delete the email using Gmail API
    // Note: This permanently deletes the email (not just trash)
    await gmail.users.messages.delete({
      userId: 'me',
      id: gmailId,
    });

    console.log(`✅ Successfully deleted Gmail message: ${gmailId}`);

    return {
      success: true,
      gmailId: gmailId,
      message: 'Email deleted successfully from Gmail',
    };

  } catch (error) {
    console.error(`❌ Error deleting Gmail message ${gmailId}:`, error.message);

    // Handle specific Gmail API errors
    if (error.code === 401) {
      throw new Error('Gmail authentication failed. Token may be expired. Please reconnect Gmail.');
    }

    if (error.code === 404) {
      throw new Error('Email not found in Gmail. It may have already been deleted.');
    }

    if (error.code === 403) {
      throw new Error('Permission denied. Unable to delete email from Gmail.');
    }

    throw new Error(`Failed to delete email from Gmail: ${error.message}`);
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
