const { z } = require('zod');

// MongoDB ObjectId validation
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');

// Email query validation
const emailQuerySchema = z.object({
  emailId: objectIdSchema.optional(),
  userId: objectIdSchema.optional(),
  category: z.enum(['spam', 'phishing', 'safe', 'unknown']).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

// Feedback validation
const feedbackSchema = z.object({
  emailId: objectIdSchema,
  userId: objectIdSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(500).optional(),
  category: z.enum(['spam', 'phishing', 'safe']),
});

// Delete email validation
const deleteEmailSchema = z.object({
  emailId: objectIdSchema,
});

// Bulk operation validation
const bulkOperationSchema = z.object({
  emailIds: z.array(objectIdSchema).min(1).max(100),
  action: z.enum(['delete', 'markAsRead', 'archive']).optional(),
});

// Gmail fetch validation
const gmailFetchSchema = z.object({
  maxResults: z.coerce.number().int().positive().max(500).optional(),
  pageToken: z.string().optional(),
  query: z.string().max(200).optional(),
});

/**
 * Middleware factory for request validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - 'body' | 'query' | 'params'
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      req[source] = validated; // Replace with validated/sanitized data
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validate,
  schemas: {
    emailQuery: emailQuerySchema,
    feedback: feedbackSchema,
    deleteEmail: deleteEmailSchema,
    bulkOperation: bulkOperationSchema,
    gmailFetch: gmailFetchSchema,
  },
};
