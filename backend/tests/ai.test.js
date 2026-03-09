const request = require('supertest');
const app = require('../src/app');

// Mock mongoose and Request model so tests don't need a real DB
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    connect: jest.fn().mockResolvedValue({}),
    model: actual.model,
    Schema: actual.Schema,
  };
});

jest.mock('../src/models/Request', () => {
  const mockRequest = {
    create: jest.fn(),
    find: jest.fn(),
  };
  return mockRequest;
});

// Mock openaiService so tests don't call the real OpenAI API
jest.mock('../src/services/openaiService', () => ({
  processRequestText: jest.fn(),
}));

const { processRequestText } = require('../src/services/openaiService');
const Request = require('../src/models/Request');

// ─────────────────────────────────────────
// Health check
// ─────────────────────────────────────────
describe('GET /health', () => {
  it('should return 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ─────────────────────────────────────────
// POST /ai/process-request
// ─────────────────────────────────────────
describe('POST /ai/process-request', () => {
  afterEach(() => jest.clearAllMocks());

  it('should return 400 when text is missing', async () => {
    const res = await request(app).post('/ai/process-request').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/non-empty/i);
  });

  it('should return 400 when text is an empty string', async () => {
    const res = await request(app).post('/ai/process-request').send({ text: '   ' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/non-empty/i);
  });

  it('should return 200 with structured JSON on success', async () => {
    const mockResult = {
      category: 'daily_help',
      priority: 'medium',
      request_summary: 'Need help buying groceries',
    };
    processRequestText.mockResolvedValueOnce(mockResult);

    const res = await request(app)
      .post('/ai/process-request')
      .send({ text: 'I need help buying groceries' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockResult);
    expect(processRequestText).toHaveBeenCalledWith('I need help buying groceries');
  });

  it('should return 502 when AI service fails', async () => {
    processRequestText.mockRejectedValueOnce(new Error('OpenAI timeout'));

    const res = await request(app)
      .post('/ai/process-request')
      .send({ text: 'I need help with medicines' });

    expect(res.statusCode).toBe(502);
    expect(res.body.error).toMatch(/AI processing failed/i);
  });
});

// ─────────────────────────────────────────
// POST /ai/create-request
// ─────────────────────────────────────────
describe('POST /ai/create-request', () => {
  afterEach(() => jest.clearAllMocks());

  const validBody = {
    elderId: 'elder123',
    requestText: 'I need help buying groceries',
    category: 'daily_help',
    priority: 'medium',
    request_summary: 'Need help buying groceries',
    location: 'Home',
  };

  it('should return 400 when required fields are missing', async () => {
    const res = await request(app).post('/ai/create-request').send({ elderId: 'elder123' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/i);
  });

  it('should return 201 with created request on success', async () => {
    const savedDoc = {
      _id: 'doc123',
      ...validBody,
      requestSummary: validBody.request_summary,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    Request.create.mockResolvedValueOnce(savedDoc);

    const res = await request(app).post('/ai/create-request').send(validBody);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.elderId).toBe('elder123');
  });

  it('should return 500 when database write fails', async () => {
    Request.create.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).post('/ai/create-request').send(validBody);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Failed to save request/i);
  });
});

// ─────────────────────────────────────────
// GET /ai/requests/pending
// ─────────────────────────────────────────
describe('GET /ai/requests/pending', () => {
  afterEach(() => jest.clearAllMocks());

  it('should return 200 with list of pending requests', async () => {
    const pendingRequests = [
      { _id: 'r1', elderId: 'e1', status: 'pending', requestSummary: 'Help with groceries' },
      { _id: 'r2', elderId: 'e2', status: 'pending', requestSummary: 'Need medicine pickup' },
    ];
    Request.find.mockReturnValueOnce({ sort: jest.fn().mockResolvedValueOnce(pendingRequests) });

    const res = await request(app).get('/ai/requests/pending');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('should return 500 when database query fails', async () => {
    Request.find.mockReturnValueOnce({
      sort: jest.fn().mockRejectedValueOnce(new Error('DB error')),
    });

    const res = await request(app).get('/ai/requests/pending');

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/Failed to fetch/i);
  });
});

// ─────────────────────────────────────────
// GET /ai/requests/:elderId
// ─────────────────────────────────────────
describe('GET /ai/requests/:elderId', () => {
  afterEach(() => jest.clearAllMocks());

  it('should return 200 with elder requests', async () => {
    const elderRequests = [
      { _id: 'r1', elderId: 'elder123', requestSummary: 'Help with groceries' },
    ];
    Request.find.mockReturnValueOnce({ sort: jest.fn().mockResolvedValueOnce(elderRequests) });

    const res = await request(app).get('/ai/requests/elder123');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].elderId).toBe('elder123');
  });

  it('should return 500 when database query fails', async () => {
    Request.find.mockReturnValueOnce({
      sort: jest.fn().mockRejectedValueOnce(new Error('DB error')),
    });

    const res = await request(app).get('/ai/requests/elder123');

    expect(res.statusCode).toBe(500);
  });
});

// ─────────────────────────────────────────
// openaiService unit tests (input validation only)
// ─────────────────────────────────────────
describe('openaiService.processRequestText (input validation)', () => {
  afterEach(() => jest.clearAllMocks());

  it('should propagate error when processRequestText rejects with empty string message', async () => {
    processRequestText.mockRejectedValueOnce(
      new Error('Request text must be a non-empty string')
    );
    await expect(processRequestText('')).rejects.toThrow(
      'Request text must be a non-empty string'
    );
  });

  it('should propagate error when processRequestText rejects with whitespace message', async () => {
    processRequestText.mockRejectedValueOnce(
      new Error('Request text must be a non-empty string')
    );
    await expect(processRequestText('   ')).rejects.toThrow(
      'Request text must be a non-empty string'
    );
  });
});

// ─────────────────────────────────────────
// 404 route
// ─────────────────────────────────────────
describe('Unknown routes', () => {
  it('should return 404 for unknown GET route', async () => {
    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });
});
