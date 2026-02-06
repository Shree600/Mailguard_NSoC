// Email Routes
// API endpoints for email classification

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');
const syncUserMiddleware = require('../middleware/syncUserMiddleware');
const { validate, schemas } = require('../middleware/validation');
const { cacheMiddleware, invalidateCacheMiddleware, cachePresets } = require('../middleware/cacheMiddleware');
const { classifyLimiter, bulkOperationLimiter } = require('../middleware/rateLimiter');

// All email routes require authentication and user sync
router.use(authMiddleware);
router.use(syncUserMiddleware);

// Classify all unclassified emails
// INVALIDATES: User cache after classification completes
router.post('/classify', 
  classifyLimiter, 
  validate(schemas.classifyEmails), 
  invalidateCacheMiddleware(), // Clear user cache after classification
  emailController.classifyEmails
);

// Get classification statistics
// CACHED: 3 minutes (stats change infrequently)
router.get('/stats', 
  cacheMiddleware(cachePresets.stats), 
  emailController.getClassificationStats
);

// Get all emails (alias for /classified for backward compatibility)
// CACHED: 5 minutes with pagination awareness
router.get('/', 
  validate(schemas.emailQuery, 'query'), 
  cacheMiddleware(cachePresets.emailList),
  emailController.getClassifiedEmails
);

// Get classified emails
// CACHED: 5 minutes with pagination awareness
router.get('/classified', 
  validate(schemas.emailQuery, 'query'), 
  cacheMiddleware(cachePresets.emailList),
  emailController.getClassifiedEmails
);

// Delete a single email
// INVALIDATES: User cache after deletion
router.delete('/:id', 
  validate(schemas.idParam, 'params'), 
  invalidateCacheMiddleware(), // Clear user cache after delete
  emailController.deleteEmail
);

// Bulk delete multiple emails
// INVALIDATES: User cache after bulk deletion
router.post('/bulk-delete', 
  bulkOperationLimiter, 
  validate(schemas.bulkOperation), 
  invalidateCacheMiddleware(), // Clear user cache after bulk delete
  emailController.bulkDeleteEmails
);

// Auto clean all phishing emails
// INVALIDATES: User cache after cleaning phishing emails
router.post('/clean-phishing', 
  bulkOperationLimiter, 
  invalidateCacheMiddleware(), // Clear user cache after clean
  emailController.cleanPhishingEmails
);

module.exports = router;
