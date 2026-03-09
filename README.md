# ElderConnect AI — Voice Assistant Feature

An **AI-powered Voice Assistant** that lets elderly users request help by speaking instead of typing. Recognised speech is sent to an AI backend that returns a structured request (category, priority, summary) which the user can confirm and save.

---

## Project Structure

```
ElderConnect_ai/
├── backend/                  # Node.js + Express + MongoDB
│   ├── src/
│   │   ├── app.js            # Express app (middleware, routes)
│   │   ├── server.js         # Entry point — connects to MongoDB and starts HTTP server
│   │   ├── routes/
│   │   │   └── ai.js         # POST /ai/process-request, POST /ai/create-request, GET /ai/requests/*
│   │   ├── controllers/
│   │   │   └── aiController.js
│   │   ├── services/
│   │   │   └── openaiService.js   # OpenAI chat completion wrapper
│   │   └── models/
│   │       └── Request.js    # Mongoose schema
│   ├── tests/
│   │   └── ai.test.js        # Jest + Supertest unit/integration tests
│   ├── .env.example
│   └── package.json
│
└── frontend/                 # React Native + Expo
    ├── App.tsx               # App entry point
    ├── screens/
    │   └── VoiceAssistantScreen.tsx   # Main voice UI
    ├── services/
    │   └── api.ts            # axios wrappers for backend API calls
    ├── app.json              # Expo configuration (permissions, plugins)
    ├── babel.config.js
    └── package.json
```

---

## Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React Native, Expo, `@react-native-voice/voice`, axios |
| Backend   | Node.js, Express |
| Database  | MongoDB + Mongoose |
| AI        | OpenAI Chat Completions API (gpt-3.5-turbo) |
| Testing   | Jest + Supertest |

---

## Feature Overview

### 1 — Voice Input UI (`VoiceAssistantScreen.tsx`)
- Large, accessible microphone button (tap to start / stop recording)
- Real-time display of recognised speech
- Confirmation card showing AI-extracted category, priority, and summary
- "Create Request" and "Cancel" buttons
- Error messages for voice failures, network errors, and AI failures
- Full accessibility support (`accessibilityRole`, `accessibilityLabel`, `AccessibilityInfo.announceForAccessibility`)

### 2 — Speech-to-Text
Uses `@react-native-voice/voice` to convert microphone input to text.

### 3 — AI Processing (`POST /ai/process-request`)
Sends recognised text to OpenAI which returns:
```json
{
  "category": "daily_help",
  "priority": "medium",
  "request_summary": "Need help buying groceries"
}
```

### 4 — Request Persistence (`POST /ai/create-request`)
Saves confirmed requests to MongoDB with status `"pending"`.

### 5 — Volunteer Dashboard (`GET /ai/requests/pending`)
Returns all pending requests so volunteers can respond.

---

## MongoDB Schema

```js
{
  elderId:        String   // required
  requestText:    String   // original speech text
  category:       String   // daily_help | medical | emergency | social | transport | other
  priority:       String   // low | medium | high | urgent
  requestSummary: String   // AI-generated summary
  location:       String   // optional
  status:         String   // pending | accepted | in_progress | completed | cancelled
  createdAt:      Date
  updatedAt:      Date
}
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/ai/process-request` | Send speech text → get structured JSON |
| `POST` | `/ai/create-request` | Save confirmed request to MongoDB |
| `GET`  | `/ai/requests/pending` | Volunteer dashboard — all pending requests |
| `GET`  | `/ai/requests/:elderId` | All requests for a specific elder |
| `GET`  | `/health` | Health check |

---

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env          # add your MONGODB_URI and OPENAI_API_KEY
npm install
npm run dev                   # starts on http://localhost:3000
npm test                      # run Jest tests
```

### Frontend

```bash
cd frontend
npm install
npx expo start                # opens Expo DevTools
```

> **Note:** Update `EXPO_PUBLIC_API_URL` in your environment (or the `BASE_URL` constant in `services/api.ts`) to point at your running backend.

---

## Environment Variables (backend)

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP port (default: `3000`) |
| `MONGODB_URI` | MongoDB connection string |
| `OPENAI_API_KEY` | OpenAI API key |

---

## Running Tests

```bash
cd backend && npm test
```

15 tests cover:
- Health check endpoint
- `POST /ai/process-request` — happy path, missing text, AI failure
- `POST /ai/create-request` — happy path, missing fields, DB failure
- `GET /ai/requests/pending` — happy path, DB failure
- `GET /ai/requests/:elderId` — happy path, DB failure
- `openaiService` input validation
- 404 for unknown routes
