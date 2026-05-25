"use client";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "Summarize my pipeline",
  "Which opportunities should I prioritize this week?",
  "What's blocking my proposal drafts?",
  "Draft a capability statement for NAICS 541512",
];

export function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I'm your AutoBid copilot. Ask me about your pipeline, opportunities, or draft anything you need. I can also navigate you to the right page.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply || "…" }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "I couldn't reach the assistant just now. Try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open AutoBid assistant"
        className="fixed bottom-6 right-6 z-40 group inline-flex items-center gap-2 bg-ink text-paper pl-3 pr-4 py-3 rounded-full shadow-card hover:bg-navy transition-colors"
      >
        <span className="relative inline-flex items-center justify-center">
          <Sparkles size={18} className="text-brass" />
        </span>
        <span className="text-sm font-medium">Ask AutoBid</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="AutoBid assistant"
          className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-3rem)] bg-card border border-line rounded-sm shadow-card flex flex-col animate-fade-up"
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-brass" />
              <div>
                <div className="font-display text-base leading-none">AutoBid Copilot</div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mt-1">
                  Human-gated · Read-only by default
                </div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-ink-faint hover:text-ink p-1"
            >
              <X size={16} />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] bg-ink text-paper text-sm px-3 py-2 rounded-sm"
                    : "mr-auto max-w-[90%] bg-paper border border-line text-sm px-3 py-2 rounded-sm whitespace-pre-wrap"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="mr-auto text-xs text-ink-faint font-mono">thinking…</div>
            )}
            {messages.length <= 1 && (
              <div className="pt-2">
                <div className="text-[10px] font-mono uppercase tracking-widest text-ink-faint mb-2">
                  Try
                </div>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs border border-line rounded-sm px-2 py-1 text-ink-soft hover:bg-paper hover:text-ink"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-line p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about your pipeline…"
              className="flex-1 bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-ink text-paper p-2 rounded-sm disabled:opacity-40 hover:bg-navy"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
