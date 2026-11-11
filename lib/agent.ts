// The agent loop: ask Gemini → if it wants a tool, run it in code → send the result back → repeat.

import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { executeTool, SENSITIVE_TOOLS, toolDeclarations, type BankState } from "./bank";

export type ToolCall = { id?: string; name: string; args: Record<string, unknown> };
export type Pending = { call: ToolCall; otherResponses: Part[] };
export type LogEntry = { name: string; args: Record<string, unknown>; result?: unknown; status: "executed" | "awaiting confirmation" | "confirmed" | "cancelled" };
export type AgentResult = { contents: Content[]; state: BankState; reply: string | null; pending: Pending | null; log: LogEntry[] };

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MAX_STEPS = 6;

const SYSTEM_PROMPT = `You are the customer support assistant for "Demo Bank" (UAE). Today is ${new Date().toISOString().slice(0, 10)}.
Rules:
- Always use tools to look up account data. Never guess or invent balances, transactions or cards.
- Never calculate totals yourself. For any "how much did I spend" question, call get_spending_summary.
- To freeze or unfreeze a card, call the tool directly. The app will ask the customer to confirm before it runs.
- If the data doesn't answer the question, say so plainly.
- Amounts are in AED. Keep answers short and friendly.
- Only help with banking questions for this customer.`;

function responsePart(call: ToolCall, result: unknown): Part {
  return { functionResponse: { id: call.id, name: call.name, response: { result } } };
}

export async function runAgent(contents: Content[], state: BankState, log: LogEntry[] = []): Promise<AgentResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT, tools: [{ functionDeclarations: toolDeclarations }] },
    });

    const modelContent = response.candidates?.[0]?.content;
    if (!modelContent) return { contents, state, reply: "Sorry, I couldn't generate a response.", pending: null, log };
    contents = [...contents, modelContent];

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) return { contents, state, reply: response.text ?? "", pending: null, log };

    const parts: Part[] = [];
    let pendingCall: ToolCall | null = null;

    for (const c of calls) {
      const call: ToolCall = { id: c.id, name: c.name ?? "", args: (c.args as Record<string, unknown>) ?? {} };

      if (SENSITIVE_TOOLS.has(call.name)) {
        if (pendingCall) {
          parts.push(responsePart(call, { error: "Only one sensitive action at a time. Ask the customer again." }));
        } else {
          pendingCall = call; // pause: don't run it until the user confirms
          log = [...log, { name: call.name, args: call.args, status: "awaiting confirmation" }];
        }
        continue;
      }

      const out = executeTool(call.name, call.args, state);
      state = out.state;
      log = [...log, { name: call.name, args: call.args, result: out.result, status: "executed" }];
      parts.push(responsePart(call, out.result));
    }

    if (pendingCall) return { contents, state, reply: null, pending: { call: pendingCall, otherResponses: parts }, log };
    contents = [...contents, { role: "user", parts }];
  }

  return { contents, state, reply: "Sorry, that took too many steps. Please try rephrasing.", pending: null, log };
}

// Called when the user clicks Confirm or Cancel on a sensitive action.
export async function resolvePending(
  contents: Content[],
  state: BankState,
  pending: Pending,
  confirmed: boolean
): Promise<AgentResult> {
  let result: unknown;
  let log: LogEntry[];
  if (confirmed) {
    const out = executeTool(pending.call.name, pending.call.args, state);
    state = out.state;
    result = out.result;
    log = [{ name: pending.call.name, args: pending.call.args, result, status: "confirmed" }];
  } else {
    result = { cancelled: true, message: "The customer chose not to go ahead." };
    log = [{ name: pending.call.name, args: pending.call.args, result, status: "cancelled" }];
  }
  const parts = [...pending.otherResponses, responsePart(pending.call, result)];
  return runAgent([...contents, { role: "user", parts }], state, log);
}
