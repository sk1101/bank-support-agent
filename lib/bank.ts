// Mock bank data + the deterministic "tools" the AI is allowed to call.
// The AI never touches this data directly — it can only ask for a tool to run.

import { Type, type FunctionDeclaration } from "@google/genai";

import type { BankState, Card } from "./data";
export type { BankState } from "./data";

// Actions that change something for the customer. The app pauses and asks the user before running these.
export const SENSITIVE_TOOLS = new Set(["freeze_card", "unfreeze_card"]);

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_accounts",
    description: "List the customer's accounts with their current balances.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_cards",
    description: "List the customer's cards and whether each is active or frozen.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "list_transactions",
    description: "List transactions, newest first. All filters are optional.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        account_id: { type: Type.STRING, description: "e.g. ACC-001" },
        category: { type: Type.STRING, description: "e.g. Food Delivery, Groceries, Subscriptions" },
        month: { type: Type.STRING, description: "YYYY-MM, e.g. 2026-10" },
        limit: { type: Type.INTEGER, description: "Max number of transactions to return (default 10)" },
      },
    },
  },
  {
    name: "get_spending_summary",
    description: "Exact total spending (money out, excluding transfers) grouped by category. Use this for ANY totals question.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        month: { type: Type.STRING, description: "YYYY-MM. Omit for all time." },
        category: { type: Type.STRING, description: "Optional: only this category" },
      },
    },
  },
  {
    name: "freeze_card",
    description: "Freeze a card so it can't be used. Requires user confirmation (handled by the app).",
    parameters: {
      type: Type.OBJECT,
      properties: { last4: { type: Type.STRING, description: "Last 4 digits of the card" } },
      required: ["last4"],
    },
  },
  {
    name: "unfreeze_card",
    description: "Unfreeze a frozen card. Requires user confirmation (handled by the app).",
    parameters: {
      type: Type.OBJECT,
      properties: { last4: { type: Type.STRING, description: "Last 4 digits of the card" } },
      required: ["last4"],
    },
  },
];

const round = (n: number) => Math.round(n * 100) / 100;
const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();

// Runs a tool. Pure function: takes the current state, returns a result and the (possibly updated) state.
export function executeTool(
  name: string,
  args: Record<string, unknown>,
  state: BankState
): { result: unknown; state: BankState } {
  switch (name) {
    case "get_accounts":
      return { result: state.accounts, state };

    case "list_cards":
      return { result: state.cards, state };

    case "list_transactions": {
      let txns = [...state.transactions];
      if (args.account_id) txns = txns.filter((t) => norm(t.accountId) === norm(args.account_id));
      if (args.category) txns = txns.filter((t) => norm(t.category) === norm(args.category));
      if (args.month) txns = txns.filter((t) => t.date.startsWith(String(args.month)));
      txns.sort((a, b) => b.date.localeCompare(a.date));
      const limit = Number(args.limit) > 0 ? Number(args.limit) : 10;
      return { result: { count: txns.length, transactions: txns.slice(0, limit) }, state };
    }

    case "get_spending_summary": {
      let txns = state.transactions.filter((t) => t.amount < 0 && t.category !== "Transfer");
      if (args.month) txns = txns.filter((t) => t.date.startsWith(String(args.month)));
      if (args.category) txns = txns.filter((t) => norm(t.category) === norm(args.category));
      const byCategory: Record<string, number> = {};
      for (const t of txns) byCategory[t.category] = round((byCategory[t.category] ?? 0) + Math.abs(t.amount));
      const total = round(Object.values(byCategory).reduce((a, b) => a + b, 0));
      return { result: { currency: "AED", total, byCategory, transactionCount: txns.length }, state };
    }

    case "freeze_card":
    case "unfreeze_card": {
      const card = state.cards.find((c) => c.last4 === String(args.last4));
      if (!card) return { result: { error: `No card ending in ${args.last4}` }, state };
      const status = name === "freeze_card" ? "frozen" : "active";
      const cards = state.cards.map((c) => (c.id === card.id ? { ...c, status } : c)) as Card[];
      return { result: { success: true, card: `${card.kind} card ending ${card.last4}`, status }, state: { ...state, cards } };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` }, state };
  }
}
