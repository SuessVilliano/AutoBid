"use client";
import { KeyRound, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";

const KEYS = [
  { name: "SAM_GOV_API_KEY", note: "Federal contract opportunities. ~1,000 calls/day.", required: true },
  { name: "Grants.gov search2", note: "Keyless — no credential needed.", required: false },
  { name: "USAspending", note: "Keyless — award research.", required: false },
  { name: "ANTHROPIC_API_KEY", note: "Proposal drafting, compliance extraction, summaries.", required: true },
  { name: "OPENAI_API_KEY", note: "Embeddings for vault retrieval (1536-dim).", required: true },
  { name: "RESEND_API_KEY", note: "Deadline / amendment reminder emails.", required: false },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings & API Keys" />
      <div className="p-8 space-y-6 max-w-3xl">
        <div className="flex items-start gap-3 bg-bad/5 border border-bad/30 rounded-sm p-4">
          <ShieldAlert size={18} className="text-bad mt-0.5 shrink-0" />
          <p className="text-sm text-ink-soft leading-relaxed">
            Keys live in backend environment variables only — never in the browser or
            committed to source. If a key was ever pasted into chat or email, rotate it
            before use.
          </p>
        </div>

        <Card className="divide-y divide-line">
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
      </div>
    </>
  );
}
