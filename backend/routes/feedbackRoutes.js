// Feedback Routes
// API endpoints for user feedback on email classifications

const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const authMiddleware = require('../middleware/authMiddleware');
const syncUserMiddleware = require('../middleware/syncUserMiddleware');
const { validate, schemas } = require('../middleware/validation');

// All feedback routes require authentication
router.use(authMiddleware);
router.use(syncUserMiddleware);

/**
 * POST /api/feedback
 * Submit feedback on an email classification
 * Body: { emailId, correctLabel, notes? }
 */
router.post('/', validate(schemas.feedback), feedbackController.submitFeedback);

/**
 * GET /api/feedback
 * Get all feedback submitted by the current user
 */
router.get('/', feedbackController.getUserFeedback);

/**
 * GET /api/feedback/stats
 * Get feedback statistics (user and global)
 */
router.get('/stats', feedbackController.getFeedbackStats);

/**
 * DELETE /api/feedback/:id
 * Delete a specific feedback entry
 */
router.delete('/:id', feedbackController.deleteFeedback);

module.exports = router;
