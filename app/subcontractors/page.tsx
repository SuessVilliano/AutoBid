"use client";
import {
  Award, Building2, CheckCircle2, ExternalLink, HardHat, Loader2, Mail,
  MapPin, Phone, Plus, Search, Star, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Button, Card } from "@/components/ui/primitives";

type Sub = {
  id: string;
  company: string;
  contact: string;
  email: string;
  phone: string;
  website: string;
  capabilities: string[];
  naics: string[];
  certifications: string[];
  regions: string[];
  past_projects: number;
  rate: string;
  status: "vetted" | "active" | "contacted";
  preferred: boolean;
  last_contacted: string;
  notes: string;
};

type ListResp = {
  items: Sub[];
  facets: { capabilities: string[]; certifications: string[]; naics: string[] };
  totals: { count: number; vetted: number; preferred: number };
};

export default function SubcontractorsPage() {
  const [data, setData] = useState<ListResp | null>(null);
  const [q, setQ] = useState("");
  const [naics, setNaics] = useState("");
  const [cert, setCert] = useState("");
  const [capability, setCapability] = useState("");
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [selected, setSelected] = useState<Sub | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    const u = new URL("/api/subcontractors", window.location.origin);
    if (q) u.searchParams.set("q", q);
    if (naics) u.searchParams.set("naics", naics);
    if (cert) u.searchParams.set("cert", cert);
    if (capability) u.searchParams.set("capability", capability);
    if (preferredOnly) u.searchParams.set("preferred", "true");
    fetch(u.toString()).then((r) => r.json()).then(setData);
  }
  useEffect(load, [q, naics, cert, capability, preferredOnly]);

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Subcontractors">
        <Button onClick={() => setShowAdd(true)}><Plus size={14} /> Add subcontractor</Button>
      </PageHeader>

      <div className="p-8 space-y-6">
        <p className="text-sm text-ink-soft -mt-2 max-w-2xl">
          Your Rolodex of vetted teaming partners. Tag by capability, NAICS, and
          certification so the right subs surface when you win a contract.
        </p>

        <div className="grid grid-cols-3 gap-4">
          <Totals label="Total partners" value={data?.totals.count ?? 0} />
          <Totals label="Vetted" value={data?.totals.vetted ?? 0} tone="good" />
          <Totals label="Preferred" value={data?.totals.preferred ?? 0} tone="brass" />
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-2.5 top-2.5 text-ink-faint" />
              <input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search by company, contact, or capability…"
                className="w-full bg-paper border border-line rounded-sm pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-ink" />
            </div>
            <select value={naics} onChange={(e) => setNaics(e.target.value)}
              className="bg-paper border border-line rounded-sm px-3 py-2 text-sm">
              <option value="">All NAICS</option>
              {data?.facets.naics.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={cert} onChange={(e) => setCert(e.target.value)}
              className="bg-paper border border-line rounded-sm px-3 py-2 text-sm">
              <option value="">All certifications</option>
              {data?.facets.certifications.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={capability} onChange={(e) => setCapability(e.target.value)}
              className="bg-paper border border-line rounded-sm px-3 py-2 text-sm">
              <option value="">All capabilities</option>
              {data?.facets.capabilities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={preferredOnly}
                onChange={(e) => setPreferredOnly(e.target.checked)} className="accent-ink" />
              Preferred only
            </label>
            {(q || naics || cert || capability || preferredOnly) && (
              <button
                onClick={() => { setQ(""); setNaics(""); setCert(""); setCapability(""); setPreferredOnly(false); }}
                className="text-xs font-mono text-ink-faint hover:text-ink uppercase tracking-wider"
              >
                Clear
              </button>
            )}
          </div>
        </Card>

        {!data ? (
          <div className="flex items-center gap-2 text-ink-soft text-sm">
            <Loader2 className="animate-spin" size={16} /> Loading partners…
          </div>
        ) : data.items.length === 0 ? (
          <Card className="p-12 text-center">
            <HardHat size={28} className="text-ink-faint mx-auto mb-3" />
            <h3 className="font-display text-lg">No partners match these filters.</h3>
            <p className="text-sm text-ink-soft mt-1">Clear the filters or add a new subcontractor.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {data.items.map((s) => (
              <button key={s.id} onClick={() => setSelected(s)}
                className="text-left bg-card border border-line rounded-sm p-5 hover:border-ink transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-base truncate">{s.company}</h3>
                      {s.preferred && <Star size={14} className="text-brass shrink-0 fill-brass" />}
                    </div>
                    <div className="text-xs text-ink-faint mt-0.5">{s.contact}</div>
                  </div>
                  <Badge tone={s.status === "vetted" ? "good" : "ink"}>{s.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {s.certifications.map((c) => (
                    <span key={c} className="text-[10px] font-mono px-1.5 py-0.5 border border-brass/40 text-brass bg-brass/5 rounded-sm uppercase tracking-wider">
                      {c}
                    </span>
                  ))}
                </div>
                <div className="text-xs text-ink-soft line-clamp-2 mb-3">
                  {s.capabilities.join(" · ")}
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-ink-faint">
                  <span className="flex items-center gap-1"><MapPin size={11} /> {s.regions[0]}</span>
                  <span>NAICS {s.naics.join(", ")}</span>
                  <span>{s.past_projects} projects</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <DetailDrawer sub={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddDrawer onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </>
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

function DetailDrawer({ sub, onClose }: { sub: Sub; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <div className="relative w-[480px] max-w-[95vw] bg-card border-l border-line h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 bg-card border-b border-line p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl truncate">{sub.company}</h2>
              {sub.preferred && <Star size={14} className="text-brass fill-brass" />}
            </div>
            <p className="text-sm text-ink-soft">{sub.contact}</p>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink p-1"><X size={16} /></button>
        </header>

        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Contact</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail size={14} className="text-ink-faint" />
                <a href={`mailto:${sub.email}`} className="hover:text-navy">{sub.email}</a></li>
              <li className="flex items-center gap-2"><Phone size={14} className="text-ink-faint" /> {sub.phone}</li>
              <li className="flex items-center gap-2"><ExternalLink size={14} className="text-ink-faint" />
                <a href={sub.website} target="_blank" rel="noreferrer" className="hover:text-navy">{sub.website}</a></li>
            </ul>
          </section>

          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Capabilities</h3>
            <div className="flex flex-wrap gap-1.5">
              {sub.capabilities.map((c) => (
                <span key={c} className="text-xs px-2 py-1 bg-paper border border-line rounded-sm">{c}</span>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Certifications</h3>
            <div className="flex flex-wrap gap-1.5">
              {sub.certifications.map((c) => <Badge key={c} tone="brass">{c}</Badge>)}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">NAICS</div>
              <div className="text-sm font-mono tnum">{sub.naics.join(", ")}</div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">Regions</div>
              <div className="text-sm">{sub.regions.join(", ")}</div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">Past projects</div>
              <div className="text-sm font-mono tnum">{sub.past_projects}</div>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-1">Rate</div>
              <div className="text-sm">{sub.rate}</div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-widest text-ink-faint mb-2">Notes</h3>
            <p className="text-sm text-ink-soft leading-relaxed">{sub.notes}</p>
            <div className="text-[11px] font-mono text-ink-faint mt-2">
              Last contacted: {sub.last_contacted}
            </div>
          </section>

          <div className="pt-3 border-t border-line flex gap-2">
            <Button>Email {sub.contact.split(" ")[0]}</Button>
            <Button variant="outline">Assign to bid</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    company: "", contact: "", email: "", phone: "", website: "",
    capabilities: "", naics: "", certifications: "", regions: "",
    rate: "", notes: "", preferred: false,
  });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const valid = form.company.trim() && form.contact.trim() && form.email.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const res = await fetch("/api/subcontractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capabilities: splitCsv(form.capabilities),
          naics: splitCsv(form.naics),
          certifications: splitCsv(form.certifications),
          regions: splitCsv(form.regions),
        }),
      });
      const data = await res.json();
      setResult(data.message);
      setTimeout(() => { setSaving(false); onSaved(); }, 800);
    } catch {
      setSaving(false);
    }
  }

  function up<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <form onSubmit={submit}
        className="relative w-[520px] max-w-[95vw] bg-card border-l border-line h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <header className="sticky top-0 bg-card border-b border-line p-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl">Add subcontractor</h2>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink p-1"><X size={16} /></button>
        </header>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company *"><Input value={form.company} onChange={(v) => up("company", v)} /></Field>
            <Field label="Primary contact *"><Input value={form.contact} onChange={(v) => up("contact", v)} /></Field>
            <Field label="Email *"><Input value={form.email} onChange={(v) => up("email", v)} type="email" /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(v) => up("phone", v)} /></Field>
            <Field label="Website" colSpan={2}><Input value={form.website} onChange={(v) => up("website", v)} placeholder="https://…" /></Field>
          </div>
          <Field label="Capabilities (comma-separated)">
            <Input value={form.capabilities} onChange={(v) => up("capabilities", v)}
              placeholder="cybersecurity, penetration testing, CMMC L2 assessment" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="NAICS codes (comma-separated)">
              <Input value={form.naics} onChange={(v) => up("naics", v)} placeholder="541512, 541519" />
            </Field>
            <Field label="Certifications (comma-separated)">
              <Input value={form.certifications} onChange={(v) => up("certifications", v)} placeholder="SDVOSB, 8(a), CMMC L2" />
            </Field>
          </div>
          <Field label="Regions served (comma-separated)">
            <Input value={form.regions} onChange={(v) => up("regions", v)} placeholder="VA, DC, MD, nationwide" />
          </Field>
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
              {saving ? "Saving…" : "Save to Rolodex"}
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
