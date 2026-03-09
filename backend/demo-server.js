/**
 * demo-server.js — zero-config preview server for ElderConnect AI
 *
 * No MongoDB or OpenAI key required.
 * Uses an in-memory store and a rule-based keyword classifier.
 *
 * Usage:
 *   node demo-server.js          # starts on http://localhost:3000
 *   PORT=4000 node demo-server.js
 */

'use strict';

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ─── In-memory request store ─────────────────────────────────────────────────
let _idCounter = 1;
const _requests = [];

// ─── Rule-based keyword classifier ───────────────────────────────────────────
const CATEGORY_RULES = [
  {
    category: 'emergency',
    keywords: ['fall', 'fell', 'accident', 'hurt', 'pain', 'bleeding', 'emergency', 'help me', 'call 911', 'ambulance'],
  },
  {
    category: 'medical',
    keywords: ['medicine', 'medication', 'prescription', 'pills', 'doctor', 'appointment', 'hospital', 'pharmacy', 'health', 'blood pressure', 'insulin'],
  },
  {
    category: 'transport',
    keywords: ['ride', 'drive', 'car', 'taxi', 'pick up', 'drop', 'transport', 'wheelchair', 'walk'],
  },
  {
    category: 'social',
    keywords: ['visit', 'talk', 'company', 'companion', 'loneli', 'friend', 'family', 'chat', 'call', 'video call', 'event', 'activity'],
  },
  {
    category: 'daily_help',
    keywords: ['groceries', 'food', 'cook', 'cleaning', 'laundry', 'dishes', 'garden', 'shopping', 'errand', 'chore', 'mail', 'newspaper'],
  },
];

const PRIORITY_RULES = [
  { priority: 'urgent', keywords: ['urgent', 'emergency', 'immediately', 'right now', 'asap', 'call 911', 'ambulance', 'fall', 'fell', 'bleeding', 'can\'t breathe'] },
  { priority: 'high',   keywords: ['today', 'soon', 'quickly', 'pain', 'hurt', 'medicine', 'prescription', 'appointment'] },
  { priority: 'low',    keywords: ['whenever', 'no rush', 'sometime', 'eventually', 'when you can'] },
];

function classifyText(text) {
  const lower = text.toLowerCase();

  // Determine category
  let category = 'other';
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      category = rule.category;
      break;
    }
  }

  // Determine priority
  let priority = 'medium'; // default
  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      priority = rule.priority;
      break;
    }
  }

  // Override priority for emergencies
  if (category === 'emergency') priority = 'urgent';

  // Build a short summary (first 8 words, capitalised)
  const words = text.trim().split(/\s+/);
  const summaryWords = words.slice(0, 8);
  const request_summary =
    summaryWords.join(' ').charAt(0).toUpperCase() + summaryWords.join(' ').slice(1);

  return { category, priority, request_summary };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: 'demo' });
});

// POST /ai/process-request
app.post('/ai/process-request', (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Request body must contain a non-empty "text" field' });
  }
  const result = classifyText(text.trim());
  res.json(result);
});

// POST /ai/create-request
app.post('/ai/create-request', (req, res) => {
  const { elderId, requestText, category, priority, request_summary, location } = req.body;
  if (!elderId || !requestText || !category || !priority || !request_summary) {
    return res.status(400).json({
      error: 'Missing required fields: elderId, requestText, category, priority, request_summary',
    });
  }
  const doc = {
    _id: String(_idCounter++),
    elderId,
    requestText,
    category,
    priority,
    requestSummary: request_summary,
    location: location || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  _requests.push(doc);
  console.log(`[demo] Request #${doc._id} saved — ${category} / ${priority}`);
  res.status(201).json(doc);
});

// GET /ai/requests/pending
app.get('/ai/requests/pending', (req, res) => {
  const pending = _requests
    .filter((r) => r.status === 'pending')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(pending);
});

// GET /ai/requests/:elderId
app.get('/ai/requests/:elderId', (req, res) => {
  const { elderId } = req.params;
  if (!elderId.trim()) {
    return res.status(400).json({ error: 'Missing elderId parameter' });
  }
  const results = _requests
    .filter((r) => r.elderId === elderId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(results);
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  const urlLine = `  Listening on  ${url}  `;
  const width = Math.max(38, urlLine.length);
  const border = '═'.repeat(width);
  const pad = (s) => s + ' '.repeat(width - s.length);
  console.log('');
  console.log(`  ╔${border}╗`);
  console.log(`  ║${pad('   ElderConnect AI  —  Demo Server    ')}║`);
  console.log(`  ╠${border}╣`);
  console.log(`  ║${pad(urlLine)}║`);
  console.log(`  ║${pad('  No MongoDB or OpenAI key needed     ')}║`);
  console.log(`  ║${pad('                                      ')}║`);
  console.log(`  ║${pad('  Open demo/index.html in a browser   ')}║`);
  console.log(`  ║${pad('  to see the full UI preview.         ')}║`);
  console.log(`  ╚${border}╝`);
  console.log('');
});

module.exports = app;
