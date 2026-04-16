/**
 * Analytics Cache Middleware
 * Provides intelligent caching for analytics endpoints
 * Uses different cache strategies based on data type and user activity
 */

const cache = require('../utils/cache');

/**
 * Cache configuration for different analytics endpoints
 */
const CACHE_CONFIG = {
  trends: {
    ttl: 600, // 10 minutes - trends change frequently
    keyPrefix: 'trends'
  },
  threatIntel: {
    ttl: 900, // 15 minutes - threat intel changes moderately
    keyPrefix: 'threat-intel'
  },
  comparisons: {
    ttl: 1800, // 30 minutes - comparisons are more stable
    keyPrefix: 'comparisons'
  },
  summary: {
    ttl: 300, // 5 minutes - summary should be fresh
    keyPrefix: 'summary'
  }
};

/**
 * Generate cache key for analytics endpoint
 * @param {string} userId - User ID
 * @param {string} endpoint - Endpoint name
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
function generateCacheKey(userId, endpoint, params = {}) {
  const config = CACHE_CONFIG[endpoint];
  if (!config) {
    throw new Error(`No cache configuration for endpoint: ${endpoint}`);
  }

  const paramString = Object.keys(params).length > 0 
    ? `:${JSON.stringify(params)}` 
    : '';
  
  return `analytics:${config.keyPrefix}:${userId}${paramString}`;
}

/**
 * Analytics cache middleware
 * @param {string} endpoint - Analytics endpoint name
 * @returns {Function} Express middleware
 */
function analyticsCache(endpoint) {
  return (req, res, next) => {
    try {
      const userId = req.mongoUserId;
      const cacheKey = generateCacheKey(userId, endpoint, req.query);
      
      // Try to get from cache
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        console.log(`[CACHE] Analytics hit: ${endpoint} for user ${userId}`);
        
        // Add cache headers
        res.set('X-Analytics-Cache', 'hit');
        res.set('X-Cache-Age', Math.floor((Date.now() - cachedData.timestamp) / 1000));
        
        return res.json({
          success: true,
          data: cachedData.data,
          meta: {
            ...cachedData.meta,
            cached: true,
            cachedAt: cachedData.timestamp
          }
        });
      }
      
      // No cache hit, continue to controller
      console.log(`[CACHE] Analytics miss: ${endpoint} for user ${userId}`);
      res.set('X-Analytics-Cache', 'miss');
      
      // Store the original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache successful responses
      res.json = function(data) {
        // Only cache successful responses
        if (data.success && data.data) {
          const config = CACHE_CONFIG[endpoint];
          const cacheData = {
            data: data.data,
            meta: data.meta || {},
            timestamp: Date.now()
          };
          
          cache.set(cacheKey, cacheData, config.ttl);
          console.log(`[CACHE] Analytics cached: ${endpoint} for user ${userId}, TTL: ${config.ttl}s`);
        }
        
        // Call original json method
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('[CACHE] Analytics cache error:', error);
      next(); // Continue without caching on error
    }
  };
}

/**
 * Clear analytics cache for user
 * @param {string} userId - User ID
 * @returns {number} Number of cache entries cleared
 */
function clearUserAnalyticsCache(userId) {
  const allKeys = cache.keys();
  const userAnalyticsKeys = allKeys.filter(key => 
    key.startsWith(`analytics:`) && key.includes(`:${userId}:`)
  );
  
  if (userAnalyticsKeys.length > 0) {
    const deletedCount = cache.del(userAnalyticsKeys);
    console.log(`[CACHE] Cleared ${deletedCount} analytics cache entries for user ${userId}`);
    return deletedCount;
  }
  
  return 0;
}

/**
 * Get analytics cache statistics
 * @returns {Object} Cache statistics
 */
function getAnalyticsCacheStats() {
  const allKeys = cache.keys();
  const analyticsKeys = allKeys.filter(key => key.startsWith('analytics:'));
  
  const stats = {
    totalAnalyticsKeys: analyticsKeys.length,
    cacheStats: cache.getStats(),
    breakdown: {}
  };
  
  // Breakdown by endpoint type
  Object.keys(CACHE_CONFIG).forEach(endpoint => {
    const endpointKeys = analyticsKeys.filter(key => 
      key.includes(`:${CACHE_CONFIG[endpoint].keyPrefix}:`)
    );
    stats.breakdown[endpoint] = endpointKeys.length;
  });
  
  return stats;
}

/**
 * Warm up cache for frequently accessed data
 * @param {string} userId - User ID
 * @param {Object} analyticsService - Analytics service instance
 */
async function warmUpCache(userId, analyticsService) {
  console.log(`[CACHE] Warming up analytics cache for user ${userId}`);
  
  try {
    // Pre-fetch common analytics data
    const promises = [
      analyticsService.getTrendAnalysis(userId, '30d'),
      analyticsService.getThreatIntelligence(userId),
      analyticsService.getComparisons(userId, { type: 'wow' })
    ];
    
    await Promise.all(promises);
    console.log(`[CACHE] Cache warm-up completed for user ${userId}`);
  } catch (error) {
    console.error(`[CACHE] Cache warm-up failed for user ${userId}:`, error);
  }
}

/**
 * Cache invalidation middleware
 * Runs after email classification or feedback to invalidate relevant cache
 */
function invalidateAnalyticsCache(req, res, next) {
  // Store original res.json
  const originalJson = res.json;
  
  res.json = function(data) {
    // Invalidate cache on successful operations that affect analytics
    if (data.success && req.mongoUserId) {
      const userId = req.mongoUserId;
      
      // Determine what to invalidate based on the endpoint
      if (req.path.includes('/emails/classify') || 
          req.path.includes('/feedback') ||
          req.path.includes('/emails/delete')) {
        
        // Clear all analytics cache for this user
        const clearedCount = clearUserAnalyticsCache(userId);
        console.log(`[CACHE] Invalidated ${clearedCount} analytics cache entries due to ${req.path}`);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

module.exports = {
  analyticsCache,
  clearUserAnalyticsCache,
  getAnalyticsCacheStats,
  warmUpCache,
  invalidateAnalyticsCache,
  generateCacheKey,
  CACHE_CONFIG
};
