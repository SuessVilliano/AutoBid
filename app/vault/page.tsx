"use client";

import {
  CheckCircle2, FileText, Loader2, Plus, ShieldCheck, Sparkles, Trash2,
  Upload, Vault, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AuthGate } from "@/components/AuthGate";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { CompanyProfile } from "@/lib/companyProfile";
import {
  DOC_KINDS, docsForKind, fileToBase64, genId, loadDocs, removeDoc,
  upsertDoc, type VaultDoc,
} from "@/lib/vault";

export default function VaultPage() {
  return (
    <AuthGate>
      {({ company }) => <VaultBody company={company} />}
    </AuthGate>
  );
}

function VaultBody({ company }: { company: CompanyProfile }) {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [openKind, setOpenKind] = useState<string | null>(null);

  useEffect(() => { setDocs(loadDocs()); }, []);

  function refresh() { setDocs(loadDocs()); }

  return (
    <>
      <PageHeader eyebrow="Knowledge base" title="Company Vault">
        <Badge tone="brass"><ShieldCheck size={11} /> Approved language only</Badge>
      </PageHeader>

      <div className="p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <Card className="lg:col-span-2 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg mb-4">
            <Vault size={16} className="text-brass" /> Document vault
          </h3>
          <p className="text-sm text-ink-soft mb-5 leading-relaxed">
            Upload reusable materials or have Claude draft them from your company
            profile. Mark <strong>approved</strong> when ready — drafts can only
            quote approved blurbs.
          </p>
          <ul className="space-y-2">
            {DOC_KINDS.map((kind) => {
              const inKind = docs.filter((d) => d.kind === kind);
              const approved = inKind.filter((d) => d.status === "approved").length;
              return (
                <li key={kind}>
                  <button
                    onClick={() => setOpenKind(kind)}
                    className="w-full flex items-center gap-3 border border-line rounded-sm px-4 py-3 bg-paper hover:border-ink/40 transition-colors text-left">
                    <FileText size={16} className="text-ink-faint shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{kind}</div>
                      <div className="text-[11px] font-mono text-ink-faint mt-0.5">
                        {inKind.length === 0
                          ? "empty"
                          : `${inKind.length} doc${inKind.length === 1 ? "" : "s"} · ${approved} approved`}
                      </div>
                    </div>
                    {inKind.length > 0 && approved > 0 && (
                      <Badge tone="good"><CheckCircle2 size={10} /> approved</Badge>
                    )}
                    <Plus size={14} className="text-ink-faint" />
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-ink-faint mt-5 font-mono">
            Files persist in your browser. Wire Supabase Storage + pgvector for
            production retrieval.
          </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <h3 className="font-display text-lg mb-4">Capability profile</h3>
          <dl className="space-y-2.5 text-sm">
            <Row k="Company" v={company.name} />
            <Row k="NAICS codes (enabled)" v={`${company.naics.filter((n) => n.on).length} of ${company.naics.length}`} />
            <Row k="Websites" v={company.websites.length ? company.websites.length.toString() : "—"} />
            <Row k="Value band" v={`$${(company.minValue / 1000).toFixed(0)}K – $${(company.maxValue / 1_000_000).toFixed(1)}M`} />
            <Row k="Approved blurbs" v={docs.filter((d) => d.status === "approved").length.toString()} />
          </dl>
          <p className="text-xs text-ink-faint mt-4 font-mono">
            Edit in <a href="/settings" className="text-brass hover:text-ink">Settings → General</a>.
          </p>
        </Card>
      </div>

      {openKind && (
        <KindModal kind={openKind} company={company}
          onClose={() => setOpenKind(null)}
          onChanged={refresh} />
      )}
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 pb-2 gap-2">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="text-xs text-ink-faint font-mono text-right">{v}</dd>
    </div>
  );
}

function KindModal({ kind, company, onClose, onChanged }: {
  kind: string; company: CompanyProfile; onClose: () => void; onChanged: () => void;
}) {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"list" | "generate" | "upload">("list");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const list = docsForKind(kind);
    setDocs(list);
    setActiveId(list[0]?.id ?? null);
  }, [kind]);

  function refresh() {
    const list = docsForKind(kind);
    setDocs(list);
    onChanged();
  }

  async function handleUpload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const base64 = await fileToBase64(file);
      const doc: VaultDoc = {
        id: genId(),
        kind,
        title: file.name,
        source: "uploaded",
        status: "draft",
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileBase64: base64,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      upsertDoc(doc);
      refresh();
      setActiveId(doc.id);
      setMode("list");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.generateDoc({ kind, profile: company });
      const doc: VaultDoc = {
        id: genId(),
        kind,
        title: `${kind} (AI draft)`,
        source: "generated",
        status: "draft",
        markdown: res.markdown,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      upsertDoc(doc);
      refresh();
      setActiveId(doc.id);
      setMode("list");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }

  function updateDoc(id: string, patch: Partial<VaultDoc>) {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    upsertDoc({ ...d, ...patch, updatedAt: Date.now() });
    refresh();
  }

  function deleteDoc(id: string) {
    removeDoc(id);
    refresh();
    if (activeId === id) setActiveId(null);
  }

  const active = useMemo(() => docs.find((d) => d.id === activeId) ?? null, [docs, activeId]);

  return (
    <div className="fixed inset-0 z-50 scrim flex items-end sm:items-center justify-center p-2 sm:p-6 animate-fade-in"
      onClick={onClose}>
      <div className="bg-card border border-line rounded-sm w-full max-w-4xl h-[92vh] sm:h-[80vh] flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}>

        <div className="flex items-start justify-between p-5 border-b border-line gap-3">
          <div className="min-w-0">
            <h3 className="font-display text-lg truncate">{kind}</h3>
            <p className="text-xs text-ink-faint mt-1">
              {docs.length} doc{docs.length === 1 ? "" : "s"} in this section
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-sm hover:bg-paper flex items-center justify-center shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-b border-line bg-paper/50 flex-wrap">
          <Button onClick={() => setMode("generate")} variant="outline">
            <Sparkles size={14} className="text-brass" /> AI draft
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt,.md"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-ink text-ink hover:bg-ink hover:text-paper rounded-sm cursor-pointer">
              <Upload size={14} /> Upload file
            </span>
          </label>
        </div>

        {mode === "generate" && !busy && (
          <div className="p-5 border-b border-line bg-brass/5">
            <p className="text-sm mb-3">
              Claude will draft this document from your <a href="/settings" className="text-brass underline">company profile</a>. You'll edit + approve before it's used.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleGenerate}>
                <Sparkles size={14} /> Generate now
              </Button>
              <button onClick={() => setMode("list")}
                className="px-4 py-2 text-sm text-ink-soft hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="px-5 py-3 border-b border-line bg-brass/5 flex items-center gap-2 text-sm">
            <Loader2 className="animate-spin text-brass" size={14} />
            Working…
          </div>
        )}
        {error && (
          <div className="px-5 py-3 border-b border-line bg-bad/5 text-bad text-sm font-mono">
            {error}
          </div>
        )}

        <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
          <div className="sm:w-64 border-b sm:border-b-0 sm:border-r border-line overflow-y-auto sm:max-h-full max-h-40 shrink-0">
            {docs.length === 0 ? (
              <div className="p-5 text-sm text-ink-faint">
                No documents yet. Upload a file or have AI draft one.
              </div>
            ) : (
              <ul>
                {docs.map((d) => (
                  <li key={d.id}>
                    <button onClick={() => setActiveId(d.id)}
                      className={`w-full text-left px-4 py-3 border-b border-line/60 hover:bg-paper ${
                        d.id === activeId ? "bg-paper" : ""
                      }`}>
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-ink-faint shrink-0" />
                        <span className="text-sm truncate flex-1">{d.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone={d.source === "generated" ? "brass" : "ink"}>
                          {d.source}
                        </Badge>
                        <Badge tone={d.status === "approved" ? "good" : "ink"}>
                          {d.status}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {!active && (
              <div className="text-sm text-ink-faint">
                Pick a document on the left, or use the actions above.
              </div>
            )}
            {active && (
              <DocEditor doc={active}
                onChange={(patch) => updateDoc(active.id, patch)}
                onDelete={() => deleteDoc(active.id)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DocEditor({ doc, onChange, onDelete }:
  { doc: VaultDoc; onChange: (p: Partial<VaultDoc>) => void; onDelete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={doc.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="flex-1 min-w-[200px] bg-transparent border-b border-line py-1 text-lg font-display focus:outline-none focus:border-ink" />
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox"
            checked={doc.status === "approved"}
            onChange={(e) => onChange({ status: e.target.checked ? "approved" : "draft" })}
            className="accent-ink" />
          Approved for reuse
        </label>
        <button onClick={onDelete}
          aria-label="Delete document"
          className="text-ink-faint hover:text-bad p-1.5 rounded-sm hover:bg-paper">
          <Trash2 size={15} />
        </button>
      </div>

      {doc.source === "uploaded" ? (
        <div className="border border-line rounded-sm p-4 bg-paper">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={14} className="text-brass" />
            <span className="text-sm font-medium">{doc.fileName}</span>
            <Badge tone="ink">{(doc.fileSize ?? 0) > 1024 * 1024
              ? `${((doc.fileSize ?? 0) / 1024 / 1024).toFixed(1)} MB`
              : `${Math.round((doc.fileSize ?? 0) / 1024)} KB`}
            </Badge>
          </div>
          <p className="text-xs text-ink-faint">
            File stored in your browser (base64). Wire Supabase Storage to persist
            across devices.
          </p>
          {doc.fileBase64 && doc.fileType?.startsWith("application/pdf") && (
            <a
              href={`data:${doc.fileType};base64,${doc.fileBase64}`}
              download={doc.fileName}
              className="inline-block mt-3 text-xs font-mono text-brass hover:text-ink">
              Download
            </a>
          )}
        </div>
      ) : (
        <textarea
          value={doc.markdown ?? ""}
          onChange={(e) => onChange({ markdown: e.target.value })}
          rows={20}
          className="w-full bg-paper border border-line rounded-sm p-4 text-sm font-mono leading-relaxed focus:outline-none focus:border-ink resize-y" />
      )}

      <div className="text-[11px] font-mono text-ink-faint">
        Created {new Date(doc.createdAt).toLocaleString()} ·
        Updated {new Date(doc.updatedAt).toLocaleString()}
      </div>
    </div>
  );
}
