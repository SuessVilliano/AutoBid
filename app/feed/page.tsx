"use client";
import { ArrowUpRight, Clock, Loader2, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Notice } from "@/components/PageHeader";
import { AuthGate } from "@/components/AuthGate";
import { ScoreDial } from "@/components/ScoreDial";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { enabledNaics, type CompanyProfile } from "@/lib/companyProfile";
import { daysLeft, fmtDate } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

const FILTERS = [
  { label: "All", min: 0 },
  { label: "Worth a look (45+)", min: 45 },
  { label: "Recommended (70+)", min: 70 },
];

export default function FeedPage() {
  return (
    <AuthGate>
      {({ company }) => <FeedBody company={company} />}
    </AuthGate>
  );
}

function FeedBody({ company }: { company: CompanyProfile }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [min, setMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [matchProfile, setMatchProfile] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.feed(COMPANY_ID, min)
      .then((r) => setItems(r.items))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [min]);

  const myCodes = useMemo(() => enabledNaics(company), [company]);

  const filtered = useMemo(() => {
    if (!matchProfile || myCodes.length === 0) return items;
    return items.filter((o) => o.naics && myCodes.includes(o.naics));
  }, [items, matchProfile, myCodes]);

  const hiddenCount = items.length - filtered.length;

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

      <div className="p-4 sm:p-8">
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={matchProfile}
              onChange={(e) => setMatchProfile(e.target.checked)}
              className="accent-ink"
            />
            <Target size={13} className="text-brass" />
            Match my profile ({myCodes.length} NAICS)
          </label>
          {matchProfile && hiddenCount > 0 && (
            <span className="text-xs font-mono text-ink-faint">
              {hiddenCount} hidden by profile filter
            </span>
          )}
          {myCodes.length === 0 && (
            <Link href="/settings"
              className="text-xs font-mono text-brass hover:text-ink underline">
              Set your NAICS codes →
            </Link>
          )}
        </div>

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ink-soft text-sm mb-2">
              <Loader2 className="animate-spin" size={14} /> Loading opportunities…
            </div>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        )}
        {err && <p className="text-bad text-sm font-mono">{err}</p>}
        {!loading && !err && filtered.length === 0 && items.length > 0 && (
          <Notice title="Nothing matches your profile"
            body="Try unchecking 'Match my profile' to see all opportunities, or add more NAICS codes in Settings." />
        )}
        {!loading && !err && items.length === 0 && (
          <Notice title="Nothing scored yet"
            body="Run the SAM/Grants ingestion in the backend, then refresh. New, unscored items won't appear until they have a score." />
        )}

        <ul className="space-y-3">
          {filtered.map((o, i) => {
            const dl = daysLeft(o.response_deadline);
            const urgent = dl != null && dl <= 7;
            const matches = !!(o.naics && myCodes.includes(o.naics));
            return (
              <li key={o.id} className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}>
                <Link href={`/opportunity/${o.id}`}
                  className="group flex items-center gap-3 sm:gap-5 bg-card border border-line rounded-sm px-4 sm:px-5 py-4 hover:border-ink/40 transition-colors shadow-card">
                  <ScoreDial score={o.total_score} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {o.recommended && (
                        <Badge tone="good"><ShieldCheck size={11} /> Recommended</Badge>)}
                      {o.naics && (
                        <Badge tone={matches ? "brass" : "ink"}>
                          {o.naics}{matches && " ✓"}
                        </Badge>
                      )}
                      {o.set_aside && <Badge tone="brass">{o.set_aside}</Badge>}
                    </div>
                    <h3 className="font-display text-base sm:text-lg leading-snug truncate group-hover:text-navy">
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
                    <div className="text-[11px] text-ink-faint mt-0.5 hidden sm:block">
                      {fmtDate(o.response_deadline)}
                    </div>
                  </div>
                  <ArrowUpRight size={18}
                    className="text-ink-faint group-hover:text-ink transition-colors shrink-0 hidden sm:block" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
