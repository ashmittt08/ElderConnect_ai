const OpenAI = require('openai');

let _openai = null;

function getClient() {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const SYSTEM_PROMPT = `You are an AI assistant that processes help requests from elderly users.
Analyze the user's request text and extract structured information.
Always respond with valid JSON only, no additional text.

The JSON must follow this exact structure:
{
  "category": "<one of: daily_help, medical, emergency, social, transport, other>",
  "priority": "<one of: low, medium, high, urgent>",
  "request_summary": "<concise summary of the request in 10 words or fewer>"
}

Category guidelines:
- daily_help: groceries, cooking, cleaning, household tasks
- medical: medicines, doctor appointments, health concerns
- emergency: urgent help, falls, accidents, immediate danger
- social: companionship, visits, events, activities
- transport: rides, driving, mobility assistance
- other: anything not fitting above categories

Priority guidelines:
- urgent: life-threatening or immediate safety risk
- high: needs attention within hours
- medium: can be addressed within a day
- low: flexible timing, general assistance`;

/**
 * Process natural language text and return structured request data.
 * @param {string} text - The user's voice-to-text input.
 * @returns {Promise<{category: string, priority: string, request_summary: string}>}
 */
async function processRequestText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Request text must be a non-empty string');
  }

  const completion = await getClient().chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text.trim() },
    ],
    temperature: 0.2,
    max_tokens: 150,
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error('No response received from AI model');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI model returned invalid JSON');
  }

  const validCategories = ['daily_help', 'medical', 'emergency', 'social', 'transport', 'other'];
  const validPriorities = ['low', 'medium', 'high', 'urgent'];

  const category = validCategories.includes(parsed.category) ? parsed.category : 'other';
  const priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'medium';
  const request_summary =
    typeof parsed.request_summary === 'string' && parsed.request_summary.trim().length > 0
      ? parsed.request_summary.trim()
      : text.trim().slice(0, 100);

  return { category, priority, request_summary };
}

module.exports = { processRequestText };
