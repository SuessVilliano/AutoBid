"use client";
import {
  AlertTriangle, CheckCircle2, Circle, Download, FileSignature, Loader2,
  Lock, LockOpen, MinusCircle, Sparkles, Wand2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { api, COMPANY_ID } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type {
  ChecklistItem, ProposalSection, ReadyState, WorkspaceDetail,
} from "@/lib/types";

export default function WorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const [ws, setWs] = useState<WorkspaceDetail | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [sections, setSections] = useState<ProposalSection[]>([]);
  const [ready, setReady] = useState<ReadyState | null>(null);
  const [solicitation, setSolicitation] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const proposalId = ws?.proposals[0]?.id;

  async function refresh() {
    const w = await api.workspace(id); setWs(w);
    const c = await api.compliance(id); setItems(c.items);
    setReady(await api.ready(id));
    if (w.proposals[0]) setSections((await api.sections(w.proposals[0].id)).sections);
  }
  useEffect(() => { refresh().catch((e) => setErr(String(e))); }, [id]);

  async function extract() {
    if (!solicitation.trim()) return;
    setBusy("extract");
    try { await api.extractCompliance(id, solicitation, COMPANY_ID); await refresh(); }
    catch (e) { setErr(String(e)); } finally { setBusy(null); }
  }
  async function setStatus(item: ChecklistItem, status: ChecklistItem["status"]) {
    await api.setChecklistStatus(item.id, status);
    await refresh();
  }
  async function draft() {
    setBusy("draft");
    try { await api.draftProposal(id, COMPANY_ID, solicitation); await refresh(); }
    catch (e) { setErr(String(e)); } finally { setBusy(null); }
  }

  if (err) return <p className="p-8 text-bad font-mono text-sm">{err}</p>;
  if (!ws) return (
    <div className="p-8 flex items-center gap-2 text-ink-soft text-sm">
      <Loader2 className="animate-spin" size={16} /> Loading workspace…
    </div>
  );

  const w = ws.workspace;
  return (
    <>
      <PageHeader eyebrow={`Workspace · ${w.status}`} title={w.name}>
        <ExportButton workspaceId={id} proposalId={proposalId} ready={ready} />
      </PageHeader>

      {w.opportunity_id && (
        <div className="px-8 pt-4 text-sm text-ink-soft flex items-center gap-4">
          <Link href={`/opportunity/${w.opportunity_id}`} className="text-brass underline">
            ← {w.opportunity_title}
          </Link>
          <span className="font-mono text-xs text-ink-faint">
            Response due {fmtDate(w.response_deadline)}
          </span>
        </div>
      )}

      <div className="p-8 grid grid-cols-2 gap-6 items-start">
        {/* LEFT — compliance */}
        <div className="space-y-4">
          <SectionLabel n="1" title="Compliance matrix" />
          {items.length === 0 ? (
            <Card className="p-5 space-y-3">
              <p className="text-sm text-ink-soft">
                Paste the solicitation text (Sections L &amp; M especially). The
                compliance agent extracts every binding requirement and flags legal
                attestations as <strong>human-only</strong>.
              </p>
              <textarea value={solicitation} onChange={(e) => setSolicitation(e.target.value)}
                placeholder="Paste solicitation / RFP text…"
                className="w-full h-40 p-3 text-sm font-mono bg-paper border border-line rounded-sm resize-y focus:outline-none focus:border-ink" />
              <Button onClick={extract} disabled={busy === "extract" || !solicitation.trim()}>
                {busy === "extract" ? <Loader2 className="animate-spin" size={15} />
                  : <Wand2 size={15} />}
                Extract requirements
              </Button>
            </Card>
          ) : (
            <>
              {ready && <ReadyBanner ready={ready} />}
              <Card className="divide-y divide-line">
                {items.map((it) => (
                  <ChecklistRow key={it.id} item={it} onSet={setStatus} />
                ))}
              </Card>
            </>
          )}
        </div>

        {/* RIGHT — proposal */}
        <div className="space-y-4">
          <SectionLabel n="2" title="Proposal draft" />
          {!proposalId ? (
            <Card className="p-5 space-y-3">
              <p className="text-sm text-ink-soft">
                Generate section drafts from your <strong>approved</strong> vault language.
                Missing facts come back as <code className="text-bad">[NEEDS HUMAN INPUT]</code>.
                Pricing and certifications are never auto-filled.
              </p>
              <Button onClick={draft} disabled={busy === "draft"}>
                {busy === "draft" ? <Loader2 className="animate-spin" size={15} />
                  : <Sparkles size={15} />}
                Draft proposal
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {sections.map((s) => (
                <SectionEditor key={s.id} section={s} onSaved={refresh} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SectionLabel({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center w-6 h-6 rounded-full bg-ink text-paper font-mono text-xs">
        {n}
      </span>
      <h2 className="font-display text-xl">{title}</h2>
    </div>
  );
}

function ReadyBanner({ ready }: { ready: ReadyState }) {
  if (ready.ready)
    return (
      <div className="flex items-center gap-2 text-sm text-good bg-good/5 border border-good/30 rounded-sm px-3 py-2">
        <CheckCircle2 size={15} /> All requirements satisfied — ready for final approval &amp; export.
      </div>
    );
  return (
    <div className="flex items-center gap-2 text-sm text-warn bg-warn/5 border border-warn/30 rounded-sm px-3 py-2">
      <AlertTriangle size={15} />
      {ready.open_items} open · {ready.unsigned_attestations} unsigned attestation(s). Export is blocked.
    </div>
  );
}

function ChecklistRow({ item, onSet }:
  { item: ChecklistItem; onSet: (i: ChecklistItem, s: ChecklistItem["status"]) => void }) {
  const done = item.status === "satisfied";
  const waived = item.status === "waived";
  return (
    <div className="flex items-start gap-3 p-3.5">
      <button onClick={() => onSet(item, done ? "open" : "satisfied")} className="mt-0.5 shrink-0">
        {done ? <CheckCircle2 size={18} className="text-good" />
          : waived ? <MinusCircle size={18} className="text-ink-faint" />
            : <Circle size={18} className="text-ink-faint hover:text-ink" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug ${done || waived ? "text-ink-faint line-through" : "text-ink"}`}>
          {item.requirement}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {item.section_ref && <Badge>{item.section_ref}</Badge>}
          <Badge>{item.category}</Badge>
          {item.is_attestation && (
            <Badge tone="bad"><FileSignature size={10} /> Human sign-off</Badge>)}
        </div>
      </div>
      {!done && (
        <button onClick={() => onSet(item, "waived")}
          className="text-[11px] text-ink-faint hover:text-ink shrink-0 mt-0.5">
          waive
        </button>
      )}
    </div>
  );
}

function SectionEditor({ section, onSaved }:
  { section: ProposalSection; onSaved: () => void }) {
  const [text, setText] = useState(section.content_md || "");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const needsHuman = (section.content_md || "").includes("[NEEDS HUMAN INPUT");
  const title = section.section_type.replace(/_/g, " ");

  async function save(lock?: boolean) {
    setSaving(true);
    await api.saveSection(section.id, text, lock ?? section.is_locked);
    setSaving(false); onSaved();
  }

  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-paper/60">
        <span className="font-display text-base capitalize flex-1">{title}</span>
        {needsHuman && <Badge tone="warn"><AlertTriangle size={10} /> Needs input</Badge>}
        {section.is_locked
          ? <Lock size={14} className="text-good" />
          : <LockOpen size={14} className="text-ink-faint" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)}
            className="w-full h-56 p-3 text-sm font-mono bg-paper border border-line rounded-sm resize-y focus:outline-none focus:border-ink" />
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" size={14} /> : null} Save edit
            </Button>
            <Button variant={section.is_locked ? "ghost" : "solid"}
              onClick={() => save(!section.is_locked)} disabled={saving}>
              {section.is_locked ? <><LockOpen size={14} /> Unlock</> : <><Lock size={14} /> Approve &amp; lock</>}
            </Button>
            {section.is_ai_generated && (
              <span className="text-[11px] text-ink-faint ml-auto font-mono">AI draft · edit to claim</span>)}
          </div>
        </div>
      )}
    </Card>
  );
}

function ExportButton({ workspaceId, proposalId, ready }:
  { workspaceId: string; proposalId?: string; ready: ReadyState | null }) {
  const blocked = !proposalId || !ready?.ready;
  if (blocked)
    return (
      <Button variant="outline" disabled>
        <Download size={15} /> Export blocked
      </Button>
    );
  return (
    <a href={api.exportUrl(workspaceId, proposalId!)} target="_blank">
      <Button><Download size={15} /> Approve &amp; export PDF</Button>
    </a>
  );
}
