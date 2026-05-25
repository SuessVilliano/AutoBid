"use client";
import { ArrowUpRight, Clock, Loader2, RefreshCw, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Notice } from "@/components/PageHeader";
import { AuthGate } from "@/components/AuthGate";
import { ScoreDial } from "@/components/ScoreDial";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge, Button } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { enabledNaics, type CompanyProfile } from "@/lib/companyProfile";
import { daysLeft, fmtDate } from "@/lib/format";
import { supabaseEnabled } from "@/lib/supabase/env";
import type { FeedItem } from "@/lib/types";

const FILTERS = [
  { label: "All", min: 0 },
  { label: "Worth a look (45+)", min: 45 },
  { label: "Recommended (70+)", min: 70 },
];

type Source = "demo" | "sam";

export default function FeedPage() {
  return (
    <AuthGate>
      {({ company }) => <FeedBody company={company} />}
    </AuthGate>
  );
}

function FeedBody({ company }: { company: CompanyProfile }) {
  const [source, setSource] = useState<Source>(supabaseEnabled ? "sam" : "demo");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [min, setMin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [matchProfile, setMatchProfile] = useState(true);
  const [samError, setSamError] = useState<string | null>(null);

  const myCodes = useMemo(() => enabledNaics(company), [company]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setSamError(null);
    try {
      if (source === "sam") {
        const res = await api.samSearch({
          naics: myCodes.length ? myCodes : undefined,
          limit: 50,
        });
        if (res.error) setSamError(res.error);
        const mapped: FeedItem[] = res.items.map((o) => ({
          id: String(o.id),
          title: o.title,
          naics: o.naics ?? null,
          set_aside: o.set_aside ?? null,
          response_deadline: o.response_deadline ?? null,
          url: o.url ?? null,
          total_score: scoreOpp(o, myCodes),
          recommended: !!(o.naics && myCodes.includes(o.naics)),
          rationale: o.description?.slice(0, 160) ?? null,
        }));
        setItems(mapped);
      } else {
        const res = await api.feed(COMPANY_ID, min);
        setItems(res.items);
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }, [source, min, myCodes]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const filtered = useMemo(() => {
    let next = items;
    if (matchProfile && myCodes.length > 0) {
      next = next.filter((o) => o.naics && myCodes.includes(o.naics));
    }
    if (min > 0) next = next.filter((o) => (o.total_score ?? 0) >= min);
    return next;
  }, [items, matchProfile, myCodes, min]);

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
          <div className="flex gap-1 border border-line rounded-sm p-1 bg-card">
            <button onClick={() => setSource("demo")}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                source === "demo" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
              Demo feed
            </button>
            <button onClick={() => setSource("sam")}
              className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                source === "sam" ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}>
              SAM.gov (live)
            </button>
          </div>

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

          <Button onClick={loadFeed} variant="ghost" className="ml-auto">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        {samError && (
          <div className="mb-4 text-sm bg-bad/5 border border-bad/30 text-bad font-mono rounded-sm p-3">
            {samError}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ink-soft text-sm mb-2">
              <Loader2 className="animate-spin" size={14} /> Loading {source === "sam" ? "SAM.gov" : "demo"} opportunities…
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
            body={source === "sam"
              ? "SAM.gov returned no opportunities for the last 30 days matching your filters. Try widening the date range or removing the profile filter."
              : "Demo feed empty — switch to 'SAM.gov (live)' to pull real opportunities."} />
        )}

        <ul className="space-y-3">
          {filtered.map((o, i) => {
            const dl = daysLeft(o.response_deadline);
            const urgent = dl != null && dl <= 7;
            const matches = !!(o.naics && myCodes.includes(o.naics));
            const inner = (
              <div className="group flex items-center gap-3 sm:gap-5 bg-card border border-line rounded-sm px-4 sm:px-5 py-4 hover:border-ink/40 transition-colors shadow-card">
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
                    {source === "sam" && <Badge>SAM.gov</Badge>}
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
              </div>
            );
            return (
              <li key={o.id} className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                {source === "sam" && o.url ? (
                  <a href={o.url} target="_blank" rel="noreferrer">{inner}</a>
                ) : (
                  <Link href={`/opportunity/${o.id}`}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function scoreOpp(o: { naics: string | null; set_aside: string | null; value: number | null },
                  myCodes: string[]): number {
  let score = 40;
  if (o.naics && myCodes.includes(o.naics)) score += 35;
  if (o.set_aside) score += 10;
  if (o.value && o.value >= 100000) score += 10;
  return Math.min(score, 95);
}
