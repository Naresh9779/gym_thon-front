import rateLimit from 'express-rate-limit';

// Rate limiter for plan generation endpoints
// Prevents admin from spamming plan generation requests
export const planGenerationLimiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minute window (increased from 1 minute)
  max: 2, // Max 2 requests per 2 minutes per IP (reduced from 3/min)
  message: {
    ok: false,
    error: {
      message: 'Too many plan generation requests. Please wait 2 minutes before trying again.',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests (only count failed/pending ones)
  skipSuccessfulRequests: false,
  // Key generator: use user ID instead of IP for authenticated requests
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip || 'unknown';
  },
});

// Stricter rate limiter for AI-powered operations
// These are more expensive computationally and OpenRouter has their own limits
export const aiOperationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minute window (increased from 5 minutes)
  max: 5, // Max 5 AI operations per 10 minutes (reduced from 10/5min)
  message: {
    ok: false,
    error: {
      message: 'AI operation limit reached. OpenRouter has rate limits. Please wait 10 minutes before generating more plans.',
      code: 'AI_RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return (req as any).user?.userId || req.ip || 'unknown';
  },
});

// General API rate limiter (already exists in app.ts, but exported here for consistency)
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per 15 minutes
  message: {
    ok: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'GENERAL_RATE_LIMIT'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});
