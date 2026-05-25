"use client";
import {
  Bot, ClipboardCheck, FileSignature, Loader2, type LucideIcon, Search, Send,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";

type Agent = {
  id: string;
  name: string;
  role: string;
  status: "active" | "processing" | "idle";
  tasks_completed: number;
  last_active: string;
  description: string;
};

const ICONS: Record<string, LucideIcon> = {
  scraper: Search,
  qualifier: ClipboardCheck,
  writer: FileSignature,
  coordinator: Bot,
};

const STATUS_TONE: Record<Agent["status"], "good" | "warn" | "ink"> = {
  active: "good",
  processing: "warn",
  idle: "ink",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [perf, setPerf] = useState({ total_tasks: 0, active: 0, processing: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => {
      setAgents(d.agents);
      setPerf(d.performance);
      setLoading(false);
    });
  }, []);

  const current = agents.find((a) => a.id === selected);

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="AI Agents" />
      <div className="p-8 grid grid-cols-[320px,1fr] gap-6 items-start">
        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-display text-lg mb-3">Agents</h2>
            {loading ? (
              <div className="text-sm text-ink-faint flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} /> Loading…
              </div>
            ) : (
              <ul className="space-y-2">
                {agents.map((a) => {
                  const Icon = ICONS[a.id] ?? Bot;
                  const active = selected === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        onClick={() => setSelected(a.id)}
                        className={`w-full text-left border rounded-sm p-3 transition-colors ${
                          active ? "border-ink bg-paper" : "border-line hover:bg-paper/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon size={18} className="text-brass mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-sm truncate">{a.name}</span>
                              <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                            </div>
                            <div className="text-[11px] text-ink-faint mt-0.5">{a.role}</div>
                            <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint mt-2">
                              <span>{a.tasks_completed} tasks</span>
                              <span>{a.last_active}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="font-display text-base mb-3">System performance</h3>
            <dl className="text-sm space-y-2">
              <Row label="Total tasks" value={perf.total_tasks} />
              <Row label="Active agents" value={perf.active} />
              <Row label="Processing" value={perf.processing} />
            </dl>
          </Card>
        </div>

        <Card className="min-h-[520px] flex flex-col">
          {!current ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-12 py-20">
              <Bot size={32} className="text-ink-faint mb-4" />
              <h3 className="font-display text-xl">Select an AI Agent</h3>
              <p className="text-sm text-ink-soft mt-1 max-w-sm">
                Choose an agent from the list to view details and start a conversation.
              </p>
            </div>
          ) : (
            <AgentDetail agent={current} />
          )}
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="font-mono tnum">{value}</dd>
    </div>
  );
}

function AgentDetail({ agent }: { agent: Agent }) {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: `${agent.name} ready. ${agent.description}` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: `As the ${agent.name}, ${q}` },
          ],
        }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply || "…" }]);
    } finally {
      setBusy(false);
    }
  }

  const Icon = ICONS[agent.id] ?? Bot;
  return (
    <>
      <header className="border-b border-line p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon size={22} className="text-brass mt-0.5" />
          <div>
            <h2 className="font-display text-xl">{agent.name}</h2>
            <p className="text-sm text-ink-faint">{agent.role}</p>
            <p className="text-sm text-ink-soft mt-2 max-w-xl">{agent.description}</p>
          </div>
        </div>
        <Badge tone={STATUS_TONE[agent.status]}>{agent.status}</Badge>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] bg-ink text-paper text-sm px-3 py-2 rounded-sm"
                : "mr-auto max-w-[90%] bg-paper border border-line text-sm px-3 py-2 rounded-sm whitespace-pre-wrap"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="text-xs text-ink-faint font-mono">thinking…</div>}
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-line p-3 flex items-center gap-2"
      >
        <Sparkles size={16} className="text-brass" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask ${agent.name} anything…`}
          className="flex-1 bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
        />
        <button
          type="submit" disabled={busy || !input.trim()}
          className="bg-ink text-paper p-2 rounded-sm disabled:opacity-40 hover:bg-navy"
          aria-label="Send"
        >
          <Send size={16} />
        </button>
      </form>
    </>
  );
}
