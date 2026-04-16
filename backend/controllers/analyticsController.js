/**
 * Analytics Controller
 * Handles all analytics-related API endpoints
 */

const analyticsService = require('../services/analyticsService');
const { z } = require('zod');

/**
 * Validation schemas
 */
const timeRangeSchema = z.enum(['7d', '30d', '90d', '1y']).default('30d');
const comparisonTypeSchema = z.enum(['wow', 'mom']).default('wow');

/**
 * Get trend analysis
 * GET /api/analytics/trends/:timeRange
 */
exports.getTrends = async (req, res) => {
  try {
    const userId = req.mongoUserId;
    const { timeRange } = req.params;

    // Validate time range
    const validatedTimeRange = timeRangeSchema.parse(timeRange);

    console.log(`[ANALYTICS] Getting trends for user ${userId}, range: ${validatedTimeRange}`);

    const trends = await analyticsService.getTrendAnalysis(userId, validatedTimeRange);

    res.json({
      success: true,
      data: trends,
      meta: {
        timeRange: validatedTimeRange,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in getTrends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate trend analysis',
      message: error.message
    });
  }
};

/**
 * Get threat intelligence
 * GET /api/analytics/threat-intel
 */
exports.getThreatIntelligence = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    console.log(`[ANALYTICS] Getting threat intelligence for user ${userId}`);

    const threatIntel = await analyticsService.getThreatIntelligence(userId);

    res.json({
      success: true,
      data: threatIntel,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in getThreatIntelligence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate threat intelligence',
      message: error.message
    });
  }
};

/**
 * Get comparison analytics
 * GET /api/analytics/comparisons
 */
exports.getComparisons = async (req, res) => {
  try {
    const userId = req.mongoUserId;
    const { type } = req.query;

    // Validate comparison type
    const validatedType = comparisonTypeSchema.parse(type);

    console.log(`[ANALYTICS] Getting comparisons for user ${userId}, type: ${validatedType}`);

    const comparisons = await analyticsService.getComparisons(userId, { type: validatedType });

    res.json({
      success: true,
      data: comparisons,
      meta: {
        type: validatedType,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in getComparisons:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comparisons',
      message: error.message
    });
  }
};

/**
 * Get comprehensive analytics summary
 * GET /api/analytics/summary
 */
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    console.log(`[ANALYTICS] Getting analytics summary for user ${userId}`);

    const summary = await analyticsService.getAnalyticsSummary(userId);

    res.json({
      success: true,
      data: summary,
      meta: {
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in getAnalyticsSummary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analytics summary',
      message: error.message
    });
  }
};

/**
 * Clear analytics cache for user
 * DELETE /api/analytics/cache
 */
exports.clearCache = async (req, res) => {
  try {
    const userId = req.mongoUserId;

    console.log(`[ANALYTICS] Clearing cache for user ${userId}`);

    // Clear all user-specific cache entries
    const cache = require('../utils/cache');
    const deletedCount = cache.invalidateUser(userId);

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: {
        deletedEntries: deletedCount
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in clearCache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: error.message
    });
  }
};

/**
 * Get analytics health check
 * GET /api/analytics/health
 */
exports.getHealth = async (req, res) => {
  try {
    const cache = require('../utils/cache');
    const cacheStats = cache.getStats();

    res.json({
      success: true,
      data: {
        status: 'healthy',
        cache: cacheStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ANALYTICS] Error in getHealth:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics service unhealthy',
      message: error.message
    });
  }
};
