"use client";

import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { dataMode, signInDemo, signInWithMagicLink } from "@/lib/data";
import { supabaseEnabled } from "@/lib/supabase/env";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 sm:px-8 py-5 border-b border-line bg-card/60">
        <Link href="/" className="font-display text-xl tracking-tight">AutoBid</Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="h-8 w-48 skeleton" />
      </div>
    </div>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initialError = params.get("error") ?? "";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(initialError);

  async function sendMagicLink() {
    setBusy(true);
    setError("");
    const res = await signInWithMagicLink(email.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "Could not send magic link");
      return;
    }
    setSent(true);
  }

  async function continueDemo() {
    setBusy(true);
    setError("");
    try {
      await signInDemo("demo@liv8.co", "LIV8 demo");
      router.push("/dashboard");
      window.location.reload();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  async function continueDemoCustom() {
    if (!email.trim()) return;
    setBusy(true);
    setError("");
    try {
      await signInDemo(email.trim(), name.trim() || undefined);
      router.push("/dashboard");
      window.location.reload();
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-5 sm:px-8 py-5 border-b border-line bg-card/60">
        <Link href="/" className="font-display text-xl tracking-tight">AutoBid</Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-5 py-12 sm:py-20">
        <div className="w-full max-w-md animate-fade-up">
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-3">
            {dataMode === "supabase" ? "Sign in" : "Demo mode"}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl mb-2 tracking-tight">
            Sign in to AutoBid
          </h1>
          <p className="text-ink-soft mb-8 text-sm leading-relaxed">
            {dataMode === "supabase"
              ? "Enter your email and we'll send you a one-time sign-in link. No password to remember."
              : "Your data lives in this browser only. Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY in Vercel to switch to cloud mode."}
          </p>

          {sent ? (
            <div className="bg-good/5 border border-good/30 rounded-sm p-5 animate-fade-up">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-good" />
                <span className="font-medium">Check your inbox</span>
              </div>
              <p className="text-sm text-ink-soft">
                We sent a magic-link to <strong>{email}</strong>. Click it and you'll
                be signed in. (Check spam if it's not there in a minute.)
              </p>
              <button onClick={() => { setSent(false); setEmail(""); }}
                className="mt-4 text-xs font-mono text-brass hover:text-ink">
                Use a different email →
              </button>
            </div>
          ) : (
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      dataMode === "supabase" ? sendMagicLink() : continueDemoCustom();
                  }}
                  className="w-full bg-card border border-line rounded-sm px-3 py-2.5 focus:outline-none focus:border-ink"
                />
              </label>

              {dataMode === "demo" && (
                <label className="block">
                  <span className="block text-[11px] font-mono uppercase tracking-wider text-ink-faint mb-1.5">
                    Your name (optional)
                  </span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-card border border-line rounded-sm px-3 py-2.5 focus:outline-none focus:border-ink"
                  />
                </label>
              )}

              <button
                onClick={dataMode === "supabase" ? sendMagicLink : continueDemoCustom}
                disabled={busy || !email.trim()}
                className="w-full flex items-center justify-center gap-2 bg-ink text-paper py-3 rounded-sm font-medium hover:bg-navy disabled:opacity-40 disabled:cursor-not-allowed">
                {dataMode === "supabase" ? (
                  <><Mail size={16} /> {busy ? "Sending…" : "Send magic link"}</>
                ) : (
                  <>Continue <ArrowRight size={16} /></>
                )}
              </button>

              {error && (
                <p className="text-sm text-bad font-mono bg-bad/5 border border-bad/30 rounded-sm p-2.5">
                  {error}
                </p>
              )}
            </div>
          )}

          <div className="my-6 flex items-center gap-3 text-xs font-mono text-ink-faint">
            <div className="flex-1 h-px bg-line" />
            <span>{supabaseEnabled ? "having trouble?" : "or"}</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {supabaseEnabled ? (
            <div className="text-[11px] font-mono text-ink-faint leading-relaxed space-y-1.5">
              <p>If the magic link doesn't arrive:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check your spam folder</li>
                <li>Make sure <code className="text-ink">{typeof window !== "undefined" ? window.location.origin : ""}/auth/callback</code> is in Supabase → Authentication → URL Configuration → Redirect URLs</li>
                <li>Supabase free-tier emails are rate-limited to 3/hour</li>
              </ul>
            </div>
          ) : (
            <button
              onClick={continueDemo}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 border border-line bg-card py-3 rounded-sm font-medium hover:border-ink">
              <Sparkles size={14} className="text-brass" /> Continue as LIV8 demo
              <span className="text-[10px] font-mono text-ink-faint">(browser-only)</span>
            </button>
          )}

          <p className="mt-6 text-[11px] font-mono text-ink-faint text-center">
            {supabaseEnabled
              ? "Data lives in your Supabase project, scoped to your row by RLS."
              : "Set NEXT_PUBLIC_SUPABASE_URL + ANON_KEY in Vercel to switch to cloud mode."}
          </p>
        </div>
      </div>
    </div>
  );
}
