"use client";
import {
  ArrowUpRight, FileText, HardHat, Loader2, RefreshCw, ShieldCheck, Sparkles,
  Star, Workflow,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScoreDial } from "@/components/ScoreDial";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { OpportunityDetail } from "@/lib/types";

type SuggestedSub = {
  id: string; company: string; contact: string; capabilities: string[];
  certifications: string[]; naics: string[]; preferred: boolean;
};

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<OpportunityDetail | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [subs, setSubs] = useState<SuggestedSub[]>([]);

  const load = () =>
    api.opportunity(COMPANY_ID, id).then(setData).catch((e) => setErr(String(e)));

  useEffect(() => {
    load();
    api.summary(id).then((r) => setSummary(r.summary)).catch(() => {});
    fetch(`/api/opportunities/${id}/suggested-subs`)
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d) => setSubs(d.items || []))
      .catch(() => {});
  }, [id]);

  async function rescore() {
    setBusy("score");
    try { await api.score(COMPANY_ID, id); await load(); }
    catch (e) { setErr(String(e)); } finally { setBusy(null); }
  }

  async function startWorkspace() {
    setBusy("ws");
    try {
      const r = await api.createWorkspace(COMPANY_ID,
        { opportunity_id: id, name: data?.opportunity.title?.slice(0, 80) || "Bid" });
      router.push(`/workspace/${r.workspace_id}`);
    } catch (e) { setErr(String(e)); setBusy(null); }
  }

  if (err) return <p className="p-8 text-bad font-mono text-sm">{err}</p>;
  if (!data) return (
    <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
      <Loader2 className="animate-spin" size={16} /> Loading…
    </div>
  );

  const o = data.opportunity;
  const s = data.score;
  const existing = data.workspaces[0];

  return (
    <>
      <PageHeader eyebrow={`${o.source} · ${o.solicitation_no || o.id.slice(0, 8)}`}
        title={o.title}>
        {existing ? (
          <Link href={`/workspace/${existing.id}`}>
            <Button variant="solid"><Workflow size={15} /> Open workspace</Button>
          </Link>
        ) : (
          <Button onClick={startWorkspace} disabled={busy === "ws"}>
            {busy === "ws" ? <Loader2 className="animate-spin" size={15} />
              : <Workflow size={15} />}
            Start bid workspace
          </Button>
        )}
      </PageHeader>

      <div className="p-8 grid grid-cols-3 gap-6 items-start">
        {/* left: score */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-4 mb-5">
              <ScoreDial score={s?.total_score ?? null} size={76} />
              <div>
                <div className="font-display text-lg leading-none">Fit score</div>
                {s?.recommended && (
                  <Badge tone="good" className="mt-2"><ShieldCheck size={11} /> Recommended</Badge>)}
                {!s && <p className="text-xs text-ink-faint mt-1">Not scored yet</p>}
              </div>
              <Button variant="ghost" onClick={rescore} disabled={busy === "score"}
                className="ml-auto !px-2">
                <RefreshCw size={14} className={busy === "score" ? "animate-spin" : ""} />
              </Button>
            </div>
            {s?.subscores && <ScoreBreakdown subscores={s.subscores} />}
          </Card>

          <Card className="p-5">
            <h3 className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-3">
              Particulars
            </h3>
            <dl className="space-y-2 text-sm">
              <Row k="NAICS" v={o.naics} />
              <Row k="PSC" v={o.psc} />
              <Row k="Set-aside" v={o.set_aside} />
              <Row k="Place of perf." v={o.place_of_perf_state} />
              <Row k="Posted" v={fmtDate(o.posted_date)} />
              <Row k="Response due" v={fmtDate(o.response_deadline)} />
            </dl>
          </Card>
        </div>

        {/* right: summary, rationale, attachments */}
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="flex items-center gap-2 font-display text-lg mb-3">
              <Sparkles size={16} className="text-brass" /> AI summary
            </h3>
            <p className="text-[15px] leading-relaxed text-ink-soft">
              {summary || "Generating…"}
            </p>
            {s?.rationale && (
              <div className="mt-4 pt-4 border-t border-line">
                <h4 className="font-mono text-[11px] uppercase tracking-widest text-ink-faint mb-1.5">
                  Why this score
                </h4>
                <p className="text-sm leading-relaxed text-ink-soft">{s.rationale}</p>
              </div>
            )}
          </Card>

          {o.description && (
            <Card className="p-6">
              <h3 className="font-display text-lg mb-3">Description</h3>
              <p className="text-sm leading-relaxed text-ink-soft whitespace-pre-wrap">
                {o.description.startsWith("http")
                  ? <a className="text-brass underline" href={o.description} target="_blank">
                      View full description on source ↗</a>
                  : o.description}
              </p>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 font-display text-lg">
                <HardHat size={16} className="text-brass" /> Suggested subcontractors
              </h3>
              <Link href="/subcontractors"
                className="text-xs font-mono text-brass hover:text-ink">
                View Rolodex →
              </Link>
            </div>
            {subs.length === 0 ? (
              <p className="text-sm text-ink-faint">
                No matches in your Rolodex for NAICS {o.naics} / set-aside {o.set_aside || "—"}.
                {" "}
                <Link href="/subcontractors" className="text-brass underline">Add some partners</Link>.
              </p>
            ) : (
              <ul className="space-y-2">
                {subs.map((sub) => (
                  <li key={sub.id}
                    className="flex items-start justify-between gap-3 p-3 border border-line rounded-sm hover:bg-paper">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{sub.company}</span>
                        {sub.preferred && <Star size={12} className="text-brass fill-brass" />}
                      </div>
                      <div className="text-xs text-ink-faint mt-0.5">{sub.contact}</div>
                      <div className="text-xs text-ink-soft mt-1 line-clamp-1">
                        {sub.capabilities.join(" · ")}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {sub.certifications.slice(0, 2).map((c) => (
                        <span key={c}
                          className="text-[10px] font-mono px-1.5 py-0.5 border border-brass/40 text-brass bg-brass/5 rounded-sm uppercase tracking-wider">
                          {c}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="font-display text-lg mb-3">Attachments</h3>
            {o.resource_links && o.resource_links.length > 0 ? (
              <ul className="space-y-1.5">
                {o.resource_links.map((l, i) => (
                  <li key={i}>
                    <a href={typeof l === "string" ? l : l.url} target="_blank"
                      className="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
                      <FileText size={14} className="text-ink-faint" />
                      {typeof l === "string" ? `Document ${i + 1}` : (l.name || `Document ${i + 1}`)}
                      <ArrowUpRight size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-faint">No attachments listed on the notice.</p>}
            {o.url && (
              <a href={o.url} target="_blank"
                className="inline-flex items-center gap-1 mt-4 text-sm text-brass underline">
                Open on {o.source} ↗
              </a>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/60 pb-1.5">
      <dt className="text-ink-faint">{k}</dt>
      <dd className="font-mono text-ink text-right">{v || "—"}</dd>
    </div>
  );
}
