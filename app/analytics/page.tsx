"use client";
import { Building2, Loader2, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/primitives";

type Analytics = {
  headline: {
    total_opportunities: number;
    qualification_rate: number;
    win_rate: number;
    total_pipeline_value: number;
    deltas: Record<string, string>;
  };
  trends: { week: string; total: number; qualified: number; submitted: number }[];
  status_distribution: { label: string; count: number; pct: number; tone: string }[];
  by_agency: { name: string; count: number; value: number }[];
  top_naics: { code: string; label: string; count: number }[];
  agent_performance: { name: string; tasks: number; avg_time_min: number }[];
};

const TONE_COLOR: Record<string, string> = {
  ink: "var(--ink)", brass: "var(--brass)", good: "var(--good)",
  warn: "var(--warn)", bad: "var(--bad)",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch("/api/analytics").then((r) => r.json()).then(setData);
  }, []);

  if (!data)
    return (
      <>
        <PageHeader eyebrow="Capture desk" title="Analytics" />
        <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading analytics…
        </div>
      </>
    );

  const maxTrend = Math.max(...data.trends.map((t) => t.total));
  const maxNaics = Math.max(...data.top_naics.map((n) => n.count));

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Analytics" />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-4 gap-5">
          <Kpi label="Total opportunities" value={String(data.headline.total_opportunities)}
            delta={data.headline.deltas.total_opportunities} />
          <Kpi label="Qualification rate" value={`${data.headline.qualification_rate}%`}
            delta={data.headline.deltas.qualification_rate} />
          <Kpi label="Win rate" value={`${data.headline.win_rate}%`}
            delta={data.headline.deltas.win_rate} />
          <Kpi label="Total pipeline value" value={fmtCurrency(data.headline.total_pipeline_value)}
            delta={data.headline.deltas.total_pipeline_value} />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Opportunity trends</h3>
              <TrendingUp size={16} className="text-ink-faint" />
            </div>
            <div className="space-y-3">
              {data.trends.map((t) => (
                <div key={t.week}>
                  <div className="flex items-center gap-3">
                    <div className="w-16 text-xs text-ink-faint">{t.week}</div>
                    <div className="flex-1 h-2 bg-paper border border-line rounded-sm overflow-hidden">
                      <div className="h-full bg-navy"
                        style={{ width: `${(t.total / maxTrend) * 100}%` }} />
                    </div>
                    <div className="w-8 text-right font-mono text-sm tnum">{t.total}</div>
                  </div>
                  <div className="ml-[4.25rem] text-[11px] text-ink-faint font-mono mt-1">
                    {t.qualified} qualified · {t.submitted} submitted
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg">Status distribution</h3>
              <PieChart size={16} className="text-ink-faint" />
            </div>
            <ul className="space-y-2.5">
              {data.status_distribution.map((s) => (
                <li key={s.label} className="flex items-center gap-3 text-sm">
                  <span className="inline-block w-2 h-2 rounded-full"
                    style={{ background: TONE_COLOR[s.tone] }} />
                  <span className="flex-1">{s.label}</span>
                  <span className="font-mono tnum">{s.count}</span>
                  <span className="font-mono tnum text-ink-faint w-12 text-right">{s.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-4">Opportunities by agency</h3>
          <ul className="space-y-2">
            {data.by_agency.map((a) => (
              <li key={a.name}
                className="flex items-center gap-4 py-2 border-b border-line last:border-b-0">
                <Building2 size={16} className="text-ink-faint" />
                <div className="flex-1">
                  <div className="text-sm">{a.name}</div>
                  <div className="text-[11px] text-ink-faint font-mono">{a.count} opportunities</div>
                </div>
                <div className="text-right">
                  <div className="font-mono tnum text-sm">{fmtCurrency(a.value)}</div>
                  <div className="text-[11px] text-ink-faint font-mono">Total value</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-4">Top NAICS codes</h3>
          <ul className="space-y-4">
            {data.top_naics.map((n) => (
              <li key={n.code}>
                <div className="flex items-baseline justify-between mb-1">
                  <div>
                    <span className="font-mono tnum text-sm">{n.code}</span>
                    <span className="text-sm text-ink-soft ml-2">{n.label}</span>
                  </div>
                  <span className="text-xs text-ink-faint">{n.count} opportunities</span>
                </div>
                <div className="h-1.5 bg-paper border border-line rounded-sm overflow-hidden">
                  <div className="h-full bg-navy"
                    style={{ width: `${(n.count / maxNaics) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-4">AI agent performance</h3>
          <div className="grid grid-cols-4 gap-4">
            {data.agent_performance.map((a) => (
              <div key={a.name} className="border border-line rounded-sm p-4">
                <div className="text-[11px] font-mono uppercase tracking-wider text-ink-faint">
                  {a.name}
                </div>
                <dl className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Tasks completed</dt>
                    <dd className="font-mono tnum">{a.tasks}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-faint">Avg time</dt>
                    <dd className="font-mono tnum">{a.avg_time_min} min</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, delta }: { label: string; value: string; delta?: string }) {
  const positive = delta?.startsWith("+");
  const negative = delta?.startsWith("-");
  return (
    <Card className="p-5">
      <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">{label}</div>
      <div className="font-display text-3xl tnum mt-2">{value}</div>
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

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
