// Admin Routes
// API endpoints for administrative operations

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const syncUserMiddleware = require('../middleware/syncUserMiddleware');
const adminAuth = require('../middleware/adminAuth');
const { validate, schemas } = require('../middleware/validation');
const { adminOperationLimiter } = require('../middleware/rateLimiter');
const { getCacheStats, flushCache, invalidateCacheMiddleware } = require('../middleware/cacheMiddleware');

// All admin routes require authentication, user sync, AND admin role
router.use(authMiddleware);
router.use(syncUserMiddleware);
router.use(adminAuth); // Verify admin role for ALL admin routes

/**
 * POST /api/admin/retrain
 * Trigger model retraining
 * Body (optional):
 * {
 *   dataFile: "training.csv",
 *   modelType: "random_forest" or "logistic"
 * }
 */
router.post('/retrain', 
  adminOperationLimiter, 
  validate(schemas.retrain), 
  invalidateCacheMiddleware({ resource: 'classification' }), // Invalidate after retrain
  adminController.triggerRetraining
);

/**
 * GET /api/admin/retrain/status
 * Get current retraining/model status
 */
router.get('/retrain/status', adminController.getRetrainingStatus);

/**
 * POST /api/admin/dataset/build
 * Build training dataset from emails and feedback
 * Body (optional):
 * {
 *   outputFile: "training.csv"
 * }
 */
router.post('/dataset/build', 
  adminOperationLimiter, 
  validate(schemas.datasetBuild), 
  adminController.buildDataset
);

/**
 * GET /api/admin/cache/stats
 * Get cache performance statistics
 * Returns hit rate, miss rate, keys count, memory usage
 */
router.get('/cache/stats', getCacheStats);

/**
 * POST /api/admin/cache/flush
 * Flush all cached data
 * USE WITH CAUTION: Impacts all users
 */
router.post('/cache/flush', adminOperationLimiter, flushCache);

// ============================================
// NEW ROUTES FOR ISSUE #13
// ============================================

/**
 * GET /api/admin/ml/status
 * Get ML operation status (lock state, progress, current operation)
 * Returns status of any running retrain/reload operation
 */
router.get('/ml/status', adminController.getMLOperationStatus);

/**
 * POST /api/admin/ml/reload
 * Reload ML models without retraining
 * Useful for applying newly trained models without full retrain pipeline
 */
router.post('/ml/reload', 
  adminOperationLimiter, 
  adminController.reloadMLModels
);

module.exports = router;