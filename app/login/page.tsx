"use client";

import { ArrowRight, CheckCircle2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { dataMode, signInDemo, signInWithGoogle, signInWithMagicLink } from "@/lib/data";
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

  async function googleSignIn() {
    setBusy(true);
    setError("");
    const res = await signInWithGoogle();
    if (!res.ok) {
      setError(res.error ?? "Could not start Google sign-in");
      setBusy(false);
    }
    // on success, Supabase redirects the browser away — no need to do anything
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
              {supabaseEnabled && (
                <>
                  <button
                    type="button"
                    onClick={googleSignIn}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-3 bg-card border border-line py-3 rounded-sm font-medium hover:border-ink disabled:opacity-40">
                    <GoogleIcon /> Continue with Google
                  </button>
                  <div className="flex items-center gap-3 text-xs font-mono text-ink-faint">
                    <div className="flex-1 h-px bg-line" />
                    or use a magic link
                    <div className="flex-1 h-px bg-line" />
                  </div>
                </>
              )}
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

          {!supabaseEnabled && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs font-mono text-ink-faint">
                <div className="flex-1 h-px bg-line" />
                <span>or</span>
                <div className="flex-1 h-px bg-line" />
              </div>
              <button
                onClick={continueDemo}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 border border-line bg-card py-3 rounded-sm font-medium hover:border-ink">
                <Sparkles size={14} className="text-brass" /> Continue as LIV8 demo
                <span className="text-[10px] font-mono text-ink-faint">(browser-only)</span>
              </button>
            </>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.5-5.2l-6.2-5.3A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
