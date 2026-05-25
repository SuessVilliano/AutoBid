"use client";
import {
  Building2, CheckCircle2, Clock, DollarSign, ExternalLink, FileText,
  Loader2, Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";
import { daysLeft, fmtDate } from "@/lib/format";

type PipelineItem = {
  id: string;
  title: string;
  agency: string;
  naics: string | null;
  set_aside: string | null;
  value: number | null;
  response_deadline: string | null;
  url: string | null;
  total_score: number | null;
  stage: string;
  type: string;
};

type PipelineResp = {
  items: PipelineItem[];
  stage_labels: Record<string, string>;
  counts: Record<string, number>;
  totals: { value: number; qualified: number; submitted: number; due_this_week: number };
};

const STAGE_TONE: Record<string, "ink" | "brass" | "good" | "warn" | "bad"> = {
  new: "ink",
  enriched: "brass",
  qualified: "good",
  proposal_ready: "brass",
  submitted: "warn",
  not_fit: "bad",
};

export default function PipelinePage() {
  const [data, setData] = useState<PipelineResp | null>(null);
  const [stage, setStage] = useState<string>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"due" | "value" | "score">("due");

  useEffect(() => {
    const u = new URL("/api/pipeline", window.location.origin);
    if (stage !== "all") u.searchParams.set("stage", stage);
    if (q) u.searchParams.set("q", q);
    fetch(u.toString()).then((r) => r.json()).then(setData);
  }, [stage, q]);

  const sortedItems = useMemo(() => {
    if (!data) return [];
    const arr = [...data.items];
    if (sort === "due") arr.sort((a, b) => (a.response_deadline || "z").localeCompare(b.response_deadline || "z"));
    if (sort === "value") arr.sort((a, b) => (b.value || 0) - (a.value || 0));
    if (sort === "score") arr.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    return arr;
  }, [data, sort]);

  if (!data)
    return (
      <>
        <PageHeader eyebrow="Capture desk" title="Pipeline" />
        <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading pipeline…
        </div>
      </>
    );

  const totalCount = Object.values(data.counts).reduce((s, n) => s + n, 0);

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Pipeline">
        <Link href="/add-opportunity"
          className="text-xs font-mono uppercase tracking-wider px-3 py-2 bg-ink text-paper rounded-sm hover:bg-navy">
          + Add opportunity
        </Link>
      </PageHeader>

      <div className="p-8 space-y-6">
        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-ink-faint" />
                <input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search opportunities…"
                  className="bg-paper border border-line rounded-sm pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-ink min-w-[220px]"
                />
              </div>
              <select
                value={stage} onChange={(e) => setStage(e.target.value)}
                className="bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
              >
                <option value="all">All stages ({totalCount})</option>
                {Object.entries(data.stage_labels).map(([k, label]) => (
                  <option key={k} value={k}>{label} ({data.counts[k] || 0})</option>
                ))}
              </select>
            </div>
            <select
              value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
            >
              <option value="due">Sort by due date</option>
              <option value="value">Sort by value</option>
              <option value="score">Sort by score</option>
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint border-b border-line">
                <th className="py-3 px-4">Opportunity</th>
                <th className="py-3 px-4">Agency</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Due date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((o) => {
                const d = daysLeft(o.response_deadline);
                const overdue = d != null && d < 0;
                return (
                  <tr key={o.id} className="border-b border-line last:border-b-0 hover:bg-paper/50">
                    <td className="py-3 px-4 max-w-md">
                      <Link href={`/opportunity/${o.id}`} className="font-medium hover:text-navy">
                        {o.title}
                      </Link>
                      <div className="text-[11px] font-mono text-ink-faint mt-1">
                        NAICS: {o.naics || "—"} · score {o.total_score ?? "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-soft">
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} /> {o.agency}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tnum">
                      {o.value ? `$${(o.value / 1000).toFixed(0)}K` : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs">{fmtDate(o.response_deadline)}</div>
                      {d != null && (
                        <div className={`text-[11px] font-mono ${overdue ? "text-bad" : "text-ink-faint"}`}>
                          {overdue ? `${Math.abs(d)} days overdue` : `${d} days left`}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={STAGE_TONE[o.stage] || "ink"}>
                        {data.stage_labels[o.stage] || o.stage}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-ink-soft text-xs">{o.type}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2 text-ink-faint">
                        {o.url && (
                          <a href={o.url} target="_blank" rel="noreferrer"
                            className="hover:text-ink" aria-label="Open source">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <Link href={`/opportunity/${o.id}`} className="hover:text-ink"
                          aria-label="View detail">
                          <FileText size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedItems.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-ink-faint text-sm">
                  No opportunities match these filters.
                </td></tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="grid grid-cols-4 gap-4">
          <Totals icon={<DollarSign size={16} className="text-good" />}
            label="Total value" value={`$${(data.totals.value / 1_000_000).toFixed(1)}M`} />
          <Totals icon={<CheckCircle2 size={16} className="text-good" />}
            label="Qualified" value={String(data.totals.qualified)} />
          <Totals icon={<FileText size={16} className="text-brass" />}
            label="Submitted" value={String(data.totals.submitted)} />
          <Totals icon={<Clock size={16} className="text-warn" />}
            label="Due this week" value={String(data.totals.due_this_week)} />
        </div>
      </div>
    </>
  );
}

function Totals({ icon, label, value }:
  { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div>{icon}</div>
      <div>
        <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">{label}</div>
        <div className="font-display text-2xl tnum mt-0.5">{value}</div>
      </div>
    </Card>
  );
}
