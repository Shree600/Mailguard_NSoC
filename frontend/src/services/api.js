/**
 * API SERVICE
 * Centralized service for all backend API calls
 * Uses Axios for HTTP requests
 */

import axios from 'axios'

// Backend API base URL
const API_BASE_URL = 'http://localhost:5000/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
})

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token')
    
    // If token exists, add to Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
        localStorage.removeItem('token')
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
// AUTH ENDPOINTS
// ================================

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @param {string} userData.name - User's full name
 * @param {string} userData.email - User's email address
 * @param {string} userData.password - User's password
 * @returns {Promise} Response with token and user data
 */
export const register = async (userData) => {
  try {
    console.log('📝 Registering user:', userData.email)
    
    const response = await api.post('/auth/register', {
      name: userData.name,
      email: userData.email,
      password: userData.password,
    })
    
    console.log('✅ Registration successful:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Registration failed:', error.response?.data?.message || error.message)
    throw error
  }
}

/**
 * Login existing user
 * @param {Object} credentials - Login credentials
 * @param {string} credentials.email - User's email
 * @param {string} credentials.password - User's password
 * @returns {Promise} Response with token and user data
 */
export const login = async (credentials) => {
  try {
    console.log('🔐 Logging in user:', credentials.email)
    
    const response = await api.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    })
    
    console.log('✅ Login successful:', response.data)
    return response.data
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message)
    throw error
  }
}

// ================================
// EMAIL ENDPOINTS
// ================================

/**
 * Get all emails for authenticated user
 * @returns {Promise} List of emails with predictions
 */
export const getEmails = async () => {
  try {
    const response = await api.get('/emails')
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
 * @returns {Promise} Fetched emails count
 */
export const fetchGmailEmails = async () => {
  try {
    const response = await api.post('/gmail/fetch')
    return response.data
  } catch (error) {
    console.error('❌ Failed to fetch Gmail emails:', error)
    throw error
  }
}

// Export the axios instance for custom requests
export default api
