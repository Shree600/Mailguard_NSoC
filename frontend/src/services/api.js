/**
 * API SERVICE
 * Centralized service for all backend API calls
 * Uses Axios for HTTP requests with Clerk authentication
 */

import axios from 'axios'

// Backend API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds timeout for ML operations
})

// Request interceptor - Add Clerk auth token to requests
api.interceptors.request.use(
  async (config) => {
    // Get the Clerk session token
    try {
      // Get Clerk instance to access the session
      const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
      
      // Check if Clerk is configured
      if (!clerkPublishableKey) {
        console.warn('⚠️  Clerk not configured - requests will fail authentication')
        return config
      }
      
      // Wait for Clerk to be loaded (with timeout)
      let waitAttempts = 0
      while (!window.Clerk && waitAttempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Wait 100ms
        waitAttempts++
      }
      
      // Check if Clerk loaded successfully
      if (!window.Clerk) {
        console.error('❌ Clerk failed to load after 5 seconds')
        console.warn('⚠️  Request will be sent without authentication token')
        return config
      }
      
      // Get session token
      const token = await window.Clerk.session?.getToken()
      
      // If token exists, add to Authorization header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
        console.log('✅ Auth token added to request')
      } else {
        console.warn('⚠️  No Clerk session token available - user may not be authenticated')
      }
    } catch (error) {
      console.error('❌ Failed to get Clerk token:', error)
      console.warn('⚠️  Request will proceed without authentication')
    }
    
    console.log('🚀 API Request:', config.method.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.config.url)
    return response
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      console.error('❌ API Error:', error.response.status, error.response.data)
      
      // Handle 401 Unauthorized - redirect to login
      if (error.response.status === 401) {
        window.location.href = '/login'
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('❌ No Response:', error.message)
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// ================================
// AUTH ENDPOINTS (Removed - now handled by Clerk)
// ================================

// ================================
// EMAIL ENDPOINTS
// ================================

/**
 * Get all emails for authenticated user
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 50)
 * @param {string} params.prediction - Filter by prediction type (phishing/safe/pending)
 * @param {string} params.search - Search query
 * @param {string} params.dateFrom - Start date filter (ISO string)
 * @param {string} params.dateTo - End date filter (ISO string)
 * @param {string} params.sortBy - Sort field (default: receivedAt)
 * @param {string} params.sortOrder - Sort order (asc/desc, default: desc)
 * @returns {Promise} List of emails with predictions and pagination info
 */
export const getEmails = async (params = {}) => {
  try {
    const response = await api.get('/emails', { params })
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch emails:', error)
    throw error
  }
}

/**
 * Get email statistics
 * @returns {Promise} Stats object with counts
 */
export const getEmailStats = async () => {
  try {
    const response = await api.get('/emails/stats')
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch email stats:', error)
    throw error
  }
}

/**
 * Delete an email
 * @param {string} emailId - Email ID to delete
 * @returns {Promise} Success message
 */
export const deleteEmail = async (emailId) => {
  try {
    const response = await api.delete(`/emails/${emailId}`)
    return response.data
  } catch (error) {
    console.error('❌ Failed to delete email:', error)
    throw error
  }
}

/**
 * Bulk delete multiple emails
 * @param {Array<string>} emailIds - Array of email IDs to delete
 * @returns {Promise} Results object with deletion stats
 */
export const bulkDeleteEmails = async (emailIds) => {
  try {
    const response = await api.post('/emails/bulk-delete', { emailIds })
    return response.data
  } catch (error) {
    console.error('❌ Failed to bulk delete emails:', error)
    throw error
  }
}

/**
 * Clean all phishing emails
 * @returns {Promise} Results object with deletion stats
 */
export const cleanPhishingEmails = async () => {
  try {
    const response = await api.post('/emails/clean-phishing')
    return response.data
  } catch (error) {
    console.error('❌ Failed to clean phishing emails:', error)
    throw error
  }
}

/**
 * Clear ALL emails from database (fresh start)
 * @returns {Promise} Results object with deletion count
 */
export const clearAllEmails = async () => {
  try {
    const response = await api.post('/emails/clear-all')
    return response.data
  } catch (error) {
    console.error('❌ Failed to clear all emails:', error)
    throw error
  }
}

// ================================
// FEEDBACK ENDPOINTS
// ================================

/**
 * Submit feedback on email classification
 * @param {Object} feedbackData - Feedback data
 * @param {string} feedbackData.emailId - Email ID
 * @param {string} feedbackData.correctLabel - Correct label (phishing/legitimate)
 * @returns {Promise} Success message
 */
export const submitFeedback = async (feedbackData) => {
  try {
    const response = await api.post('/feedback', feedbackData)
    return response.data
  } catch (error) {
    console.error('❌ Failed to submit feedback:', error)
    throw error
  }
}

/**
 * Get user's feedback history
 * @returns {Promise} List of feedback submissions
 */
export const getFeedback = async () => {
  try {
    const response = await api.get('/feedback')
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch feedback:', error)
    throw error
  }
}

// REINFORCEMENT LEARNING / ADMIN ENDPOINTS

/**
 * Trigger manual model retraining
 * @returns {Promise} Retraining result
 */
export const triggerRetrain = async () => {
  try {
    const response = await api.post('/admin/retrain', {}, { timeout: 300000 }) // 5 min timeout
    return response.data
  } catch (error) {
    console.error('❌ Failed to trigger retrain:', error)
    throw error
  }
}

/**
 * Get model/retraining status
 * @returns {Promise} Status information
 */
export const getRetrainStatus = async () => {
  try {
    const response = await api.get('/admin/retrain/status')
    return response.data
  } catch (error) {
    console.error('❌ Failed to get retrain status:', error)
    throw error
  }
}

// ================================
// GMAIL INTEGRATION
// ================================

/**
 * Initiate Gmail OAuth flow
 * @returns {Promise} OAuth URL
 */
export const initiateGmailAuth = async () => {
  try {
    const response = await api.get('/gmail/auth')
    return response.data
  } catch (error) {
    console.error('❌ Failed to initiate Gmail auth:', error)
    throw error
  }
}

/**
 * Fetch emails from Gmail
 * @param {Object} params - Fetch parameters
 * @param {number} params.maxResults - Max emails to fetch (1-100, default: 50)
 * @param {string} params.dateFrom - Start date (ISO string)
 * @param {string} params.dateTo - End date (ISO string)
 * @param {string} params.query - Gmail search query
 * @param {boolean} params.fetchAll - Fetch all emails without limit
 * @returns {Promise} Fetched emails count
 */
export const fetchGmailEmails = async (params = {}) => {
  try {
    const response = await api.post('/gmail/fetch', params)
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch Gmail emails:', error)
    throw error
  }
}

/**
 * Classify unclassified emails
 * @returns {Promise} Classification results
 */
export const classifyEmails = async () => {
  try {
    const response = await api.post('/emails/classify')
    return response.data
  } catch (error) {
    console.error('❌ Failed to classify emails:', error)
    throw error
  }
}

// ================================
// DATA MIGRATION
// ================================

/**
 * Migrate all emails to current user
 * @returns {Promise} Migration results
 */
export const migrateEmails = async () => {
  try {
    const response = await api.post('/migration/update-emails')
    return response.data
  } catch (error) {
    console.error('❌ Failed to migrate emails:', error)
    throw error
  }
}

/**
 * Get migration status
 * @returns {Promise} Migration status
 */
export const getMigrationStatus = async () => {
  try {
    const response = await api.get('/migration/status')
    return response.data
  } catch (error) {
    console.error('❌ Failed to get migration status:', error)
    throw error
  }
}

// Export the axios instance for custom requests
export default api
