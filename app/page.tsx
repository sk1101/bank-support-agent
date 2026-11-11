"use client";

import { useState, useRef, useEffect } from "react";
import type { Content } from "@google/genai";
import { initialState, type BankState } from "@/lib/data";
import type { LogEntry, Pending } from "@/lib/agent";

type Msg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "What's my balance?",
  "How much did I spend on food delivery in October?",
  "Show my last 5 transactions",
  "I don't recognise a 1,249 AED charge — freeze my debit card",
];

export default function Home() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", text: "Hi! I'm Demo Bank's assistant. Ask me about your balance, spending or cards." },
  ]);
  const [contents, setContents] = useState<Content[]>([]);
  const [bank, setBank] = useState<BankState>(initialState);
  const [pending, setPending] = useState<Pending | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, pending, loading]);

  async function call(body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, state: bank, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setContents(data.contents);
      setBank(data.state);
      setPending(data.pending);
      setLog((l) => [...l, ...data.log]);
      if (data.reply) setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: `⚠️ ${e instanceof Error ? e.message : "Error"}` }]);
    } finally {
      setLoading(false);
    }
  }

  function send(text: string) {
    if (!text.trim() || loading || pending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    call({ message: text });
  }

  function decide(decision: "confirm" | "cancel") {
    if (!pending) return;
    const p = pending;
    setPending(null);
    setMessages((m) => [...m, { role: "user", text: decision === "confirm" ? "✅ Confirmed" : "❌ Cancelled" }]);
    call({ pending: p, decision });
  }

  function reset() {
    setMessages([{ role: "assistant", text: "Demo reset. Ask me anything about your account." }]);
    setContents([]);
    setBank(initialState);
    setPending(null);
    setLog([]);
  }

  const actionLabel = pending
    ? `${pending.call.name === "freeze_card" ? "Freeze" : "Unfreeze"} card ending ${pending.call.args.last4}?`
    : "";

  return (
    <main className="wrap">
      <header>
        <h1>Demo Bank · AI Support Agent</h1>
        <p>Gemini decides which tool to call. Code does the work. Sensitive actions need your confirmation.</p>
      </header>

      <div className="grid">
        <section className="chat">
          <div className="messages">
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.text}</div>
            ))}
            {pending && (
              <div className="confirm">
                <strong>Action needs your approval</strong>
                <span>{actionLabel}</span>
                <div>
                  <button onClick={() => decide("confirm")}>Confirm</button>
                  <button className="ghost" onClick={() => decide("cancel")}>Cancel</button>
                </div>
              </div>
            )}
            {loading && <div className="msg assistant muted">Thinking…</div>}
            <div ref={endRef} />
          </div>

          <div className="chips">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => send(s)} disabled={loading || !!pending}>{s}</button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your account…" disabled={loading || !!pending} />
            <button type="submit" disabled={loading || !!pending || !input.trim()}>Send</button>
          </form>
        </section>

        <aside>
          <div className="panel">
            <div className="panelHead"><h2>Account data</h2><button className="ghost small" onClick={reset}>Reset demo</button></div>
            {bank.accounts.map((a) => (
              <div key={a.id} className="row"><span>{a.type} · {a.id}</span><b>AED {a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b></div>
            ))}
            {bank.cards.map((c) => (
              <div key={c.id} className="row"><span>{c.kind} •••• {c.last4}</span><b className={c.status}>{c.status}</b></div>
            ))}
          </div>

          <div className="panel">
            <h2>Tool calls</h2>
            {log.length === 0 && <p className="muted">Tool calls made by the AI will appear here.</p>}
            {log.map((l, i) => (
              <details key={i} className="log">
                <summary><code>{l.name}</code> <span className={`tag ${l.status.replace(" ", "-")}`}>{l.status}</span></summary>
                <pre>args: {JSON.stringify(l.args, null, 2)}{l.result !== undefined ? `\nresult: ${JSON.stringify(l.result, null, 2)}` : ""}</pre>
              </details>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
