"use client";

import {
  ArrowRight, Bot, ClipboardCheck, FileText, Inbox, LayoutList,
  ShieldCheck, Sparkles, Vault,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { currentUser } from "@/lib/auth";

export default function Landing() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    setLoggedIn(!!currentUser());
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <header className="px-5 sm:px-8 py-5 flex items-center justify-between border-b border-line bg-card/60 backdrop-blur sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-3">
          <div className="font-display text-xl sm:text-2xl leading-none tracking-tight">AutoBid</div>
          <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.25em] text-brass">
            Capture · Desk
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm">
          <a href="#how" className="hidden sm:inline text-ink-soft hover:text-ink">How it works</a>
          <a href="#features" className="hidden sm:inline text-ink-soft hover:text-ink">Features</a>
          {loggedIn ? (
            <Link href="/dashboard"
              className="px-3 sm:px-4 py-2 bg-ink text-paper rounded-sm text-sm font-medium hover:bg-navy">
              Open dashboard
            </Link>
          ) : (
            <Link href="/login"
              className="px-3 sm:px-4 py-2 bg-ink text-paper rounded-sm text-sm font-medium hover:bg-navy">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      <section className="px-5 sm:px-8 pt-12 sm:pt-24 pb-16 max-w-5xl mx-auto">
        <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-4 animate-fade-in">
          Human-gated capture desk
        </div>
        <h1 className="font-display text-4xl sm:text-6xl leading-[1.05] tracking-tight max-w-3xl animate-fade-up">
          Win more government contracts —{" "}
          <span className="italic text-brass">without the busywork</span>.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-ink-soft max-w-2xl leading-relaxed animate-fade-up [animation-delay:80ms]">
          AutoBid scans SAM.gov and Grants.gov, scores opportunities against your
          company profile, drafts compliant proposals from your approved vault — and
          waits for you to approve before anything is submitted.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3 animate-fade-up [animation-delay:160ms]">
          <Link href={loggedIn ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 bg-ink text-paper px-6 py-3 rounded-sm font-medium hover:bg-navy">
            {loggedIn ? "Open dashboard" : "Start free demo"}
            <ArrowRight size={16} />
          </Link>
          <Link href="/login"
            className="inline-flex items-center gap-2 border border-line bg-card px-6 py-3 rounded-sm font-medium hover:border-ink">
            Continue as LIV8 demo
          </Link>
          <span className="text-xs font-mono text-ink-faint">
            No credit card · Browser-local data
          </span>
        </div>

        <div className="mt-14 sm:mt-20 grid sm:grid-cols-3 gap-4 max-w-3xl">
          {[
            ["47", "opps scored / wk"],
            ["52%", "qualification rate"],
            ["32%", "MoM pipeline growth"],
          ].map(([v, l]) => (
            <div key={l} className="animate-fade-up [animation-delay:240ms]">
              <div className="font-display text-3xl sm:text-4xl tnum text-brass">{v}</div>
              <div className="text-xs font-mono uppercase tracking-wider text-ink-faint mt-1">
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="px-5 sm:px-8 py-16 bg-card border-y border-line">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-2">
            How it works
          </div>
          <h2 className="font-display text-3xl sm:text-4xl mb-12">
            Four agents do the heavy lifting. You sign off.
          </h2>
          <ol className="grid sm:grid-cols-2 gap-5">
            {[
              {
                icon: Inbox,
                title: "1. Discover",
                body: "Deep-Dive Scraper pulls fresh opportunities from SAM.gov, Grants.gov, and USAspending — plus any URL you paste.",
              },
              {
                icon: ClipboardCheck,
                title: "2. Qualify",
                body: "Qualification Analyst scores each opp against your NAICS, set-asides, value band, and past performance. You see a clean 0-100.",
              },
              {
                icon: FileText,
                title: "3. Draft",
                body: "Proposal Writer drafts from your approved vault language only. Anything missing gets flagged [NEEDS HUMAN INPUT].",
              },
              {
                icon: ShieldCheck,
                title: "4. Submit",
                body: "Submission Coordinator gates the export. PDFs only render when every compliance item is satisfied and you've signed the attestation.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <li key={title} className="p-6 bg-paper border border-line rounded-sm">
                <Icon size={22} className="text-brass mb-3" />
                <h3 className="font-display text-lg mb-2">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="features" className="px-5 sm:px-8 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-2">
            Features
          </div>
          <h2 className="font-display text-3xl sm:text-4xl mb-12">
            Built for small federal contractors.
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature icon={Vault} title="Document vault"
              body="Upload your capability statement, past performance, certs, financials. Mark approved language. Drafts can only quote approved blurbs." />
            <Feature icon={Sparkles} title="AI NAICS suggester"
              body="Paste your company URL. We tell you which NAICS codes match — with rationale and confidence." />
            <Feature icon={LayoutList} title="Pipeline & Kanban"
              body="Every opportunity gets a stage. Drag, filter, sort by value or deadline. Nothing falls through the cracks." />
            <Feature icon={Bot} title="Copilot chat"
              body="Ask 'what's blocking my drafts' or 'draft a capability statement for 541512'. Get answers without leaving the page." />
            <Feature icon={ShieldCheck} title="Human-gated submission"
              body="Drafts prepared automatically. Nothing is certified, priced, or submitted without your signature." />
            <Feature icon={ClipboardCheck} title="Compliance checklist"
              body="Solicitation requirements extracted automatically. Track who owns what. Block export until green." />
          </div>
        </div>
      </section>

      <section className="px-5 sm:px-8 py-16 bg-ink text-paper">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl mb-4">
            Stop pricing yourself out of contracts you'd actually win.
          </h2>
          <p className="text-paper/70 max-w-xl mx-auto mb-8 leading-relaxed">
            Get a working capture desk in under five minutes. Add your company,
            let AI suggest your NAICS codes, and start scoring opportunities tonight.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 bg-brass text-ink px-8 py-4 rounded-sm font-medium hover:bg-paper">
            Start now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="px-5 sm:px-8 py-8 border-t border-line text-center text-xs font-mono text-ink-faint">
        AutoBid — built for LIV8 Digital · Human-gated · Browser-local demo data
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, body }:
  { icon: typeof Inbox; title: string; body: string }) {
  return (
    <div className="p-5 border border-line rounded-sm bg-card hover:border-ink/30 transition-colors">
      <Icon size={20} className="text-brass mb-3" />
      <h3 className="font-display text-lg mb-1.5">{title}</h3>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}
