"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, loginAsLiv8Demo } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function go(asDemo: boolean) {
    setBusy(true);
    if (asDemo) {
      loginAsLiv8Demo();
    } else {
      const e = email.trim();
      if (!e) {
        setBusy(false);
        return;
      }
      login(e, name.trim() || undefined);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 sm:px-8 py-5 border-b border-line bg-card/60">
        <Link href="/" className="font-display text-xl tracking-tight">AutoBid</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12 sm:py-20">
        <div className="w-full max-w-md animate-fade-up">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-3">
            Demo mode
          </div>
          <h1 className="font-display text-3xl sm:text-4xl mb-2 tracking-tight">
            Sign in to AutoBid
          </h1>
          <p className="text-ink-soft mb-8 text-sm leading-relaxed">
            Your data lives in this browser only. No password required — wire up real
            auth (Supabase, Clerk, etc.) when you're ready to go to production.
          </p>

          <div className="space-y-4">
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                onKeyDown={(e) => e.key === "Enter" && go(false)}
                className="w-full bg-card border border-line rounded-sm px-3 py-2.5 focus:outline-none focus:border-ink"
              />
            </label>
            <label className="block">
              <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
                Your name (optional)
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                onKeyDown={(e) => e.key === "Enter" && go(false)}
                className="w-full bg-card border border-line rounded-sm px-3 py-2.5 focus:outline-none focus:border-ink"
              />
            </label>

            <button
              onClick={() => go(false)}
              disabled={busy || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-ink text-paper py-3 rounded-sm font-medium hover:bg-navy disabled:opacity-40 disabled:cursor-not-allowed">
              Continue <ArrowRight size={16} />
            </button>
          </div>

          <div className="my-6 flex items-center gap-3 text-xs font-mono text-ink-faint">
            <div className="flex-1 h-px bg-line" /> or <div className="flex-1 h-px bg-line" />
          </div>

          <button
            onClick={() => go(true)}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 border border-line bg-card py-3 rounded-sm font-medium hover:border-ink">
            <Sparkles size={14} className="text-brass" /> Continue as LIV8 demo
          </button>

          <p className="mt-6 text-[11px] font-mono text-ink-faint text-center">
            By signing in, nothing leaves your browser unless you set Anthropic / SAM keys in Vercel.
          </p>
        </div>
      </div>
    </div>
  );
}
