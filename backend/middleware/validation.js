const { z } = require('zod');

// Escape regex special characters to prevent NoSQL injection
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// MongoDB ObjectId validation
const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ObjectId format');

// Email query validation (comprehensive)
const emailQuerySchema = z.object({
  emailId: objectIdSchema.optional(),
  userId: objectIdSchema.optional(),
  prediction: z.string().optional().transform(val => val === '' ? undefined : val)
    .pipe(z.enum(['spam', 'phishing', 'safe', 'legitimate', 'unknown', 'pending']).optional()),
  category: z.string().optional().transform(val => val === '' ? undefined : val)
    .pipe(z.enum(['spam', 'phishing', 'safe', 'unknown']).optional()),
  limit: z.coerce.number().int().positive().max(100).default(50),
  page: z.coerce.number().int().positive().default(1),
  offset: z.coerce.number().int().nonnegative().optional(),
  search: z.string().optional().transform(str => str === '' ? undefined : str).optional()
    .transform(str => str ? escapeRegex(str) : str),
  dateFrom: z.string().optional().transform(val => val === '' ? undefined : val)
    .pipe(z.string().datetime().optional()),
  dateTo: z.string().optional().transform(val => val === '' ? undefined : val)
    .pipe(z.string().datetime().optional()),
  sortBy: z.enum(['receivedAt', 'subject', 'sender', 'prediction']).default('receivedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Feedback validation (matches actual API contract)
const feedbackSchema = z.object({
  emailId: objectIdSchema.optional(),
  gmailId: z.string().optional(),
  correctLabel: z.enum(['phishing', 'legitimate']),
  notes: z.string().max(1000).optional(),
}).refine(
  (data) => data.emailId || data.gmailId,
  { message: 'Either emailId or gmailId must be provided' }
);

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
  dateFrom: z.union([z.string().datetime(), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
  dateTo: z.union([z.string().datetime(), z.literal('')]).optional().transform(val => val === '' ? undefined : val),
  fetchAll: z.boolean().optional(),
  timeRange: z.enum(['5m', '15m', '30m', '1h', '6h', '12h', '1d', '3d', '7d', '30d', 'all']).optional(),
});

// Route parameter validation for ObjectId
const idParamSchema = z.object({
  id: objectIdSchema,
});

// Classify emails body validation
const classifyEmailsSchema = z.object({
  forceReclassify: z.boolean().optional(),
});

// Admin retrain validation
const retrainSchema = z.object({
  dataFile: z.string().max(200).optional(),
  modelType: z.enum(['random_forest', 'logistic']).optional(),
});

// Dataset build validation
const datasetBuildSchema = z.object({
  outputFile: z.string().max(200).optional(),
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
          errors: (error.errors || error.issues)?.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })) || [],
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
    idParam: idParamSchema,
    classifyEmails: classifyEmailsSchema,
    retrain: retrainSchema,
    datasetBuild: datasetBuildSchema,
  },
};
