"use client";
import { Calendar, CheckCircle2, FileText, Link2, Tag, Upload } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button, Card } from "@/components/ui/primitives";

export default function AddOpportunityPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; message: string } | null>(null);
  const [form, setForm] = useState({
    title: "",
    agency: "",
    url: "",
    type: "Contract",
    value: "",
    due_date: "",
    naics: "",
    description: "",
    contact: "",
  });

  const valid = form.title.trim() && form.agency.trim() && form.url.trim() && form.due_date;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: form.value ? Number(form.value) : null,
        }),
      });
      const data = await res.json();
      setResult({ id: data.id, message: data.message });
      setForm({
        title: "", agency: "", url: "", type: "Contract", value: "",
        due_date: "", naics: "", description: "", contact: "",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <>
      <PageHeader eyebrow="Capture desk" title="Add Opportunity" />
      <form onSubmit={submit} className="p-8 max-w-4xl space-y-6">
        <Card className="p-6 space-y-6">
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg mb-4">
              <FileText size={16} className="text-brass" /> Basic information
            </h2>
            <div className="grid grid-cols-2 gap-5">
              <Field label="Opportunity title *">
                <input
                  value={form.title} onChange={(e) => update("title", e.target.value)}
                  placeholder="Enter the opportunity title"
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                />
              </Field>
              <Field label="Government agency *">
                <input
                  value={form.agency} onChange={(e) => update("agency", e.target.value)}
                  placeholder="e.g., Department of Defense, GSA"
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                />
              </Field>
              <Field label="Opportunity URL *" colSpan={2}>
                <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 focus-within:border-ink">
                  <Link2 size={14} className="text-ink-faint" />
                  <input
                    value={form.url} onChange={(e) => update("url", e.target.value)}
                    placeholder="https://sam.gov/opp/..."
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              </Field>
            </div>
          </section>

          <hr className="border-line" />

          <section>
            <h2 className="flex items-center gap-2 font-display text-lg mb-4">
              <Tag size={16} className="text-brass" /> Opportunity details
            </h2>
            <div className="grid grid-cols-3 gap-5">
              <Field label="Type">
                <select
                  value={form.type} onChange={(e) => update("type", e.target.value)}
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                >
                  <option>Contract</option>
                  <option>Grant</option>
                  <option>BPA</option>
                  <option>IDIQ</option>
                </select>
              </Field>
              <Field label="Contract value (USD)">
                <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 focus-within:border-ink">
                  <span className="text-ink-faint text-sm">$</span>
                  <input
                    type="number" value={form.value}
                    onChange={(e) => update("value", e.target.value)}
                    placeholder="250000"
                    className="flex-1 bg-transparent text-sm focus:outline-none tnum"
                  />
                </div>
              </Field>
              <Field label="Due date *">
                <div className="flex items-center gap-2 bg-paper border border-line rounded-sm px-3 py-2 focus-within:border-ink">
                  <Calendar size={14} className="text-ink-faint" />
                  <input
                    type="date" value={form.due_date}
                    onChange={(e) => update("due_date", e.target.value)}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                </div>
              </Field>
              <Field label="NAICS codes" colSpan={3}>
                <input
                  value={form.naics} onChange={(e) => update("naics", e.target.value)}
                  placeholder="541511, 541519, 541611 (comma-separated)"
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                />
                <p className="text-[11px] text-ink-faint mt-1">
                  Enter relevant NAICS codes separated by commas
                </p>
              </Field>
            </div>
          </section>

          <hr className="border-line" />

          <section>
            <h2 className="font-display text-lg mb-4">Additional information</h2>
            <div className="space-y-4">
              <Field label="Description / requirements">
                <textarea
                  rows={4} value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="Brief description of the opportunity requirements (optional — will be auto-extracted from URL)"
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                />
              </Field>
              <Field label="Contact information">
                <textarea
                  rows={2} value={form.contact}
                  onChange={(e) => update("contact", e.target.value)}
                  placeholder="Contracting officer details (optional — will be auto-extracted from URL)"
                  className="w-full bg-paper border border-line rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-ink"
                />
              </Field>
            </div>
          </section>

          <hr className="border-line" />

          <div className="flex items-center justify-between">
            <p className="text-[11px] font-mono text-ink-faint uppercase tracking-wider">
              * Required fields
            </p>
            <Button disabled={!valid || submitting}>
              <Upload size={14} />
              {submitting ? "Submitting…" : "Submit opportunity"}
            </Button>
          </div>
        </Card>

        {result && (
          <Card className="p-5 border-good/40 bg-good/5">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={18} className="text-good mt-0.5" />
              <div>
                <div className="font-display text-base">Queued · {result.id}</div>
                <p className="text-sm text-ink-soft mt-1">{result.message}</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-5 bg-paper/50">
          <h3 className="font-display text-base mb-3">What happens next?</h3>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li className="flex gap-2">
              <span className="text-brass">·</span>
              <span><strong className="text-ink">Deep-Dive Data Scraper</strong> will extract detailed information from the opportunity URL</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brass">·</span>
              <span><strong className="text-ink">Qualification Analyst</strong> will evaluate the opportunity against your capabilities</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brass">·</span>
              <span><strong className="text-ink">Grant & Proposal Writer</strong> will generate a tailored draft if qualified</span>
            </li>
            <li className="flex gap-2">
              <span className="text-brass">·</span>
              <span><strong className="text-ink">Submission Coordinator</strong> will manage the compliance + submission workflow</span>
            </li>
          </ul>
        </Card>
      </form>
    </>
  );
}

function Field({ label, children, colSpan = 1 }:
  { label: string; children: React.ReactNode; colSpan?: number }) {
  const span = colSpan === 2 ? "col-span-2" : colSpan === 3 ? "col-span-3" : "";
  return (
    <label className={`block ${span}`}>
      <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
