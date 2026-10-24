import rateLimit from "express-rate-limit";

// Auth rate limiter: strict limit on authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

// General API rate limiter for REST routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "Too many requests. Please slow down.",
  },
});

// Message rate limiter: prevents spamming message creation
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "fail",
    message: "You are sending messages too quickly. Please wait a moment.",
  },
});
