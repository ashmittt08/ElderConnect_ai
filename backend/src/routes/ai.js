const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  processRequest,
  createRequest,
  getRequestsByElder,
  getPendingRequests,
} = require('../controllers/aiController');

// Limit AI-processing calls: 30 requests per minute per IP
const aiProcessLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

// Limit request-creation calls: 20 per minute per IP
const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

// Limit read calls: 60 per minute per IP
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

/**
 * POST /ai/process-request
 * Body: { text: string }
 * Returns structured JSON: { category, priority, request_summary }
 */
router.post('/process-request', aiProcessLimiter, processRequest);

/**
 * POST /ai/create-request
 * Body: { elderId, requestText, category, priority, request_summary, location? }
 * Saves confirmed request to MongoDB and marks it as "pending".
 */
router.post('/create-request', createLimiter, createRequest);

/**
 * GET /ai/requests/pending
 * Returns all pending requests across all elders for the volunteer dashboard.
 */
router.get('/requests/pending', readLimiter, getPendingRequests);

/**
 * GET /ai/requests/:elderId
 * Returns all requests for a specific elder.
 */
router.get('/requests/:elderId', readLimiter, getRequestsByElder);

module.exports = router;
