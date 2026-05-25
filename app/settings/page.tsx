"use client";
import {
  Bell, Bot, Globe, KeyRound, Loader2, Plug, Plus, Save,
  ShieldAlert, ShieldCheck, Sliders, Sparkles, Trash2, User as UserIcon,
  Webhook, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { AuthGate } from "@/components/AuthGate";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { updateCompany, type AppUser } from "@/lib/data";
import type { CompanyProfile, NaicsCode } from "@/lib/companyProfile";

type TabKey = "general" | "agents" | "notifications" | "integrations" | "security" | "api";

const TABS: { key: TabKey; label: string; icon: typeof UserIcon }[] = [
  { key: "general", label: "General", icon: Sliders },
  { key: "agents", label: "AI Agents", icon: Bot },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "api", label: "API & Webhooks", icon: Webhook },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");
  return (
    <AuthGate>
      {({ user, company }) => (
        <>
          <PageHeader eyebrow="Configuration" title="Settings" />
          <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 sm:gap-6 items-start">
            <Card className="p-3">
              <h2 className="font-display text-base px-2 py-2">Settings</h2>
              <ul className="grid grid-cols-2 md:grid-cols-1 gap-1">
                {TABS.map(({ key, label, icon: Icon }) => {
                  const active = key === tab;
                  return (
                    <li key={key}>
                      <button
                        onClick={() => setTab(key)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors ${
                          active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper hover:text-ink"
                        }`}>
                        <Icon size={14} />
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <div>
              {tab === "general" && <GeneralTab company={company} />}
              {tab === "agents" && <AgentsTab />}
              {tab === "notifications" && <NotificationsTab />}
              {tab === "integrations" && <IntegrationsTab />}
              {tab === "security" && <SecurityTab />}
              {tab === "api" && <ApiTab />}
            </div>
          </div>
        </>
      )}
    </AuthGate>
  );
}

function GeneralTab({ company }: { company: CompanyProfile }) {
  const [profile, setProfile] = useState<CompanyProfile>(company);
  const [savedAt, setSavedAt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [websitesInput, setWebsitesInput] = useState(profile.websites.join(", "));
  const [showSuggest, setShowSuggest] = useState(false);

  function patch(p: Partial<CompanyProfile>) {
    setProfile((cur) => ({ ...cur, ...p }));
  }

  function toggleNaics(code: string) {
    patch({ naics: profile.naics.map((n) => (n.code === code ? { ...n, on: !n.on } : n)) });
  }

  function removeNaics(code: string) {
    patch({ naics: profile.naics.filter((n) => n.code !== code) });
  }

  function addNaics(code: string, label: string) {
    if (!code || profile.naics.some((n) => n.code === code)) return;
    patch({ naics: [...profile.naics, { code, label, on: true }] });
  }

  async function save() {
    setSaving(true);
    try {
      const websites = websitesInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const next = { ...profile, websites };
      const saved = await updateCompany(profile.id, next);
      setProfile(saved);
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(0), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6 space-y-8">
      <section>
        <h3 className="font-display text-lg mb-4">Company information</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Company name">
            <input
              value={profile.name}
              onChange={(e) => patch({ name: e.target.value })}
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
          <Field label="Primary contact email">
            <input
              value={profile.email}
              onChange={(e) => patch({ email: e.target.value })}
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
          <Field label="Company websites (comma-separated)" full>
            <input
              value={websitesInput}
              onChange={(e) => setWebsitesInput(e.target.value)}
              placeholder="https://liv8.co, https://liv8ai.com"
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
          <Field label="Short description" full>
            <textarea
              value={profile.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="What does your company do? Used by AI to suggest NAICS codes and draft docs."
              rows={2}
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink resize-y" />
          </Field>
        </div>
      </section>

      <section>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
          <div>
            <h3 className="font-display text-lg">NAICS codes</h3>
            <p className="text-xs text-ink-faint mt-1">
              Which codes your company qualifies for. Drives Feed filtering and
              the Qualification Analyst.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowSuggest(true)}>
            <Sparkles size={14} className="text-brass" /> Suggest from website
          </Button>
        </div>

        <ul className="space-y-2 mt-4">
          {profile.naics.length === 0 && (
            <li className="text-sm text-ink-faint border border-dashed border-line rounded-sm p-4 text-center">
              No NAICS codes yet. Add one manually or hit "Suggest from website".
            </li>
          )}
          {profile.naics.map((n) => (
            <NaicsRow key={n.code} n={n}
              onToggle={() => toggleNaics(n.code)}
              onRemove={() => removeNaics(n.code)} />
          ))}
        </ul>

        <AddNaicsRow onAdd={addNaics} existing={profile.naics.map((n) => n.code)} />
      </section>

      <section>
        <h3 className="font-display text-lg mb-4">Qualification criteria</h3>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Minimum contract value">
            <CurrencyInput value={profile.minValue}
              onChange={(v) => patch({ minValue: v })} />
          </Field>
          <Field label="Maximum contract value">
            <CurrencyInput value={profile.maxValue}
              onChange={(v) => patch({ maxValue: v })} />
          </Field>
        </div>
      </section>

      <hr className="border-line" />

      <div className="flex items-center justify-end gap-3 flex-wrap">
        {savedAt > 0 && <span className="text-good text-sm font-mono">Saved.</span>}
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {showSuggest && (
        <SuggestNaicsModal
          urls={websitesInput.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)}
          profile={profile}
          existingCodes={profile.naics.map((n) => n.code)}
          onClose={() => setShowSuggest(false)}
          onAdd={(picks) => {
            patch({ naics: [...profile.naics, ...picks] });
            setShowSuggest(false);
          }}
        />
      )}
    </Card>
  );
}

function NaicsRow({ n, onToggle, onRemove }:
  { n: NaicsCode; onToggle: () => void; onRemove: () => void }) {
  return (
    <li className="flex items-start gap-3 p-3 border border-line rounded-sm hover:bg-paper">
      <input type="checkbox" checked={n.on} onChange={onToggle}
        className="mt-0.5 accent-ink" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono tnum text-sm">{n.code}</span>
          {n.primary && <Badge tone="brass">primary</Badge>}
        </div>
        <div className="text-xs text-ink-soft mt-0.5">{n.label}</div>
      </div>
      <button onClick={onRemove}
        aria-label="Remove NAICS code"
        className="text-ink-faint hover:text-bad p-1">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

function AddNaicsRow({ onAdd, existing }:
  { onAdd: (code: string, label: string) => void; existing: string[] }) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  return (
    <div className="mt-3 flex flex-col sm:flex-row gap-2">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
        placeholder="Code (6 digits)"
        className="sm:w-32 bg-paper border border-line rounded-sm px-3 py-2 text-sm font-mono focus:outline-none focus:border-ink" />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Description"
        className="flex-1 bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
      <button
        disabled={!code || existing.includes(code)}
        onClick={() => {
          onAdd(code, label || "Custom NAICS code");
          setCode("");
          setLabel("");
        }}
        className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-ink text-paper rounded-sm text-sm hover:bg-navy disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

function SuggestNaicsModal({ urls, profile, existingCodes, onClose, onAdd }: {
  urls: string[];
  profile: CompanyProfile;
  existingCodes: string[];
  onClose: () => void;
  onAdd: (picks: NaicsCode[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<
    { code: string; label: string; confidence: number; rationale: string }[]
  >([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [source, setSource] = useState<"anthropic" | "stub" | null>(null);

  useEffect(() => {
    if (urls.length === 0) {
      setError("Add at least one company website above first.");
      return;
    }
    setLoading(true);
    api.suggestNaics({
      urls,
      company_name: profile.name,
      description: profile.description,
    })
      .then((res) => {
        setSuggestions(res.suggestions);
        setSource(res.source);
        const next: Record<string, boolean> = {};
        res.suggestions.forEach((s) => { next[s.code] = !existingCodes.includes(s.code); });
        setPicked(next);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPicked() {
    const picks: NaicsCode[] = suggestions
      .filter((s) => picked[s.code] && !existingCodes.includes(s.code))
      .map((s) => ({ code: s.code, label: s.label, on: true }));
    onAdd(picks);
  }

  return (
    <div className="fixed inset-0 z-50 scrim flex items-end sm:items-center justify-center p-2 sm:p-6 animate-fade-in"
      onClick={onClose}>
      <div className="bg-card border border-line rounded-sm w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-brass" />
              <h3 className="font-display text-lg">AI NAICS suggestions</h3>
            </div>
            <p className="text-xs text-ink-faint mt-1">
              Reading: {urls.join(", ") || "(no URLs set)"}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-sm hover:bg-paper flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="animate-spin" size={14} />
                Reading {urls.length} website{urls.length === 1 ? "" : "s"}…
              </div>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-16" />
              ))}
            </div>
          )}
          {error && (
            <div className="text-sm text-bad font-mono bg-bad/5 border border-bad/30 rounded-sm p-3">
              {error}
            </div>
          )}
          {!loading && !error && (
            <ul className="space-y-2">
              {suggestions.map((s) => {
                const already = existingCodes.includes(s.code);
                return (
                  <li key={s.code}>
                    <label className={`flex items-start gap-3 p-3 border rounded-sm cursor-pointer transition-colors ${
                      already ? "border-line opacity-50 cursor-not-allowed bg-paper"
                              : picked[s.code] ? "border-ink bg-paper" : "border-line hover:bg-paper"
                    }`}>
                      <input
                        type="checkbox"
                        disabled={already}
                        checked={!!picked[s.code]}
                        onChange={(e) => setPicked((p) => ({ ...p, [s.code]: e.target.checked }))}
                        className="mt-0.5 accent-ink" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono tnum text-sm">{s.code}</span>
                          <span className="text-sm font-medium">{s.label}</span>
                          {already && <Badge tone="ink">already added</Badge>}
                          <Badge tone={s.confidence >= 0.8 ? "good" : s.confidence >= 0.6 ? "brass" : "ink"}>
                            {Math.round(s.confidence * 100)}%
                          </Badge>
                        </div>
                        {s.rationale && (
                          <p className="text-xs text-ink-soft mt-1 leading-relaxed">{s.rationale}</p>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-line p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="text-[11px] font-mono text-ink-faint">
            {source === "anthropic" ? "Source: Claude" : source === "stub" ? "Source: heuristic (set ANTHROPIC_API_KEY in Vercel for live AI)" : ""}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-ink-soft hover:text-ink">
              Cancel
            </button>
            <Button onClick={addPicked}
              disabled={loading || Object.values(picked).every((v) => !v)}>
              Add selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentsTab() {
  return (
    <Card className="p-5 sm:p-6 space-y-6">
      <section>
        <h3 className="font-display text-lg mb-1">Agent behavior</h3>
        <p className="text-xs text-ink-faint mb-4">Tune model defaults and guardrails.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Default LLM provider">
            <select className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm">
              <option>Anthropic Claude (recommended)</option>
              <option>OpenAI GPT-4o</option>
            </select>
          </Field>
          <Field label="Auto-score threshold">
            <input defaultValue="65"
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm" />
          </Field>
        </div>
        <label className="mt-4 flex items-start gap-3">
          <input type="checkbox" defaultChecked className="mt-0.5 accent-ink" />
          <span className="text-sm">
            <strong>Strict vault-only drafting.</strong>
            <span className="text-ink-faint block text-xs mt-0.5">
              Proposal Writer may only quote approved vault docs; missing facts are flagged [NEEDS HUMAN INPUT].
            </span>
          </span>
        </label>
        <label className="mt-3 flex items-start gap-3">
          <input type="checkbox" defaultChecked className="mt-0.5 accent-ink" />
          <span className="text-sm">
            <strong>Block export until human approval.</strong>
            <span className="text-ink-faint block text-xs mt-0.5">
              PDFs only render when every compliance item is satisfied and attestations are signed.
            </span>
          </span>
        </label>
      </section>
    </Card>
  );
}

function NotificationsTab() {
  const rows = [
    { kind: "New high-score opportunity", email: true, slack: true },
    { kind: "Deadline within 7 days", email: true, slack: false },
    { kind: "Compliance item blocks export", email: true, slack: true },
    { kind: "Agent error / retry exhausted", email: false, slack: true },
    { kind: "Weekly pipeline digest", email: true, slack: false },
  ];
  return (
    <Card className="p-5 sm:p-6 overflow-x-auto">
      <h3 className="font-display text-lg mb-4">Notifications</h3>
      <table className="w-full text-sm min-w-[400px]">
        <thead>
          <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint">
            <th className="py-2">Event</th>
            <th className="py-2 w-20 text-center">Email</th>
            <th className="py-2 w-20 text-center">Slack</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kind} className="border-t border-line">
              <td className="py-3">{r.kind}</td>
              <td className="py-3 text-center">
                <input type="checkbox" defaultChecked={r.email} className="accent-ink" />
              </td>
              <td className="py-3 text-center">
                <input type="checkbox" defaultChecked={r.slack} className="accent-ink" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function IntegrationsTab() {
  const items = [
    { name: "SAM.gov", note: "Federal contract opportunities", connected: true },
    { name: "Grants.gov", note: "Federal grant opportunities", connected: true },
    { name: "USAspending", note: "Past-award research", connected: true },
    { name: "Supabase / Postgres", note: "Database & RLS", connected: false },
    { name: "Anthropic", note: "Proposal drafting, summaries, NAICS suggestions", connected: false },
    { name: "OpenAI", note: "Vault embeddings", connected: false },
    { name: "Slack", note: "Notifications & approvals", connected: false },
    { name: "Resend", note: "Reminder emails", connected: false },
  ];
  return (
    <Card className="divide-y divide-line">
      <div className="p-5">
        <h3 className="font-display text-lg">Integrations</h3>
        <p className="text-xs text-ink-faint mt-1">
          Connect external services. Stub deployment shows "not connected" until backend env vars are set.
        </p>
      </div>
      {items.map((i) => (
        <div key={i.name} className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
          <Globe size={16} className="text-ink-faint shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{i.name}</div>
            <div className="text-xs text-ink-faint">{i.note}</div>
          </div>
          <Badge tone={i.connected ? "good" : "ink"}>
            {i.connected ? "connected" : "not connected"}
          </Badge>
          <button className="text-xs font-mono text-brass hover:text-ink uppercase tracking-wider">
            {i.connected ? "Manage" : "Connect"}
          </button>
        </div>
      ))}
    </Card>
  );
}

function SecurityTab() {
  return (
    <Card className="p-5 sm:p-6 space-y-6">
      <section>
        <h3 className="font-display text-lg mb-1">Security</h3>
        <p className="text-xs text-ink-faint">Authentication & data handling.</p>
      </section>
      <div className="flex items-start gap-3 bg-bad/5 border border-bad/30 rounded-sm p-4">
        <ShieldAlert size={16} className="text-bad mt-0.5 shrink-0" />
        <p className="text-sm text-ink-soft leading-relaxed">
          Demo mode: data lives in your browser only. For multi-user / multi-tenant
          production, wire Supabase Auth (or Clerk / NextAuth) and a Postgres DB.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Single sign-on">
          <select className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm">
            <option>Demo (localStorage)</option>
            <option>Supabase Auth</option>
            <option>Clerk</option>
            <option>Google Workspace</option>
          </select>
        </Field>
        <Field label="Session timeout (minutes)">
          <input defaultValue="60"
            className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm" />
        </Field>
      </div>
    </Card>
  );
}

function ApiTab() {
  const KEYS = [
    { name: "ANTHROPIC_API_KEY", note: "Live AI for NAICS suggestion, doc generation, chat, scrape extraction.", required: true },
    { name: "SAM_GOV_API_KEY", note: "Federal contract opportunities. Free, 1k calls/day. https://sam.gov/data-services", required: true },
    { name: "OPENAI_API_KEY", note: "Embeddings for vault retrieval (1536-dim).", required: false },
    { name: "RESEND_API_KEY", note: "Deadline / amendment reminder emails.", required: false },
    { name: "Grants.gov search2", note: "Keyless — no credential needed.", required: false },
  ];
  return (
    <Card className="divide-y divide-line">
      <div className="p-5">
        <h3 className="font-display text-lg">API keys</h3>
        <p className="text-xs text-ink-faint mt-1">
          Set as Vercel environment variables. Never paste them into the UI.
        </p>
      </div>
      {KEYS.map((k) => (
        <div key={k.name} className="flex items-center gap-4 p-4 flex-wrap sm:flex-nowrap">
          <KeyRound size={16} className="text-ink-faint shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-mono text-sm">{k.name}</div>
            <div className="text-xs text-ink-faint">{k.note}</div>
          </div>
          <Badge tone={k.required ? "brass" : "ink"}>
            {k.required ? "required" : "optional"}
          </Badge>
        </div>
      ))}
    </Card>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function CurrencyInput({ value, onChange }:
  { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 focus-within:border-ink">
      <span className="text-ink-faint text-sm">$</span>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
        className="flex-1 bg-transparent text-sm focus:outline-none tnum" />
    </div>
  );
}

