"use client";

import {
  CheckCircle2, ExternalLink, HardHat, Loader2, Mail, MapPin, Phone,
  Plus, Search, Star, Trash2, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonCard } from "@/components/Skeleton";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { CompanyProfile } from "@/lib/companyProfile";
import {
  createSubcontractor, deleteSubcontractor, listSubcontractors, updateSubcontractor,
} from "@/lib/data";
import {
  CERTIFICATIONS, STATUS_TONE, type Subcontractor, type SubcontractorStatus,
} from "@/lib/subcontractors";

export default function SubcontractorsPage() {
  return (
    <AuthGate>
      {({ company }) => <SubsBody company={company} />}
    </AuthGate>
  );
}

function SubsBody({ company }: { company: CompanyProfile }) {
  const [subs, setSubs] = useState<Subcontractor[] | null>(null);
  const [q, setQ] = useState("");
  const [naicsFilter, setNaicsFilter] = useState("");
  const [certFilter, setCertFilter] = useState("");
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [selected, setSelected] = useState<Subcontractor | null>(null);
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [adding, setAdding] = useState(false);

  async function reload() {
    setSubs(await listSubcontractors(company.id));
  }
  useEffect(() => { reload(); }, [company.id]);

  const facets = useMemo(() => {
    if (!subs) return { naics: [], certs: [], capabilities: [] };
    return {
      naics: Array.from(new Set(subs.flatMap((s) => s.naics))).sort(),
      certs: Array.from(new Set(subs.flatMap((s) => s.certifications))).sort(),
      capabilities: Array.from(new Set(subs.flatMap((s) => s.capabilities))).sort(),
    };
  }, [subs]);

  const filtered = useMemo(() => {
    if (!subs) return [];
    return subs.filter((s) => {
      if (preferredOnly && !s.preferred) return false;
      if (naicsFilter && !s.naics.includes(naicsFilter)) return false;
      if (certFilter && !s.certifications.includes(certFilter)) return false;
      if (q) {
        const ql = q.toLowerCase();
        const hay = [s.name, s.contactName, ...s.capabilities].join(" ").toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [subs, q, naicsFilter, certFilter, preferredOnly]);

  const totals = {
    count: subs?.length ?? 0,
    vetted: subs?.filter((s) => s.status === "vetted").length ?? 0,
    preferred: subs?.filter((s) => s.preferred).length ?? 0,
  };

  async function togglePreferred(s: Subcontractor) {
    await updateSubcontractor(company.id, s.id, { preferred: !s.preferred });
    reload();
  }

  async function handleDelete(id: string) {
    await deleteSubcontractor(company.id, id);
    setSelected(null);
    reload();
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <PageHeader eyebrow={`${company.name} · Capture desk`} title="Subcontractors">
        <Button onClick={() => setAdding(true)}><Plus size={14} /> Add subcontractor</Button>
      </PageHeader>

      <p className="text-sm text-ink-soft max-w-2xl">
        Your Rolodex of vetted teaming partners. Tag by capability, NAICS, and
        certification so the right subs surface when you win a contract.
      </p>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Totals label="Total partners" value={totals.count} />
        <Totals label="Vetted" value={totals.vetted} tone="good" />
        <Totals label="Preferred" value={totals.preferred} tone="brass" />
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-2.5 top-2.5 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search by company, contact, capability…"
              className="w-full bg-paper border border-line rounded-sm pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </div>
          <select value={naicsFilter} onChange={(e) => setNaicsFilter(e.target.value)}
            className="bg-paper border border-line rounded-sm px-3 py-2 text-sm">
            <option value="">All NAICS</option>
            {facets.naics.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={certFilter} onChange={(e) => setCertFilter(e.target.value)}
            className="bg-paper border border-line rounded-sm px-3 py-2 text-sm">
            <option value="">All certifications</option>
            {facets.certs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={preferredOnly}
              onChange={(e) => setPreferredOnly(e.target.checked)} className="accent-ink" />
            Preferred only
          </label>
          {(q || naicsFilter || certFilter || preferredOnly) && (
            <button
              onClick={() => { setQ(""); setNaicsFilter(""); setCertFilter(""); setPreferredOnly(false); }}
              className="text-xs font-mono text-ink-faint hover:text-ink uppercase tracking-wider"
            >
              Clear
            </button>
          )}
        </div>
      </Card>

      {subs === null ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <HardHat size={28} className="text-ink-faint mx-auto mb-3" />
          <h3 className="font-display text-lg">
            {subs.length === 0 ? "Your Rolodex is empty" : "No partners match these filters"}
          </h3>
          <p className="text-sm text-ink-soft mt-1">
            {subs.length === 0
              ? "Add subcontractors so they're ready when you win a contract."
              : "Clear the filters or add a new subcontractor."}
          </p>
          <Button className="mt-4" onClick={() => setAdding(true)}>
            <Plus size={14} /> Add subcontractor
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <button key={s.id} onClick={() => setSelected(s)}
              className="text-left bg-card border border-line rounded-sm p-5 hover:border-ink transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-base truncate">{s.name}</h3>
                    {s.preferred && <Star size={14} className="text-brass shrink-0 fill-brass" />}
                  </div>
                  <div className="text-xs text-ink-faint mt-0.5">{s.contactName}</div>
                </div>
                <Badge tone={STATUS_TONE[s.status]}>{s.status}</Badge>
              </div>
              {s.certifications.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.certifications.map((c) => (
                    <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 border border-brass/40 text-brass bg-brass/5 rounded-sm uppercase tracking-wider">
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs text-ink-soft line-clamp-2 mb-3 min-h-[2.4em]">
                {s.capabilities.length > 0 ? s.capabilities.join(" · ") : "No capabilities listed"}
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint gap-2">
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={11} /> {s.regions[0] || "—"}
                </span>
                <span className="truncate">NAICS {s.naics.join(", ") || "—"}</span>
                {s.pastProjects != null && <span className="shrink-0">{s.pastProjects} projects</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <DetailDrawer
          sub={selected}
          onClose={() => setSelected(null)}
          onTogglePreferred={() => togglePreferred(selected)}
          onEdit={() => { setEditing(selected); setSelected(null); }}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {(adding || editing) && (
        <FormDrawer
          existing={editing}
          onClose={() => { setAdding(false); setEditing(null); }}
          onSaved={() => { setAdding(false); setEditing(null); reload(); }}
          companyId={company.id}
        />
      )}
    </div>
  );
}

function Totals({ label, value, tone = "ink" }:
  { label: string; value: number; tone?: "ink" | "good" | "brass" }) {
  const accent = tone === "good" ? "text-good" : tone === "brass" ? "text-brass" : "text-ink";
  return (
    <Card className="p-4">
      <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint">{label}</div>
      <div className={`font-display text-3xl tnum mt-1 ${accent}`}>{value}</div>
    </Card>
  );
}

function DetailDrawer({ sub, onClose, onTogglePreferred, onEdit, onDelete }:
  { sub: Subcontractor; onClose: () => void; onTogglePreferred: () => void;
    onEdit: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <div className="relative w-full sm:w-[480px] max-w-full bg-card border-l border-line h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 bg-card border-b border-line p-5 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl truncate">{sub.name}</h2>
              <button onClick={onTogglePreferred} aria-label="Toggle preferred"
                className="text-brass hover:scale-110 transition">
                <Star size={16} className={sub.preferred ? "fill-brass" : ""} />
              </button>
            </div>
            <p className="text-sm text-ink-soft">{sub.contactName}</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink p-1"><X size={16} /></button>
        </header>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail size={14} className="text-ink-faint" />
                <a href={`mailto:${sub.email}`} className="hover:text-navy">{sub.email}</a></li>
              {sub.phone && (
                <li className="flex items-center gap-2"><Phone size={14} className="text-ink-faint" /> {sub.phone}</li>
              )}
              {sub.website && (
                <li className="flex items-center gap-2"><ExternalLink size={14} className="text-ink-faint" />
                  <a href={sub.website} target="_blank" rel="noreferrer" className="hover:text-navy break-all">{sub.website}</a></li>
              )}
            </ul>
          </section>

          {sub.capabilities.length > 0 && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Capabilities</h3>
              <div className="flex flex-wrap gap-1.5">
                {sub.capabilities.map((c) => (
                  <span key={c} className="text-xs px-2 py-1 bg-paper border border-line rounded-sm">{c}</span>
                ))}
              </div>
            </section>
          )}

          {sub.certifications.length > 0 && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Certifications</h3>
              <div className="flex flex-wrap gap-1.5">
                {sub.certifications.map((c) => <Badge key={c} tone="brass">{c}</Badge>)}
              </div>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4">
            <Meta label="NAICS" value={sub.naics.join(", ") || "—"} mono />
            <Meta label="Regions" value={sub.regions.join(", ") || "—"} />
            {sub.pastProjects != null && <Meta label="Past projects" value={String(sub.pastProjects)} mono />}
            {sub.rate && <Meta label="Rate" value={sub.rate} />}
            <Meta label="Status" value={sub.status} />
            {sub.lastContacted && (
              <Meta label="Last contacted" value={new Date(sub.lastContacted).toLocaleDateString()} />
            )}
          </section>

          {sub.notes && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Notes</h3>
              <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">{sub.notes}</p>
            </section>
          )}

          <div className="pt-3 border-t border-line flex flex-wrap gap-2 items-center">
            <Button onClick={onEdit}>Edit</Button>
            <a href={`mailto:${sub.email}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm border border-ink text-ink hover:bg-ink hover:text-paper">
              Email {sub.contactName.split(" ")[0]}
            </a>
            {confirmDel ? (
              <>
                <button onClick={onDelete}
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm bg-bad text-paper rounded-sm">
                  <Trash2 size={14} /> Confirm delete
                </button>
                <button onClick={() => setConfirmDel(false)} className="text-sm text-ink-soft hover:text-ink">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setConfirmDel(true)}
                className="ml-auto text-sm text-bad hover:text-ink inline-flex items-center gap-1.5">
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">{label}</div>
      <div className={`text-sm ${mono ? "font-mono tnum" : ""}`}>{value}</div>
    </div>
  );
}

function FormDrawer({ existing, companyId, onClose, onSaved }:
  { existing: Subcontractor | null; companyId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    contactName: existing?.contactName ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    website: existing?.website ?? "",
    capabilities: existing?.capabilities.join(", ") ?? "",
    naics: existing?.naics.join(", ") ?? "",
    certifications: existing?.certifications ?? [],
    regions: existing?.regions.join(", ") ?? "",
    pastProjects: existing?.pastProjects?.toString() ?? "",
    rate: existing?.rate ?? "",
    notes: existing?.notes ?? "",
    status: existing?.status ?? "active" as SubcontractorStatus,
    preferred: existing?.preferred ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const valid = form.name.trim() && form.contactName.trim() && form.email.trim();

  function up<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleCert(cert: string) {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(cert)
        ? f.certifications.filter((c) => c !== cert)
        : [...f.certifications, cert],
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        website: form.website.trim() || undefined,
        capabilities: splitCsv(form.capabilities),
        naics: splitCsv(form.naics),
        certifications: form.certifications,
        regions: splitCsv(form.regions),
        pastProjects: form.pastProjects ? Number(form.pastProjects) : undefined,
        rate: form.rate.trim() || undefined,
        notes: form.notes.trim() || undefined,
        status: form.status,
        preferred: form.preferred,
      };
      if (existing) {
        await updateSubcontractor(companyId, existing.id, payload);
        setResult("Saved.");
      } else {
        await createSubcontractor(companyId, payload);
        setResult(`${payload.name} added to your Rolodex.`);
      }
      setTimeout(onSaved, 600);
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <form onSubmit={submit}
        className="relative w-full sm:w-[520px] max-w-full bg-card border-l border-line h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 bg-card border-b border-line p-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">{existing ? "Edit subcontractor" : "Add subcontractor"}</h2>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink p-1"><X size={16} /></button>
        </header>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company *"><Input value={form.name} onChange={(v) => up("name", v)} /></Field>
            <Field label="Primary contact *"><Input value={form.contactName} onChange={(v) => up("contactName", v)} /></Field>
            <Field label="Email *"><Input value={form.email} onChange={(v) => up("email", v)} type="email" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(v) => up("phone", v)} /></Field>
            <Field label="Website" colSpan={2}><Input value={form.website} onChange={(v) => up("website", v)} placeholder="https://…" /></Field>
          </div>
          <Field label="Capabilities (comma-separated)">
            <Input value={form.capabilities} onChange={(v) => up("capabilities", v)}
              placeholder="cybersecurity, penetration testing, CMMC L2 assessment" />
          </Field>
          <Field label="NAICS codes (comma-separated)">
            <Input value={form.naics} onChange={(v) => up("naics", v)} placeholder="541512, 541519" />
          </Field>
          <Field label="Certifications">
            <div className="flex flex-wrap gap-1.5">
              {CERTIFICATIONS.map((c) => {
                const on = form.certifications.includes(c);
                return (
                  <button type="button" key={c} onClick={() => toggleCert(c)}
                    className={`text-[11px] font-mono uppercase tracking-wider px-2 py-1 rounded-sm border transition-colors ${
                      on
                        ? "border-brass bg-brass/10 text-brass"
                        : "border-line text-ink-soft hover:border-brass/40"
                    }`}>
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Regions served (comma-separated)">
            <Input value={form.regions} onChange={(v) => up("regions", v)} placeholder="VA, DC, MD, nationwide" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Past projects (count)">
              <Input value={form.pastProjects} onChange={(v) => up("pastProjects", v)} type="number" />
            </Field>
            <Field label="Status">
              <select value={form.status}
                onChange={(e) => up("status", e.target.value as SubcontractorStatus)}
                className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink">
                <option value="active">active</option>
                <option value="vetted">vetted</option>
                <option value="contacted">contacted</option>
                <option value="inactive">inactive</option>
              </select>
            </Field>
          </div>
          <Field label="Typical rate / pricing">
            <Input value={form.rate} onChange={(v) => up("rate", v)} placeholder="$185/hr blended, or fixed-price" />
          </Field>
          <Field label="Notes">
            <textarea rows={3} value={form.notes} onChange={(e) => up("notes", e.target.value)}
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.preferred}
              onChange={(e) => up("preferred", e.target.checked)} className="accent-ink" />
            Mark as preferred partner
          </label>

          {result && (
            <div className="flex items-center gap-2 bg-good/5 border border-good/40 rounded-sm p-3 text-sm">
              <CheckCircle2 size={16} className="text-good" /> {result}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-line">
            <button type="button" onClick={onClose}
              className="text-sm text-ink-soft hover:text-ink px-3 py-2">Cancel</button>
            <Button disabled={!valid || saving}>
              {saving ? <Loader2 className="animate-spin" size={14} /> : null}
              {saving ? "Saving…" : existing ? "Save changes" : "Save to Rolodex"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, colSpan = 1 }:
  { label: string; children: React.ReactNode; colSpan?: number }) {
  return (
    <label className={`block ${colSpan === 2 ? "col-span-2" : ""}`}>
      <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Input({ value, onChange, type = "text", placeholder }:
  { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
  );
}

function splitCsv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
