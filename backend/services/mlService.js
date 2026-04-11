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
      probabilities: result.probabilities,
      explanation: result.explanation || { top_signals: [], method: 'unavailable' },
      modelVersion: result.model_version || 'unknown'  // Include version from ML service
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
 * Predict multiple emails at once (batch prediction)
 * @param {Array<string>} texts - Array of email texts to analyze
 * @returns {Promise<Array<Object>>} Array of prediction results
 */
async function predictEmailsBatch(texts) {
  try {
    // Validate input
    if (!Array.isArray(texts)) {
      throw new Error('Texts must be an array');
    }

    if (texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    if (texts.length > 1000) {
      throw new Error('Maximum 1000 emails per batch');
    }

    // Validate each text
    for (let i = 0; i < texts.length; i++) {
      if (!texts[i] || typeof texts[i] !== 'string' || texts[i].trim() === '') {
        throw new Error(`Text at index ${i} is invalid`);
      }
    }

    console.log(`🤖 Calling ML service for batch prediction (${texts.length} emails)...`);
    
    // Call Python ML service batch endpoint
    const response = await axios.post(
      `${ML_SERVICE_URL}/predict/batch`,
      { texts },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: REQUEST_TIMEOUT * 5 // Longer timeout for batch
      }
    );

    // Return prediction results
    const results = response.data.predictions;
    console.log(`✅ ML batch prediction received: ${results.length} predictions`);
    
    return results;

  } catch (error) {
    // Handle different error types
    if (error.response) {
      // ML service returned an error
      console.error('❌ ML service batch error:', error.response.data);
      throw new Error(`ML service batch error: ${error.response.data.detail || error.response.statusText}`);
    } else if (error.request) {
      // Request made but no response
      console.error('❌ ML service batch timeout or unreachable');
      throw new Error('ML service is unreachable or timed out');
    } else {
      // Other errors
      console.error('❌ Batch prediction error:', error.message);
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

/**
 * Classify multiple emails with email IDs (wrapper for batch prediction)
 * Used by scan job to classify emails with ID tracking
 * @param {Array<Object>} emailObjects - Array of {id, text} objects
 * @returns {Promise<Array<Object>>} Array of {emailId, prediction, confidence, modelVersion}
 */
async function classifyEmails(emailObjects) {
  try {
    // Validate input
    if (!Array.isArray(emailObjects)) {
      throw new Error('emailObjects must be an array');
    }

    if (emailObjects.length === 0) {
      return []; // Return empty array for empty input
    }

    // Extract texts for batch prediction
    const texts = emailObjects.map((obj, index) => {
      if (!obj || typeof obj !== 'object') {
        throw new Error(`Email object at index ${index} is invalid`);
      }
      if (!obj.text || typeof obj.text !== 'string') {
        throw new Error(`Email text at index ${index} is missing or invalid`);
      }
      return obj.text;
    });

    // Call batch prediction
    const predictions = await predictEmailsBatch(texts);

    // Map results back with email IDs (use actual model version from ML service)
    const results = emailObjects.map((obj, index) => ({
      emailId: obj.id,
      prediction: predictions[index].prediction,
      confidence: predictions[index].confidence,
      probabilities: predictions[index].probabilities,
      explanation: predictions[index].explanation || { top_signals: [], method: 'unavailable' },
      modelVersion: predictions[index].model_version || 'unknown' // Use actual version from ML service
    }));

    return results;

  } catch (error) {
    console.error('❌ Classify emails error:', error.message);
    throw error;
  }
}

module.exports = {
  predictEmail,
  predictEmailsBatch,
  classifyEmails,
  checkHealth,
  getServiceInfo
};
