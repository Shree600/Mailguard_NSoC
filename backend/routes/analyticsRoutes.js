/**
 * Analytics Routes
 * Defines all analytics-related API endpoints
 */

const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');
const syncUserMiddleware = require('../middleware/syncUserMiddleware');
const rateLimit = require('express-rate-limit');
const { analyticsCache } = require('../middleware/analyticsCache');

/**
 * Rate limiting for analytics endpoints
 * More restrictive due to heavy data processing
 */
const analyticsRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per window
  message: {
    success: false,
    error: 'Too many analytics requests',
    message: 'Please wait before making more requests'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Apply authentication and user sync middleware
 */
router.use(authMiddleware);
router.use(syncUserMiddleware);
router.use(analyticsRateLimit);

/**
 * Analytics Routes
 */

// Get trend analysis with time range
router.get('/trends/:timeRange', analyticsCache('trends'), analyticsController.getTrends);

// Get threat intelligence data
router.get('/threat-intel', analyticsCache('threatIntel'), analyticsController.getThreatIntelligence);

// Get comparison analytics (wow/mom)
router.get('/comparisons', analyticsCache('comparisons'), analyticsController.getComparisons);

// Get comprehensive analytics summary
router.get('/summary', analyticsCache('summary'), analyticsController.getAnalyticsSummary);

// Clear analytics cache for user
router.delete('/cache', analyticsController.clearCache);

// Analytics health check
router.get('/health', analyticsController.getHealth);

module.exports = router;
