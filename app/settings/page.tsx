"use client";
import {
  Bell, Bot, ClipboardCheck, Globe, KeyRound, Plug, Save, ShieldAlert,
  ShieldCheck, Sliders, User, Webhook,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Button, Card } from "@/components/ui/primitives";

type TabKey = "general" | "agents" | "notifications" | "integrations" | "security" | "api";

const TABS: { key: TabKey; label: string; icon: typeof User }[] = [
  { key: "general", label: "General", icon: Sliders },
  { key: "agents", label: "AI Agents", icon: Bot },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "api", label: "API & Webhooks", icon: Webhook },
];

const NAICS_LIBRARY = [
  { code: "541519", label: "Other Computer Related Services", primary: true, on: true },
  { code: "541511", label: "Custom Computer Programming Services", primary: false, on: true },
  { code: "541611", label: "Administrative Management and General Management Consulting", primary: false, on: true },
  { code: "541613", label: "Marketing Consulting Services", primary: false, on: true },
  { code: "518210", label: "Data Processing, Hosting, and Related Services", primary: false, on: true },
  { code: "561422", label: "Telemarketing Bureaus and Other Contact Centers", primary: false, on: false },
  { code: "541930", label: "Translation and Interpretation Services", primary: false, on: true },
  { code: "511210", label: "Software Publishers", primary: false, on: false },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<TabKey>("general");
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" />
      <div className="p-8 grid grid-cols-[220px,1fr] gap-6 items-start">
        <Card className="p-3">
          <h2 className="font-display text-base px-2 py-2">Settings</h2>
          <ul className="space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = key === tab;
              return (
                <li key={key}>
                  <button
                    onClick={() => setTab(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-sm transition-colors ${
                      active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper hover:text-ink"
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
        <div>
          {tab === "general" && <GeneralTab />}
          {tab === "agents" && <AgentsTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "integrations" && <IntegrationsTab />}
          {tab === "security" && <SecurityTab />}
          {tab === "api" && <ApiTab />}
        </div>
      </div>
    </>
  );
}

function GeneralTab() {
  const [naics, setNaics] = useState(NAICS_LIBRARY);
  const [saved, setSaved] = useState(false);
  function toggle(code: string) {
    setNaics((n) => n.map((x) => (x.code === code ? { ...x, on: !x.on } : x)));
  }
  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  return (
    <Card className="p-6 space-y-8">
      <section>
        <h3 className="font-display text-lg mb-4">Company information</h3>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Company name">
            <input defaultValue="LIV8 Digital"
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
          <Field label="Primary contact email">
            <input defaultValue="contracts@liv8digital.com"
              className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink" />
          </Field>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg">NAICS codes configuration</h3>
        <p className="text-xs text-ink-faint mt-1 mb-4">
          Configure which NAICS codes your company qualifies for. Used by the
          Qualification Analyst to evaluate opportunities.
        </p>
        <ul className="space-y-2">
          {naics.map((n) => (
            <li key={n.code}>
              <label className="flex items-start gap-3 p-3 border border-line rounded-sm hover:bg-paper cursor-pointer">
                <input type="checkbox" checked={n.on} onChange={() => toggle(n.code)}
                  className="mt-0.5 accent-ink" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tnum text-sm">{n.code}</span>
                    {n.primary && <Badge tone="brass">primary</Badge>}
                  </div>
                  <div className="text-xs text-ink-soft mt-0.5">{n.label}</div>
                </div>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-lg mb-4">Qualification criteria</h3>
        <div className="grid grid-cols-2 gap-5">
          <Field label="Minimum contract value">
            <CurrencyInput defaultValue="25000" />
          </Field>
          <Field label="Maximum contract value">
            <CurrencyInput defaultValue="5000000" />
          </Field>
        </div>
      </section>

      <hr className="border-line" />

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-good text-sm font-mono">Saved.</span>}
        <button className="text-sm text-ink-soft hover:text-ink">Reset</button>
        <Button onClick={save}><Save size={14} /> Save changes</Button>
      </div>
    </Card>
  );
}

function AgentsTab() {
  return (
    <Card className="p-6 space-y-6">
      <section>
        <h3 className="font-display text-lg mb-1">Agent behavior</h3>
        <p className="text-xs text-ink-faint mb-4">Tune model defaults and guardrails.</p>
        <div className="grid grid-cols-2 gap-5">
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
    <Card className="p-6">
      <h3 className="font-display text-lg mb-4">Notifications</h3>
      <table className="w-full text-sm">
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
    { name: "Anthropic", note: "Proposal drafting, summaries", connected: false },
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
        <div key={i.name} className="flex items-center gap-4 p-4">
          <Globe size={16} className="text-ink-faint" />
          <div className="flex-1">
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
    <Card className="p-6 space-y-6">
      <section>
        <h3 className="font-display text-lg mb-1">Security</h3>
        <p className="text-xs text-ink-faint">Authentication & data handling.</p>
      </section>
      <div className="flex items-start gap-3 bg-bad/5 border border-bad/30 rounded-sm p-4">
        <ShieldAlert size={16} className="text-bad mt-0.5 shrink-0" />
        <p className="text-sm text-ink-soft leading-relaxed">
          Secrets live in backend env vars only — never committed or sent to the
          browser. Rotate any key that touched chat/email.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Single sign-on">
          <select className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm">
            <option>Supabase Auth (default)</option>
            <option>Google Workspace</option>
            <option>Microsoft Entra ID</option>
          </select>
        </Field>
        <Field label="Session timeout (minutes)">
          <input defaultValue="60"
            className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm" />
        </Field>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" defaultChecked className="mt-0.5 accent-ink" />
        <span className="text-sm">
          <strong>Require attestation signature for export.</strong>
          <span className="text-ink-faint block text-xs mt-0.5">
            Bid/grant PDFs only render after a signed user attestation.
          </span>
        </span>
      </label>
    </Card>
  );
}

function ApiTab() {
  const KEYS = [
    { name: "SAM_GOV_API_KEY", note: "Federal contract opportunities. ~1,000 calls/day.", required: true },
    { name: "ANTHROPIC_API_KEY", note: "Proposal drafting, compliance extraction, summaries, chat assistant.", required: true },
    { name: "OPENAI_API_KEY", note: "Embeddings for vault retrieval (1536-dim).", required: true },
    { name: "RESEND_API_KEY", note: "Deadline / amendment reminder emails.", required: false },
    { name: "Grants.gov search2", note: "Keyless — no credential needed.", required: false },
    { name: "USAspending", note: "Keyless — award research.", required: false },
  ];
  const HOOKS = [
    { url: "https://hooks.slack.com/services/…/…", events: ["high_score", "blocked"] },
    { url: "https://example.com/webhook/autobid", events: ["any"] },
  ];
  return (
    <div className="space-y-6">
      <Card className="divide-y divide-line">
        <div className="p-5">
          <h3 className="font-display text-lg">API keys</h3>
          <p className="text-xs text-ink-faint mt-1">
            Set as Vercel / backend environment variables. Never paste them into the UI.
          </p>
        </div>
        {KEYS.map((k) => (
          <div key={k.name} className="flex items-center gap-4 p-4">
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

      <Card className="p-5">
        <h3 className="font-display text-lg mb-1">Webhooks</h3>
        <p className="text-xs text-ink-faint mb-4">Fire events to external systems.</p>
        <ul className="space-y-3">
          {HOOKS.map((h) => (
            <li key={h.url} className="flex items-center gap-3 border border-line rounded-sm p-3">
              <ClipboardCheck size={14} className="text-brass" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs truncate">{h.url}</div>
                <div className="text-[11px] text-ink-faint mt-1">
                  Events: {h.events.join(", ")}
                </div>
              </div>
              <button className="text-xs font-mono text-ink-soft hover:text-ink">Edit</button>
            </li>
          ))}
        </ul>
        <Button className="mt-4" variant="outline">+ Add webhook</Button>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}

function CurrencyInput({ defaultValue }: { defaultValue: string }) {
  return (
    <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 focus-within:border-ink">
      <span className="text-ink-faint text-sm">$</span>
      <input defaultValue={defaultValue}
        className="flex-1 bg-transparent text-sm focus:outline-none tnum" />
    </div>
  );
}
