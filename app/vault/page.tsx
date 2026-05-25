"use client";
import { CheckCircle2, FileText, ShieldCheck, Vault } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge, Card } from "@/components/ui/primitives";

const DOC_KINDS = [
  "Capability statement", "Past performance", "Key personnel resumes",
  "Certifications (8(a)/WOSB/SDVOSB)", "Financials", "SAM / registration",
  "Reusable templates",
];

export default function VaultPage() {
  return (
    <>
      <PageHeader eyebrow="Knowledge base" title="Company Vault">
        <Badge tone="brass"><ShieldCheck size={11} /> Approved language only</Badge>
      </PageHeader>

      <div className="p-8 grid grid-cols-3 gap-6 items-start">
        <Card className="col-span-2 p-6">
          <h3 className="flex items-center gap-2 font-display text-lg mb-4">
            <Vault size={16} className="text-brass" /> Document vault
          </h3>
          <p className="text-sm text-ink-soft mb-5 leading-relaxed">
            Upload reusable materials once. Anything you mark <strong>approved</strong> becomes
            eligible for reuse by the Proposal Writer (it embeds the text into pgvector and
            retrieves only approved documents when drafting). Unapproved drafts are ignored.
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {DOC_KINDS.map((k) => (
              <li key={k} className="flex items-center gap-2 border border-line rounded-sm px-3 py-2.5 bg-paper">
                <FileText size={15} className="text-ink-faint" />
                <span className="text-sm flex-1">{k}</span>
                <span className="text-[11px] font-mono text-ink-faint">empty</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-faint mt-4 font-mono">
            Wire to: POST /documents (Supabase Storage) → rag/embed.embed_document.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-lg mb-4">Capability profile</h3>
          <dl className="space-y-2.5 text-sm">
            {[
              ["NAICS / PSC", "drives matching"],
              ["Service states", "location fit"],
              ["Value band", "value fit"],
              ["Set-asides held", "certification scoring"],
              ["Approved blurbs", "proposal reuse"],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between border-b border-line/60 pb-2">
                <dt>{k}</dt>
                <dd className="flex items-center gap-1 text-ink-faint text-xs">
                  <CheckCircle2 size={12} /> {v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ink-faint mt-4 font-mono">
            Backed by company_profiles + companies tables.
          </p>
        </Card>
      </div>
    </>
  );
}
