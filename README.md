# AI Mortgage Calculator - Backend API

A conversational AI-powered mortgage calculator API built with **Fastify**, **Google Genkit**, and **TypeScript**. This application implements a **Human-in-the-Loop (HITL)** pattern to ensure user approval before executing mortgage calculations.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Frontend Application](#frontend-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Testing](#testing)

---

## Features

- 🤖 **Conversational AI**: Natural language understanding powered by Google's Gemini 2.5 Flash model
- 🏠 **Mortgage Calculations**: Accurate monthly payment, total amount, and interest calculations
- ✅ **Human-in-the-Loop (HITL)**: User approval required before executing calculations
- 💬 **Session Management**: Maintains conversation history across multiple interactions
- 🔄 **Stateful Conversations**: Context-aware responses based on conversation history
- 🛡️ **Type-Safe**: Full TypeScript implementation with Zod validation

---

## Architecture

The application follows a **Clean Architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
│                     (Controllers / Routes)                      │
├─────────────────────────────────────────────────────────────────┤
│                        Application Layer                        │
│                          (Use Cases)                            │
├─────────────────────────────────────────────────────────────────┤
│                        Domain Layer                             │
│                    (Repositories / Tools)                       │
├─────────────────────────────────────────────────────────────────┤
│                       Infrastructure Layer                      │
│              (AI Instance / External Services)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Architectural Patterns

#### 1. **Repository Pattern**
The `GenAiRepository` abstracts all AI-related operations, providing a clean interface for:
- Generating AI responses (`invoke`)
- Resuming interrupted workflows (`resumeWithApproval`)
- Managing session history (`getHistory`, `setHistory`)

#### 2. **Use Case Pattern**
The `ChatUseCase` orchestrates the business logic:
- Handles new and existing sessions
- Manages the approval workflow
- Coordinates between controllers and repositories

#### 3. **Dependency Injection**
Uses **tsyringe** for IoC (Inversion of Control):
- Repositories are registered as singletons
- Use cases receive dependencies via constructor injection
- Enables easy testing and loose coupling

#### 4. **Human-in-the-Loop (HITL) Pattern**
Implements Genkit's interrupt/resume workflow:

```
User Request → AI Generates Tool Call → Interrupt (Approval Required)
                                              ↓
                                    User Approves/Rejects
                                              ↓
                              Resume Tool Execution or Cancel
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **TypeScript** | 5.9.3 | Type-safe development |
| **Fastify** | 5.6.2 | High-performance web framework |
| **Genkit** | 1.27.0 | AI orchestration framework |
| **Google Genkit AI** | 1.27.0 | Gemini AI integration |
| **tsyringe** | 4.10.0 | Dependency injection |
| **Zod** | 4.2.1 | Runtime validation |
| **Vitest** | 4.0.16 | Testing framework |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Google AI API Key** (Gemini)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server Configuration
APP_PORT=5000

# Google AI Configuration (Required)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=model_you_want
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_PORT` | No | `5000` | Port for the API server |
| `GEMINI_API_KEY` | **Yes** | - | Google AI API key for Gemini model |
| `GEMINI_MODEL` | No | gemini-2.5-flash | Gemini model that the agent will use |

> **📌 Note:** You can obtain a free Gemini API key and Model from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:KaicPierre/ai-mortgage-calculator.git
   cd ai-mortgage-calculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY and GEMINI_MODEL
   ```

### Running the Application

**Development mode** (with hot reload):
```bash
npm run dev
```

The server will start at `http://localhost:5000` (or the port specified in `APP_PORT`).

---

## Frontend Application

This backend is designed to work with a companion frontend application.

### Setting Up the Frontend

1. **Clone the frontend repository**
   ```bash
   git clone git@github.com:KaicPierre/ai-mortgage-calculator-fe.git
   cd ai-mortgage-calculator-fe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the frontend**
   ```bash
   npm run dev
   ```

> **📌 Note:** Make sure the backend is running before starting the frontend application.

---

## API Documentation

### Base URL
```
http://localhost:5000
```

### Endpoints

#### `POST /chat`

Processes chat messages and handles mortgage calculations with HITL approval.

**Request Body:**

```json
{
  "message": "string (optional)",
  "sessionId": "string (optional)",
  "approval": {
    "approved": "boolean"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | string | Conditional* | User's chat message |
| `sessionId` | string | No | Session ID for continuing conversations |
| `approval` | object | Conditional* | Approval response for HITL workflow |
| `approval.approved` | boolean | Yes (if approval provided) | User's approval decision |

> *Either `message` or `approval` must be provided

**Response:**

```json
{
  "response": "string",
  "sessionId": "string",
  "requiresApproval": "boolean",
  "pendingCalculation": {
    "homePrice": "number",
    "downPayment": "number",
    "loanTerm": "number",
    "interestRate": "number",
    "zipCode": "string"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `response` | string | AI-generated response message |
| `sessionId` | string | Session identifier for conversation continuity |
| `requiresApproval` | boolean | Indicates if user approval is needed |
| `pendingCalculation` | object | Calculation parameters awaiting approval (only when `requiresApproval: true`) |

### Example Flows

#### 1. Starting a New Conversation

**Request:**
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to calculate mortgage for a $400,000 home with 20% down payment, 30 year term at 6.5% interest rate in zip code 90210"}'
```

**Response:**
```json
{
  "response": "I'd like to calculate your mortgage with these values:\n• Home Price: $400,000\n• Down Payment: $80,000\n• Loan Term: 30 years\n• Interest Rate: 6.5%\n• Zip Code: 90210\n\nDo you approve this calculation?",
  "sessionId": "abc123-def456-...",
  "requiresApproval": true,
  "pendingCalculation": {
    "homePrice": 400000,
    "downPayment": 80000,
    "loanTerm": 30,
    "interestRate": 6.5,
    "zipCode": "90210"
  }
}
```

#### 2. Approving the Calculation

**Request:**
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123-def456-...", "approval": {"approved": true}}'
```

**Response:**
```json
{
  "response": "Here are your mortgage calculation results:\n\n• Monthly Payment: $2,022.62\n• Total Amount: $728,143.20\n• Total Interest: $408,143.20\n\nThis is based on a loan amount of $320,000.",
  "sessionId": "abc123-def456-...",
  "requiresApproval": false
}
```

#### 3. Rejecting the Calculation

**Request:**
```bash
curl -X POST http://localhost:5000/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc123-def456-...", "approval": {"approved": false}}'
```

**Response:**
```json
{
  "response": "No problem! The calculation has been cancelled. Feel free to provide different values or ask me anything else about mortgages.",
  "sessionId": "abc123-def456-...",
  "requiresApproval": false
}
```

---

## Project Structure

```
src/
├── env/
│   └── index.ts              # Environment variable validation (Zod)
│
├── repositories/
│   ├── GenAiRepository.ts    # AI operations & session management
│   ├── interfaces.ts         # Repository contracts & types
│   └── tools/
│       └── mortgageCalculator.tool.ts  # Genkit tool with HITL
│
├── shared/
│   ├── ai-instance.ts        # Genkit AI singleton configuration
│   ├── logger.ts             # Pino logger configuration
│   ├── dependencyInjection/
│   │   └── index.ts          # tsyringe container setup
│   └── errors/
│       ├── AppError.ts       # Custom error classes
│       └── index.ts          # Error exports
│
├── useCases/
│   └── chatUseCase/
│       ├── chatController.ts # HTTP request handling
│       ├── chatUseCase.ts    # Business logic orchestration
│       └── chatUseCase.spec.ts # Unit tests
│
├── routes.ts                 # Fastify route definitions
└── server.ts                 # Application entry point
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| **ChatController** | HTTP layer - validates requests, formats responses |
| **ChatUseCase** | Orchestrates chat flow, manages sessions, handles HITL |
| **GenAiRepository** | AI interaction layer, interrupt handling, history |
| **mortgageCalculator** | Genkit tool with interrupt capability for HITL |
| **ai-instance** | Singleton Genkit AI configuration with Gemini |

---

## Testing

### Running Tests

```bash
# Run all tests with coverage
npm run test:coverage

# Run tests in watch mode
npx vitest

# Run specific test file
npx vitest run src/useCases/chatUseCase/chatUseCase.spec.ts
```

### Test Coverage

The project maintains high test coverage for business-critical components:

```
File            | % Stmts | % Branch | % Funcs | % Lines |
----------------|---------|----------|---------|---------|
chatUseCase.ts  |   100   |   93.75  |   100   |   100   |
```

---

## License

ISC

---

## Author

Kaic Pierre - [GitHub](https://github.com/KaicPierre)
