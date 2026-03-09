# ElderConnect AI — Voice Assistant Feature

An **AI-powered Voice Assistant** that lets elderly users request help by speaking instead of typing. Recognised speech is sent to an AI backend that returns a structured request (category, priority, summary) which the user can confirm and save.

---

## 🚀 Quick Preview (zero setup — no MongoDB, no OpenAI key)

The fastest way to see the app in action is a two-step process:

**Step 1 — start the demo backend** (in-memory storage, rule-based AI):

```bash
cd backend
npm install
node demo-server.js
# → Listening on http://localhost:3000
```

**Step 2 — open the browser demo**:

Open `demo/index.html` directly in Chrome or Edge (double-click the file, or drag it into the browser).

That's it. You'll see the full Voice Assistant UI inside a phone frame. Click **"Tap to Speak"** and say something like:

- *"I need someone to buy groceries for me"*
- *"Please pick up my blood pressure medicine from the pharmacy"*
- *"I fell and I cannot get up"*

The demo processes your speech, shows you the AI result (category + priority + summary), and lets you confirm and save the request — all running locally with no external services.

> **Browser note:** Voice recognition works in Chrome and Edge on desktop. If your browser blocks microphone access, a text input box will appear automatically so you can type your request instead.

| Idle screen | After speaking — AI confirmation |
|:-----------:|:--------------------------------:|
| ![Idle screen](https://github.com/user-attachments/assets/95ba382e-9ada-4793-bc4e-da0e80fa7ac3) | ![Confirm screen](https://github.com/user-attachments/assets/aef424b0-5a2a-4939-907d-279de71a2edf) |

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

### Option A — Demo (no external accounts needed)

```bash
cd backend
npm install
node demo-server.js        # http://localhost:3000 — no MongoDB or OpenAI required
```

Then open `demo/index.html` in Chrome or Edge.

### Option B — Full stack (real MongoDB + OpenAI)

#### Backend

```bash
cd backend
cp .env.example .env       # fill in MONGODB_URI and OPENAI_API_KEY
npm install
npm run dev                # starts on http://localhost:3000
npm test                   # run Jest tests (15 tests, no external services needed)
```

#### Frontend (React Native / Expo)

```bash
cd frontend
npm install
npx expo start             # opens Expo DevTools
# scan the QR code with Expo Go on your phone, or press 'w' for the web preview
```

> **Note:** Set `EXPO_PUBLIC_API_URL` in your shell (or edit `BASE_URL` in `frontend/services/api.ts`) to point at your running backend, e.g. `http://192.168.1.100:3000`.

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
