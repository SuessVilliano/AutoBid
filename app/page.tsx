"use client";
import { CalendarClock, Inbox, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Notice } from "@/components/PageHeader";
import { ScoreDial } from "@/components/ScoreDial";
import { Card } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { daysLeft, fmtDate } from "@/lib/format";
import type { FeedItem } from "@/lib/types";

export default function Dashboard() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!COMPANY_ID) { setLoading(false); return; }
    api.feed(COMPANY_ID, 0).then((r) => setItems(r.items)).finally(() => setLoading(false));
  }, []);

  if (!COMPANY_ID)
    return (
      <>
        <PageHeader eyebrow="Capture desk" title="Dashboard" />
        <Notice title="Connect your company"
          body="Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_COMPANY_ID in apps/web/.env.local, run the backend, and your pipeline will appear here." />
      </>
    );

  const recommended = items.filter((i) => i.recommended).length;
  const dueSoon = items
    .filter((i) => { const d = daysLeft(i.response_deadline); return d != null && d >= 0 && d <= 7; })
    .sort((a, b) => (daysLeft(a.response_deadline)! - daysLeft(b.response_deadline)!));
  const top = [...items]
    .filter((i) => i.total_score != null)
    .sort((a, b) => (b.total_score! - a.total_score!)).slice(0, 5);

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Dashboard" />
      {loading ? (
        <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
          <Loader2 className="animate-spin" size={16} /> Loading pipeline…
        </div>
      ) : (
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-3 gap-5">
            <Stat icon={<Inbox size={18} />} label="Tracked opportunities" value={items.length} />
            <Stat icon={<ShieldCheck size={18} />} label="Recommended to bid" value={recommended} tone="good" />
            <Stat icon={<CalendarClock size={18} />} label="Closing within 7 days" value={dueSoon.length} tone="warn" />
          </div>

          <div className="grid grid-cols-2 gap-6 items-start">
            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-display text-lg mb-4">
                <CalendarClock size={16} className="text-brass" /> Deadlines this week
              </h3>
              {dueSoon.length === 0 ? (
                <p className="text-sm text-ink-faint">Nothing closing in the next 7 days.</p>
              ) : (
                <ul className="space-y-2">
                  {dueSoon.map((o) => (
                    <li key={o.id}>
                      <Link href={`/opportunity/${o.id}`}
                        className="flex items-center gap-3 text-sm hover:text-navy">
                        <span className="font-mono tnum text-bad w-10">
                          {daysLeft(o.response_deadline)}d
                        </span>
                        <span className="truncate flex-1">{o.title}</span>
                        <span className="text-ink-faint text-xs">{fmtDate(o.response_deadline)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="flex items-center gap-2 font-display text-lg mb-4">
                <TrendingUp size={16} className="text-brass" /> Highest-fit opportunities
              </h3>
              <ul className="space-y-3">
                {top.map((o) => (
                  <li key={o.id}>
                    <Link href={`/opportunity/${o.id}`} className="flex items-center gap-3 group">
                      <ScoreDial score={o.total_score} size={40} />
                      <span className="text-sm truncate group-hover:text-navy">{o.title}</span>
                    </Link>
                  </li>
                ))}
                {top.length === 0 && <p className="text-sm text-ink-faint">No scored opportunities yet.</p>}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ icon, label, value, tone = "ink" }:
  { icon: React.ReactNode; label: string; value: number; tone?: "ink" | "good" | "warn" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <Card className="p-5">
      <div className={`flex items-center gap-2 ${color} mb-3`}>{icon}
        <span className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">{label}</span>
      </div>
      <div className={`font-display text-4xl tnum ${color}`}>{value}</div>
    </Card>
  );
}
