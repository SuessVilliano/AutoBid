"use client";
import { ArrowUpRight, Clock, Coins, Loader2, RefreshCw, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, Notice } from "@/components/PageHeader";
import { AuthGate } from "@/components/AuthGate";
import { SkeletonRow } from "@/components/Skeleton";
import { Badge, Button } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { CompanyProfile } from "@/lib/companyProfile";
import { daysLeft, fmtDate } from "@/lib/format";
import { supabaseEnabled } from "@/lib/supabase/env";

type GrantItem = {
  id: string;
  title: string;
  agency: string;
  cfda: string | null;
  response_deadline: string | null;
  posted_date: string | null;
  url: string | null;
};

export default function GrantsPage() {
  return (
    <AuthGate>
      {({ company }) => <GrantsBody company={company} />}
    </AuthGate>
  );
}

function GrantsBody({ company }: { company: CompanyProfile }) {
  const defaultKeyword = useMemo(() => buildKeywordFromProfile(company), [company]);
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [items, setItems] = useState<GrantItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (kw: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.grantsSearch({
        keyword: kw.trim() || undefined,
        limit: 50,
      });
      if (res.error) setError(res.error);
      const mapped: GrantItem[] = res.items.map((g) => ({
        id: String(g.id),
        title: g.title,
        agency: g.agency,
        cfda: g.cfda ?? null,
        response_deadline: g.response_deadline ?? null,
        posted_date: g.posted_date ?? null,
        url: g.url ?? null,
      }));
      // Nearest deadline first.
      mapped.sort((a, b) => {
        const ad = a.response_deadline ? new Date(a.response_deadline).getTime() : Infinity;
        const bd = b.response_deadline ? new Date(b.response_deadline).getTime() : Infinity;
        return ad - bd;
      });
      setItems(mapped);
      setTotal(res.total_records ?? mapped.length);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(defaultKeyword); }, [load, defaultKeyword]);

  return (
    <>
      <PageHeader eyebrow="Federal grants · Grants.gov" title="Grant Feed">
        {!supabaseEnabled && <Badge tone="brass">demo mode</Badge>}
      </PageHeader>

      <div className="p-4 sm:p-8">
        <div className="mb-5 flex items-center gap-3 flex-wrap">
          <form
            onSubmit={(e) => { e.preventDefault(); load(keyword); }}
            className="flex items-center gap-2 flex-1 min-w-[260px] max-w-xl">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Keywords (e.g. cybersecurity, AI, marketing)"
                className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-line rounded-sm focus:outline-none focus:border-ink"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ink text-paper rounded-sm hover:bg-navy disabled:opacity-40">
              <Search size={13} />
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          <Button onClick={() => load(keyword)} variant="ghost" className="ml-auto">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>

        <p className="text-xs font-mono text-ink-faint mb-5">
          Searching <span className="text-ink">grants.gov</span> · forecasted and posted opportunities.
          {total != null && !loading && <> · {items.length} of {total.toLocaleString()} results</>}
        </p>

        {error && (
          <div className="mb-4 text-sm bg-bad/5 border border-bad/30 text-bad font-mono rounded-sm p-3">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-ink-soft text-sm mb-2">
              <Loader2 className="animate-spin" size={14} /> Loading grants…
            </div>
            {[0, 1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <Notice title="No grants matched"
            body="Try a broader keyword (a single term tends to work better) or clear the search to see all active grants." />
        )}

        <ul className="space-y-3">
          {items.map((g, i) => {
            const dl = daysLeft(g.response_deadline);
            const urgent = dl != null && dl <= 14;
            const inner = (
              <div className="group flex items-center gap-3 sm:gap-5 bg-card border border-line rounded-sm px-4 sm:px-5 py-4 hover:border-ink/40 transition-colors shadow-card">
                <div className="w-12 h-12 rounded-sm bg-brass/10 text-brass flex items-center justify-center shrink-0">
                  <Coins size={18} strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge tone="brass">Grants.gov</Badge>
                    {g.cfda && <Badge tone="ink">CFDA {g.cfda}</Badge>}
                    {g.agency && <span className="text-xs text-ink-faint truncate">{g.agency}</span>}
                  </div>
                  <h3 className="font-display text-base sm:text-lg leading-snug truncate group-hover:text-navy">
                    {g.title}
                  </h3>
                  {g.posted_date && (
                    <p className="text-[11px] font-mono text-ink-faint mt-0.5">
                      Posted {fmtDate(g.posted_date)}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className={`flex items-center justify-end gap-1.5 text-sm font-mono tnum ${
                    urgent ? "text-bad" : "text-ink-soft"}`}>
                    <Clock size={13} />
                    {dl == null ? "—" : `${dl}d`}
                  </div>
                  <div className="text-[11px] text-ink-faint mt-0.5 hidden sm:block">
                    {fmtDate(g.response_deadline)}
                  </div>
                </div>
                <ArrowUpRight size={18}
                  className="text-ink-faint group-hover:text-ink transition-colors shrink-0 hidden sm:block" />
              </div>
            );
            return (
              <li key={g.id} className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}>
                {g.url ? <a href={g.url} target="_blank" rel="noreferrer">{inner}</a> : inner}
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}

function buildKeywordFromProfile(c: CompanyProfile): string {
  // Pull the most descriptive single word from the company description, or
  // fall back to the first enabled NAICS label.
  const desc = (c.description || "").trim();
  if (desc) {
    const firstSentence = desc.split(/[.!?]/)[0];
    const words = firstSentence
      .split(/[\s,;]+/)
      .filter((w) => w.length > 4 && !/^(and|the|with|that|this|from|services?)$/i.test(w));
    if (words[0]) return words[0];
  }
  const naicsLabel = c.naics.find((n) => n.on)?.label;
  if (naicsLabel) {
    return naicsLabel.split(/[\s,]/)[0];
  }
  return "";
}
