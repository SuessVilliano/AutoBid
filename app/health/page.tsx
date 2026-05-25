"use client";
import { Activity, AlertCircle, Loader2, RefreshCw, RotateCw, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";

type Health = {
  updated_at: string;
  metrics: { label: string; value: string; target: string; tone: "good" | "warn" | "bad" }[];
  components: { name: string; status: "healthy" | "warning" | "down" }[];
  recent_errors: {
    title: string; context: string; detail: string;
    severity: "low" | "medium" | "high"; state: string;
    when: string; retries: number;
  }[];
};

const SEVERITY_TONE: Record<string, "ink" | "warn" | "bad"> = {
  low: "ink", medium: "warn", high: "bad",
};
const COMPONENT_TONE: Record<string, "good" | "warn" | "bad"> = {
  healthy: "good", warning: "warn", down: "bad",
};

export default function HealthPage() {
  const [data, setData] = useState<Health | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  function load() {
    setRefreshing(true);
    fetch("/api/system/health").then((r) => r.json()).then((d) => {
      setData(d);
      setRefreshing(false);
    });
  }
  useEffect(() => { load(); }, []);

  if (!data)
    return (
      <>
        <PageHeader eyebrow="Capture desk" title="System Health" />
        <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading…
        </div>
      </>
    );

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="System Health">
        <button
          onClick={load} disabled={refreshing}
          className="text-xs font-mono uppercase tracking-wider px-3 py-2 border border-line rounded-sm hover:bg-paper inline-flex items-center gap-2"
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <div className="p-8 space-y-6">
        <Card className="p-6 bg-gradient-to-r from-navy to-ink text-paper border-ink">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={18} className="text-brass" />
                <h2 className="font-display text-2xl">System Health Monitor</h2>
              </div>
              <p className="text-sm text-paper/70 max-w-xl">
                Real-time monitoring of your government contract acquisition system.
              </p>
            </div>
            <div className="text-right text-xs font-mono text-paper/60">
              <div>Last updated</div>
              <div className="text-paper">{new Date(data.updated_at).toLocaleTimeString()}</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          {data.metrics.map((m) => (
            <Card key={m.label} className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">
                  {m.label}
                </div>
                <Badge tone={m.tone}>{m.tone === "good" ? "healthy" : m.tone}</Badge>
              </div>
              <div className="font-display text-2xl tnum mt-2">{m.value}</div>
              <div className="text-[11px] font-mono text-ink-faint mt-1">Target: {m.target}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-display text-lg mb-1">Component health</h3>
            <p className="text-xs text-ink-faint mb-4">Status of system components</p>
            <ul className="space-y-2">
              {data.components.map((c) => (
                <li key={c.name}
                  className="flex items-center justify-between py-2 border-b border-line last:border-b-0">
                  <span className="text-sm">{c.name}</span>
                  <Badge tone={COMPONENT_TONE[c.status]}>{c.status}</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-display text-lg">Recent errors</h3>
              <button className="text-xs font-mono text-brass hover:text-ink">View all</button>
            </div>
            <p className="text-xs text-ink-faint mb-4">{data.recent_errors.filter((e) => e.state !== "resolved").length} active errors</p>
            <ul className="space-y-3">
              {data.recent_errors.map((e, i) => (
                <li key={i} className="border-l-2 border-line pl-3 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-warn" /> {e.title}
                      </div>
                      <div className="text-xs text-ink-soft mt-0.5">{e.context}</div>
                      <div className="text-xs text-ink-faint mt-1">{e.detail}</div>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <Badge tone={SEVERITY_TONE[e.severity]}>{e.severity}</Badge>
                      <Badge tone="ink">{e.state}</Badge>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-ink-faint mt-2">
                    {e.when} · retries: {e.retries}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-4">Quick actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <QuickAction icon={<AlertCircle size={16} className="text-bad" />}
              label="View error logs"
              caption="Open detailed error log" />
            <QuickAction icon={<RotateCw size={16} className="text-good" />}
              label="Retry failed jobs"
              caption="Reprocess failed opportunities" />
            <QuickAction icon={<SettingsIcon size={16} className="text-brass" />}
              label="Monitoring settings"
              caption="Configure alert thresholds" />
          </div>
        </Card>
      </div>
    </>
  );
}

function QuickAction({ icon, label, caption }:
  { icon: React.ReactNode; label: string; caption: string }) {
  return (
    <button className="text-left border border-line rounded-sm p-4 hover:bg-paper transition-colors">
      <div className="flex items-center gap-2 mb-1">{icon}<span className="font-medium text-sm">{label}</span></div>
      <div className="text-[11px] text-ink-faint">{caption}</div>
    </button>
  );
}
