// ML Service Client
// Communicates with Python ML microservice

const axios = require('axios');

// ML service configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Predict if email text is phishing or safe
 * @param {string} text - Email body text to analyze
 * @returns {Promise<Object>} Prediction result
 */
async function predictEmail(text) {
  try {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim() === '') {
      throw new Error('Email text is required and must be a non-empty string');
    }

    console.log('🤖 Calling ML service for prediction...');
    
    // Call Python ML service
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict`,
      { text },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    // Return prediction result
    const result = response.data;
    console.log('✅ ML prediction received:', result.prediction);
    
    return {
      prediction: result.prediction,
      confidence: result.confidence,
      probabilities: result.probabilities
    };

  } catch (error) {
    // Handle different error types
    if (error.response) {
      // ML service returned an error
      console.error('❌ ML service error:', error.response.data);
      throw new Error(`ML service error: ${error.response.data.detail || error.response.statusText}`);
    } else if (error.request) {
      // No response from ML service
      console.error('❌ ML service not responding');
      throw new Error('ML service is not available. Please ensure it is running on ' + ML_SERVICE_URL);
    } else {
      // Other errors
      console.error('❌ Prediction error:', error.message);
      throw error;
    }
  }
}

/**
 * Check if ML service is healthy and running
 * @returns {Promise<boolean>} True if service is healthy
 */
async function checkHealth() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    });
    return response.data.status === 'ok';
  } catch (error) {
    console.error('❌ ML service health check failed:', error.message);
    return false;
  }
}

/**
 * Get ML service status and info
 * @returns {Promise<Object>} Service status
 */
async function getServiceInfo() {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to get ML service info: ' + error.message);
  }
}

module.exports = {
  predictEmail,
  checkHealth,
  getServiceInfo
};
