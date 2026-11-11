# Demo Bank · AI Support Agent

An agentic banking support assistant. You chat in plain English ("How much did I spend on food delivery in October?", "Freeze my debit card"), and the AI answers by **calling tools that run real code** instead of guessing.

**Stack:** Next.js (App Router, TypeScript) · Google Gemini function calling (`@google/genai`) · deployed on Vercel

## Features
- **Tool calling:** Gemini picks from 6 tools (`get_accounts`, `list_cards`, `list_transactions`, `get_spending_summary`, `freeze_card`, `unfreeze_card`). The code runs them and sends the results back.
- **Exact numbers:** totals are computed in code, never by the LLM, so there are no maths errors.
- **Human-in-the-loop:** sensitive actions (freeze/unfreeze card) pause and need the user to click Confirm.
- **Transparency:** a side panel shows every tool call with its arguments and result.
- **Stateless backend:** chat history and bank state live in the browser and are sent with each request, so it runs on serverless functions with no database.

## Run locally
```bash
npm install
cp .env.example .env.local   # then paste your Gemini key
npm run dev                  # open http://localhost:3000
```
Get a free key at https://aistudio.google.com/apikey

## Deploy to Vercel
1. Push this folder to a new GitHub repo.
2. On vercel.com, click **Add New → Project** and import the repo.
3. Under **Environment Variables**, add `GEMINI_API_KEY`.
4. Click **Deploy**.

## How it works (the 2-minute explanation)
```
Browser (app/page.tsx)
  │  POST /api/chat  { history, bankState, message }
  ▼
API route (app/api/chat/route.ts)
  ▼
Agent loop (lib/agent.ts)
  1. Send history + tool list to Gemini
  2. Gemini replies with either TEXT → done, or a FUNCTION CALL
  3. Function call → run it in code (lib/bank.ts) → send result back → repeat
  4. If the call is sensitive (freeze card) → STOP, ask the user to confirm
  ▼
Response { reply, updated history, updated bankState, pendingAction, toolLog }
```

**Why tools instead of letting the LLM answer?** LLMs are good at understanding what the user wants, but they're unreliable with numbers and must never make up account data. So the LLM only *decides what to do*, and deterministic code *does it*. That's the pattern banks need: auditable, accurate and controlled.

**Why confirmation?** An AI shouldn't take irreversible or customer-impacting actions on its own. The server refuses to run sensitive tools until the user approves.

**Why is the server stateless?** Vercel functions don't keep memory between requests, so the client sends the state each time. In a real bank, the state would come from core-banking APIs, and the tools would call those APIs instead of the mock data.

## Ideas for next versions
- Expose the tools as an **MCP server**, so any MCP client can use them
- Masking/redaction of account numbers before data reaches the LLM
- A dispute-a-transaction flow
- RAG over the bank's FAQ and fee schedule for policy questions
- Logging and evals: a test set of questions with expected tool calls
