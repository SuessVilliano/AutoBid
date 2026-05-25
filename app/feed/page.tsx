"use client";
import { ArrowUpRight, Clock, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Notice } from "@/components/PageHeader";
import { ScoreDial } from "@/components/ScoreDial";
import { Badge, Button } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { daysLeft, fmtDate } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const FILTERS = [
  { label: "All", min: 0 },
  { label: "Worth a look (45+)", min: 45 },
  { label: "Recommended (70+)", min: 70 },
];

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [min, setMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!COMPANY_ID) { setLoading(false); return; }
    setLoading(true);
    api.feed(COMPANY_ID, min)
      .then((r) => setItems(r.items))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [min]);

  if (!COMPANY_ID) {
    return (
      <>
        <PageHeader eyebrow="Pipeline" title="Opportunity Feed" />
        <Notice title="Set a company id"
          body="Add NEXT_PUBLIC_COMPANY_ID to .env.local (the UUID of your row in the companies table) so the feed knows which profile to score against." />
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Pipeline" title="Opportunity Feed">
        <div className="flex gap-1 border border-line rounded-sm p-1 bg-card">
          {FILTERS.map((f) => (
            <button key={f.min} onClick={() => setMin(f.min)}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                min === f.min ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="p-8">
        {loading && (
          <div className="flex items-center gap-2 text-ink-soft text-sm">
            <Loader2 className="animate-spin" size={16} /> Loading opportunities…
          </div>
        )}
        {err && <p className="text-bad text-sm font-mono">{err}</p>}
        {!loading && !err && items.length === 0 && (
          <Notice title="Nothing scored yet"
            body="Run the SAM/Grants ingestion and the scoring task in the backend, then refresh. New, unscored items won't appear until they have a score." />
        )}

        <ul className="space-y-3">
          {items.map((o, i) => {
            const dl = daysLeft(o.response_deadline);
            const urgent = dl != null && dl <= 7;
            return (
              <li key={o.id} className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                <Link href={`/opportunity/${o.id}`}
                  className="group flex items-center gap-5 bg-card border border-line rounded-sm px-5 py-4 hover:border-ink/40 transition-colors shadow-card">
                  <ScoreDial score={o.total_score} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {o.recommended && (
                        <Badge tone="good"><ShieldCheck size={11} /> Recommended</Badge>)}
                      {o.naics && <Badge>{o.naics}</Badge>}
                      {o.set_aside && <Badge tone="brass">{o.set_aside}</Badge>}
                    </div>
                    <h3 className="font-display text-lg leading-snug truncate group-hover:text-navy">
                      {o.title}
                    </h3>
                    {o.rationale && (
                      <p className="text-sm text-ink-soft mt-0.5 line-clamp-1">{o.rationale}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`flex items-center justify-end gap-1.5 text-sm font-mono tnum ${
                      urgent ? "text-bad" : "text-ink-soft"}`}>
                      <Clock size={13} />
                      {dl == null ? "—" : `${dl}d`}
                    </div>
                    <div className="text-[11px] text-ink-faint mt-0.5">
                      {fmtDate(o.response_deadline)}
                    </div>
                  </div>
                  <ArrowUpRight size={18}
                    className="text-ink-faint group-hover:text-ink transition-colors shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
