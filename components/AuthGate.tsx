"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createCompany, getActiveCompany, getCurrentUser, type AppUser } from "@/lib/data";
import type { CompanyProfile } from "@/lib/companyProfile";

type Ctx = { user: AppUser; company: CompanyProfile };

export function AuthGate({ children }: { children: (ctx: Ctx) => React.ReactNode }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      let c = await getActiveCompany();
      if (cancelled) return;
      if (!c) {
        setCreating(true);
        try {
          const name = u.email ? u.email.split("@")[0] : "My company";
          c = await createCompany(name);
        } catch (e) {
          setError(formatError(e));
          return;
        } finally {
          if (!cancelled) setCreating(false);
        }
      }
      if (cancelled) return;
      setCtx({ user: u, company: c });
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-md mx-auto bg-card border border-line rounded-sm p-6 mt-12">
          <h2 className="font-display text-xl mb-2">Couldn't set up your account</h2>
          <p className="text-sm text-bad font-mono bg-bad/5 border border-bad/30 rounded-sm p-2.5 mb-4">{error}</p>
          <p className="text-sm text-ink-soft mb-4">
            This usually means the Supabase database tables haven't been created yet.
            Run <code>supabase/migrations/0001_init.sql</code> in your Supabase SQL editor.
          </p>
          <a href="/login" className="inline-block text-sm font-mono text-brass hover:text-ink">← Back to sign in</a>
        </div>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="p-4 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-sm text-ink-soft font-mono">Setting up your workspace…</div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="p-4 sm:p-8">
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="h-28 skeleton" />
          <div className="h-28 skeleton" />
          <div className="h-28 skeleton" />
        </div>
      </div>
    );
  }
  return <>{children(ctx)}</>;
}

function formatError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const parts: string[] = [];
    if (typeof obj.message === "string") parts.push(obj.message);
    if (typeof obj.code === "string") parts.push(`(code: ${obj.code})`);
    if (typeof obj.hint === "string") parts.push(`hint: ${obj.hint}`);
    if (typeof obj.details === "string") parts.push(`details: ${obj.details}`);
    if (parts.length) return parts.join(" — ");
    try { return JSON.stringify(e); } catch { /* fallthrough */ }
  }
  return String(e);
}
