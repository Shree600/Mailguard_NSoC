/**
 * Cache Service
 * Provides in-memory caching for frequently accessed data
 * Uses node-cache for simple, efficient key-value storage
 */

const NodeCache = require('node-cache');

/**
 * Cache Configuration
 * 
 * stdTTL: Standard time-to-live in seconds (default: 5 minutes)
 * checkperiod: Interval for automatic deletion of expired keys (seconds)
 * useClones: Clone objects before storing (prevents external modifications)
 * deleteOnExpire: Automatically delete expired keys
 * maxKeys: Maximum number of keys stored (prevents memory overflow)
 */
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: true, // Return cloned objects (safe from external mutations)
  deleteOnExpire: true, // Delete keys on expiration
  maxKeys: 1000 // Maximum 1000 cached keys (prevents memory issues)
});

/**
 * Cache Statistics
 * Tracks cache performance metrics
 */
const stats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  flushes: 0
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {any|undefined} Cached value or undefined if not found/expired
 */
function get(key) {
  const value = cache.get(key);
  
  if (value !== undefined) {
    stats.hits++;
    console.log(`✅ Cache HIT: ${key} (${stats.hits} hits, ${stats.misses} misses)`);
  } else {
    stats.misses++;
    console.log(`❌ Cache MISS: ${key} (${stats.hits} hits, ${stats.misses} misses)`);
  }
  
  return value;
}

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} [ttl] - Time-to-live in seconds (optional, uses default if not provided)
 * @returns {boolean} Success status
 */
function set(key, value, ttl) {
  const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value);
  
  if (success) {
    stats.sets++;
    const expiresIn = ttl || cache.options.stdTTL;
    console.log(`💾 Cache SET: ${key} (expires in ${expiresIn}s)`);
  }
  
  return success;
}

/**
 * Delete value from cache
 * @param {string} key - Cache key to delete
 * @returns {number} Number of deleted entries
 */
function del(key) {
  const deletedCount = cache.del(key);
  
  if (deletedCount > 0) {
    stats.deletes++;
    console.log(`🗑️  Cache DELETE: ${key}`);
  }
  
  return deletedCount;
}

/**
 * Delete multiple keys from cache
 * @param {string[]} keys - Array of cache keys to delete
 * @returns {number} Number of deleted entries
 */
function delMany(keys) {
  const deletedCount = cache.del(keys);
  
  if (deletedCount > 0) {
    stats.deletes += deletedCount;
    console.log(`🗑️  Cache DELETE (bulk): ${deletedCount} keys`);
  }
  
  return deletedCount;
}

/**
 * Flush all cached data
 * USE WITH CAUTION: Clears entire cache
 */
function flush() {
  cache.flushAll();
  stats.flushes++;
  console.log(`🧹 Cache FLUSH: All keys deleted (flush count: ${stats.flushes})`);
}

/**
 * Get all cache keys
 * @returns {string[]} Array of all cache keys
 */
function keys() {
  return cache.keys();
}

/**
 * Check if key exists in cache
 * @param {string} key - Cache key
 * @returns {boolean} True if key exists and not expired
 */
function has(key) {
  return cache.has(key);
}

/**
 * Get cache statistics
 * @returns {object} Cache stats including hit rate, miss rate, and memory usage
 */
function getStats() {
  const totalRequests = stats.hits + stats.misses;
  const hitRate = totalRequests > 0 ? ((stats.hits / totalRequests) * 100).toFixed(2) : 0;
  const missRate = totalRequests > 0 ? ((stats.misses / totalRequests) * 100).toFixed(2) : 0;
  
  return {
    // Request stats
    hits: stats.hits,
    misses: stats.misses,
    totalRequests: totalRequests,
    hitRate: `${hitRate}%`,
    missRate: `${missRate}%`,
    
    // Operation stats
    sets: stats.sets,
    deletes: stats.deletes,
    flushes: stats.flushes,
    
    // Cache stats
    keys: cache.keys().length,
    maxKeys: cache.options.maxKeys,
    
    // NodeCache internal stats
    ...cache.getStats()
  };
}

/**
 * Reset cache statistics
 * Does NOT clear cache, only resets counters
 */
function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
  stats.sets = 0;
  stats.deletes = 0;
  stats.flushes = 0;
  console.log('📊 Cache statistics reset');
}

/**
 * Get cache size and memory usage estimation
 * @returns {object} Cache size information
 */
function getSize() {
  const keyCount = cache.keys().length;
  // Rough estimate: each entry ~1KB average
  const estimatedSizeMB = (keyCount * 1024 / 1024 / 1024).toFixed(2);
  
  return {
    keys: keyCount,
    maxKeys: cache.options.maxKeys,
    fillPercentage: `${((keyCount / cache.options.maxKeys) * 100).toFixed(1)}%`,
    estimatedSizeMB: `${estimatedSizeMB} MB`
  };
}

/**
 * Generate cache key for user-specific data
 * @param {string} userId - User ID
 * @param {string} resource - Resource type (e.g., 'stats', 'emails')
 * @param {object} [params] - Additional parameters for key uniqueness
 * @returns {string} Generated cache key
 */
function generateKey(userId, resource, params = {}) {
  const paramsString = Object.keys(params).length > 0 
    ? `:${JSON.stringify(params)}` 
    : '';
  
  return `user:${userId}:${resource}${paramsString}`;
}

/**
 * Invalidate all cache entries for a specific user
 * Useful when user data changes (e.g., new emails classified)
 * @param {string} userId - User ID
 * @returns {number} Number of deleted entries
 */
function invalidateUser(userId) {
  const allKeys = cache.keys();
  const userKeys = allKeys.filter(key => key.startsWith(`user:${userId}:`));
  
  if (userKeys.length > 0) {
    return delMany(userKeys);
  }
  
  return 0;
}

/**
 * Invalidate cache entries for a specific resource type
 * @param {string} resource - Resource type (e.g., 'stats', 'emails')
 * @returns {number} Number of deleted entries
 */
function invalidateResource(resource) {
  const allKeys = cache.keys();
  const resourceKeys = allKeys.filter(key => key.includes(`:${resource}`));
  
  if (resourceKeys.length > 0) {
    return delMany(resourceKeys);
  }
  
  return 0;
}

/**
 * Event listeners for cache operations
 * Useful for debugging and monitoring
 */
cache.on('expired', (key, value) => {
  console.log(`⏱️  Cache EXPIRED: ${key}`);
});

cache.on('flush', () => {
  console.log('🧹 Cache FLUSHED');
});

cache.on('del', (key, value) => {
  console.log(`🗑️  Cache DEL event: ${key}`);
});

// Export cache service
module.exports = {
  get,
  set,
  del,
  delMany,
  flush,
  keys,
  has,
  getStats,
  resetStats,
  getSize,
  generateKey,
  invalidateUser,
  invalidateResource,
  
  // Export raw cache instance for advanced usage
  cache
};
