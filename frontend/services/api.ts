import axios from 'axios';

// Change this to your backend server address.
// In development with Expo Go on a physical device use your machine's local IP,
// e.g. 'http://192.168.1.100:3000'
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Send recognised speech text to the backend AI processing endpoint.
 * Returns { category, priority, request_summary }.
 */
export async function processVoiceRequest(text: string): Promise<{
  category: string;
  priority: string;
  request_summary: string;
}> {
  const response = await api.post('/ai/process-request', { text });
  return response.data;
}

/**
 * Save a confirmed, AI-processed request to MongoDB.
 */
export async function createRequest(payload: {
  elderId: string;
  requestText: string;
  category: string;
  priority: string;
  request_summary: string;
  location?: string;
}): Promise<Record<string, unknown>> {
  const response = await api.post('/ai/create-request', payload);
  return response.data;
}

/**
 * Fetch all pending requests (volunteer dashboard).
 */
export async function getPendingRequests(): Promise<Record<string, unknown>[]> {
  const response = await api.get('/ai/requests/pending');
  return response.data;
}

export default api;
