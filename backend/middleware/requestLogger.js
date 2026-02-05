/**
 * REQUEST LOGGING MIDDLEWARE
 * Logs minimal HTTP request information for monitoring
 * Only logs in production when needed, no console spam
 */

/**
 * Request logging middleware
 * Logs method, path, status code, and response time
 */
const requestLogger = (req, res, next) => {
  // Record request start time
  const startTime = Date.now();

  // Skip logging for health checks to reduce noise
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  // Capture response finish event
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determine log level based on status code
    const isError = statusCode >= 400;
    const logFn = isError ? console.error : console.log;
    
    // Build log message
    const statusEmoji = statusCode >= 500 ? '🔴' : 
                        statusCode >= 400 ? '⚠️' : 
                        '✅';
    
    // Only log errors or in development mode
    if (isError || process.env.NODE_ENV !== 'production') {
      logFn(
        `${statusEmoji} ${req.method} ${req.path} - ${statusCode} (${duration}ms)`
      );
    }
  });

  next();
};

module.exports = requestLogger;
