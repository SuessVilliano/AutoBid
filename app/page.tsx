"use client";
import {
  Activity, BarChart3, Bot, ClipboardCheck, FileText, Loader2,
  type LucideIcon, PlusCircle, Search, Settings as SettingsIcon,
  TrendingDown, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";

type Kpis = {
  total_opportunities: number;
  qualified: number;
  proposals_generated: number;
  submitted: number;
  total_pipeline_value: number;
  win_rate: number;
  deltas: Record<string, string>;
  pipeline_stages: { stage: string; label: string; count: number; tone: string }[];
  conversion_rate: number;
};

type Event = { id: string; kind: string; title: string; detail: string; when: string };

const TONE_COLOR: Record<string, string> = {
  ink: "var(--ink)", brass: "var(--brass)", good: "var(--good)",
  warn: "var(--warn)", bad: "var(--bad)",
};

const EVENT_ICON: Record<string, LucideIcon> = {
  opportunity_detected: PlusCircle,
  qualified: ClipboardCheck,
  proposal_generated: FileText,
  agent_processed: Bot,
  manual_review: Activity,
  submitted: FileText,
};

export default function Dashboard() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/dashboard/kpis").then((r) => r.json()).then(setKpis);
    fetch("/api/activity").then((r) => r.json()).then((d) => setEvents(d.events));
  }, []);

  if (!kpis)
    return (
      <>
        <PageHeader eyebrow="Capture desk" title="Dashboard" />
        <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading pipeline…
        </div>
      </>
    );

  const maxStage = Math.max(...kpis.pipeline_stages.map((s) => s.count));

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Dashboard">
        <Badge tone="good">System active</Badge>
      </PageHeader>

      <div className="p-8 space-y-8">
        <p className="text-sm text-ink-soft -mt-2">
          Real-time overview of your government contract acquisition pipeline.
        </p>

        <div className="grid grid-cols-3 gap-5">
          <Kpi label="Total opportunities" value={kpis.total_opportunities}
            delta={kpis.deltas.total_opportunities} />
          <Kpi label="Qualified" value={kpis.qualified} delta={kpis.deltas.qualified} tone="good" />
          <Kpi label="Proposals generated" value={kpis.proposals_generated}
            delta={kpis.deltas.proposals_generated} tone="brass" />
          <Kpi label="Submitted" value={kpis.submitted} delta={kpis.deltas.submitted} tone="warn" />
          <Kpi label="Total pipeline value" value={fmtCurrency(kpis.total_pipeline_value)}
            delta={kpis.deltas.total_pipeline_value} tone="good" />
          <Kpi label="Win rate" value={`${kpis.win_rate}%`} delta={kpis.deltas.win_rate}
            tone="brass" />
        </div>

        <div className="grid grid-cols-[2fr,1fr] gap-6 items-start">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="flex items-center gap-2 font-display text-lg">
                  <BarChart3 size={16} className="text-brass" /> Pipeline overview
                </h3>
                <p className="text-xs text-ink-faint mt-0.5">Opportunities by stage</p>
              </div>
              <Link href="/pipeline" className="text-xs font-mono text-brass hover:text-ink">
                View pipeline →
              </Link>
            </div>
            <ul className="space-y-2">
              {kpis.pipeline_stages.map((s) => (
                <li key={s.stage} className="flex items-center gap-4">
                  <div className="w-36 text-xs text-ink-soft">{s.label}</div>
                  <div className="flex-1 h-5 bg-paper border border-line rounded-sm overflow-hidden">
                    <div className="h-full flex items-center px-2 text-[11px] font-mono text-paper"
                      style={{
                        width: `${(s.count / maxStage) * 100}%`,
                        background: TONE_COLOR[s.tone],
                      }}>
                      {s.count}
                    </div>
                  </div>
                  <div className="w-8 text-right font-mono tnum text-sm">{s.count}</div>
                </li>
              ))}
            </ul>
            <hr className="border-line my-5" />
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Conversion rate (New → Awarded)</span>
              <span className="text-good font-mono tnum">{kpis.conversion_rate}%</span>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg mb-1">Quick actions</h3>
            <p className="text-xs text-ink-faint mb-4">Common tasks and operations</p>
            <ul className="space-y-2">
              <QuickAction href="/add-opportunity" icon={<PlusCircle size={16} />}
                title="Add opportunity"
                caption="Manually add a new contract opportunity" />
              <QuickAction href="/feed" icon={<Search size={16} />}
                title="Search SAM.gov"
                caption="Search for new opportunities" />
              <QuickAction href="/analytics" icon={<FileText size={16} />}
                title="Generate report"
                caption="Create pipeline summary report" />
              <QuickAction href="/agents" icon={<Bot size={16} />}
                title="Run AI analysis"
                caption="Trigger qualification analysis" />
              <QuickAction href="/health" icon={<Activity size={16} />}
                title="System health"
                caption="Check automation status" />
              <QuickAction href="/settings" icon={<SettingsIcon size={16} />}
                title="Configure alerts"
                caption="Set up notifications" />
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-1">Recent activity</h3>
          <p className="text-xs text-ink-faint mb-4">Latest system events and updates</p>
          <ul className="space-y-3">
            {events.map((e) => {
              const Icon = EVENT_ICON[e.kind] ?? Activity;
              return (
                <li key={e.id} className="flex items-start gap-3 py-2 border-b border-line last:border-b-0">
                  <div className="mt-0.5 w-8 h-8 rounded-sm bg-paper border border-line flex items-center justify-center">
                    <Icon size={14} className="text-brass" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{e.title}</div>
                    <div className="text-xs text-ink-soft">{e.detail}</div>
                    <div className="text-[11px] font-mono text-ink-faint mt-1">{e.when}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, delta, tone = "ink" }:
  { label: string; value: number | string; delta?: string;
    tone?: "ink" | "good" | "warn" | "brass" }) {
  const positive = delta?.startsWith("+");
  const negative = delta?.startsWith("-");
  const accent = tone === "good" ? "text-good" : tone === "warn" ? "text-warn"
    : tone === "brass" ? "text-brass" : "text-ink";
  return (
    <Card className="p-5">
      <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">{label}</div>
      <div className={`font-display text-3xl tnum mt-2 ${accent}`}>{value}</div>
      {delta && (
        <div className={`mt-2 flex items-center gap-1 text-xs font-mono ${
          positive ? "text-good" : negative ? "text-bad" : "text-ink-faint"
        }`}>
          {positive ? <TrendingUp size={12} /> : negative ? <TrendingDown size={12} /> : null}
          {delta}
        </div>
      )}
    </Card>
  );
}

function QuickAction({ href, icon, title, caption }:
  { href: string; icon: React.ReactNode; title: string; caption: string }) {
  return (
    <li>
      <Link href={href}
        className="flex items-start gap-3 p-3 rounded-sm border border-line hover:bg-paper transition-colors">
        <div className="text-brass mt-0.5">{icon}</div>
        <div>
          <div className="font-medium text-sm">{title}</div>
          <div className="text-[11px] text-ink-faint">{caption}</div>
        </div>
      </Link>
    </li>
  );
}

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
