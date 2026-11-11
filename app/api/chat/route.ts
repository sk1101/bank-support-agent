// API endpoint. The browser sends the chat history + bank state; we return the updated versions.
// Nothing is stored on the server, so it works on Vercel's serverless functions.

import { NextResponse } from "next/server";
import type { Content } from "@google/genai";
import { runAgent, resolvePending, type Pending } from "@/lib/agent";
import type { BankState } from "@/lib/bank";

type Body = {
  contents: Content[];
  state: BankState;
  message?: string;
  pending?: Pending;
  decision?: "confirm" | "cancel";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { contents, state } = body;

    if (body.pending && body.decision) {
      return NextResponse.json(await resolvePending(contents, state, body.pending, body.decision === "confirm"));
    }

    const message = (body.message ?? "").trim();
    if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

    const result = await runAgent([...contents, { role: "user", parts: [{ text: message }] }], state);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
