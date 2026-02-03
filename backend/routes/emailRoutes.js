// Email Routes
// API endpoints for email classification

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');
const syncUserMiddleware = require('../middleware/syncUserMiddleware');

// All email routes require authentication and user sync
router.use(authMiddleware);
router.use(syncUserMiddleware);

// Classify all unclassified emails
router.post('/classify', emailController.classifyEmails);

// Get classification statistics
router.get('/stats', emailController.getClassificationStats);

// Get all emails (alias for /classified for backward compatibility)
router.get('/', emailController.getClassifiedEmails);

// Get classified emails
router.get('/classified', emailController.getClassifiedEmails);

// Delete a single email
router.delete('/:id', emailController.deleteEmail);

// Bulk delete multiple emails
router.post('/bulk-delete', emailController.bulkDeleteEmails);

// Auto clean all phishing emails
router.post('/clean-phishing', emailController.cleanPhishingEmails);

module.exports = router;
