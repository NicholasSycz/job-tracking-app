import rateLimit from "express-rate-limit";
import { isDevelopment } from "../config";

// Skip rate limiting in development for easier testing
const skip = () => isDevelopment;

// Auth endpoints - stricter limits (5 requests per minute)
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: "Too many authentication attempts. Please try again in a minute.",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit headers
  skip,
});

// API endpoints - more lenient (100 requests per minute)
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: "Too many requests. Please slow down.",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});

// Bulk operations - stricter (10 requests per minute)
export const bulkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: "Too many bulk operations. Please try again in a minute.",
    code: "RATE_LIMIT_EXCEEDED",
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip,
});
