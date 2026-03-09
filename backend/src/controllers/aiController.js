const { processRequestText } = require('../services/openaiService');
const Request = require('../models/Request');

/**
 * POST /ai/process-request
 * Sends recognized speech text to the AI model and returns structured JSON.
 */
async function processRequest(req, res) {
  const { text } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must contain a non-empty "text" field' });
  }

  try {
    const aiResult = await processRequestText(text.trim());
    return res.status(200).json(aiResult);
  } catch (err) {
    console.error('[processRequest] AI processing error:', err.message);
    return res.status(502).json({ error: 'AI processing failed. Please try again.' });
  }
}

/**
 * POST /ai/create-request
 * Saves a confirmed AI-processed request to MongoDB.
 */
async function createRequest(req, res) {
  const { elderId, requestText, category, priority, request_summary, location } = req.body;

  if (!elderId || !requestText || !category || !priority || !request_summary) {
    return res.status(400).json({ error: 'Missing required fields: elderId, requestText, category, priority, request_summary' });
  }

  try {
    const newRequest = await Request.create({
      elderId,
      requestText,
      category,
      priority,
      requestSummary: request_summary,
      location: location || '',
      status: 'pending',
    });
    return res.status(201).json(newRequest);
  } catch (err) {
    console.error('[createRequest] Database error:', err.message);
    return res.status(500).json({ error: 'Failed to save request. Please try again.' });
  }
}

/**
 * GET /ai/requests/:elderId
 * Returns all requests for a given elder (all statuses).
 */
async function getRequestsByElder(req, res) {
  const { elderId } = req.params;

  if (!elderId.trim()) {
    return res.status(400).json({ error: 'Missing elderId parameter' });
  }

  try {
    const requests = await Request.find({ elderId }).sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (err) {
    console.error('[getRequestsByElder] Database error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch requests.' });
  }
}

/**
 * GET /ai/requests/pending
 * Returns all pending requests across all elders (volunteer dashboard).
 */
async function getPendingRequests(req, res) {
  try {
    const requests = await Request.find({ status: 'pending' }).sort({ createdAt: -1 });
    return res.status(200).json(requests);
  } catch (err) {
    console.error('[getPendingRequests] Database error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
}

module.exports = { processRequest, createRequest, getRequestsByElder, getPendingRequests };
