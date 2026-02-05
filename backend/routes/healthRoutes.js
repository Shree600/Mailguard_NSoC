/**
 * Health Check Routes
 * Provides system health and readiness endpoints for monitoring
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

/**
 * GET /health
 * Basic health check endpoint
 * Returns server status, uptime, and database connection status
 */
router.get('/', (req, res) => {
  try {
    // Get database connection state
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    // Calculate uptime in seconds
    const uptimeSeconds = process.uptime();
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    // Prepare health response
    const health = {
      status: dbState === 1 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        minutes: uptimeMinutes,
        hours: uptimeHours,
        formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${Math.floor(uptimeSeconds % 60)}s`
      },
      database: {
        status: dbStatus[dbState] || 'unknown',
        connected: dbState === 1
      },
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      environment: process.env.NODE_ENV || 'development'
    };

    // Return 200 if healthy, 503 if database is not connected
    const statusCode = dbState === 1 ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error) {
    // If any error occurs, return 500
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * GET /health/ready
 * Readiness probe - checks if server is ready to accept traffic
 * Used by container orchestration systems
 */
router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  
  if (dbState === 1) {
    res.status(200).json({
      ready: true,
      message: 'Server is ready to accept traffic'
    });
  } else {
    res.status(503).json({
      ready: false,
      message: 'Server is not ready - database not connected'
    });
  }
});

/**
 * GET /health/live
 * Liveness probe - checks if server process is alive
 * Used by container orchestration systems
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    alive: true,
    message: 'Server process is alive'
  });
});

module.exports = router;
