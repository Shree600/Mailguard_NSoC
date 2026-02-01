// Email Routes
// API endpoints for email classification

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const authMiddleware = require('../middleware/authMiddleware');

// All email routes require authentication
router.use(authMiddleware);

// Classify all unclassified emails
router.post('/classify', emailController.classifyEmails);

// Get classification statistics
router.get('/stats', emailController.getClassificationStats);

// Get classified emails
router.get('/classified', emailController.getClassifiedEmails);

// Delete a single email
router.delete('/:id', emailController.deleteEmail);

module.exports = router;
