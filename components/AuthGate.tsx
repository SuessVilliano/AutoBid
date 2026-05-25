"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveCompany, getCurrentUser, type AppUser } from "@/lib/data";
import type { CompanyProfile } from "@/lib/companyProfile";

type Ctx = { user: AppUser; company: CompanyProfile };

export function AuthGate({ children }: { children: (ctx: Ctx) => React.ReactNode }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [needsCompany, setNeedsCompany] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const u = await getCurrentUser();
      if (cancelled) return;
      if (!u) {
        router.replace("/login");
        return;
      }
      const c = await getActiveCompany();
      if (cancelled) return;
      if (!c) {
        setNeedsCompany(true);
        return;
      }
      setCtx({ user: u, company: c });
    })();
    return () => { cancelled = true; };
  }, [router]);

  if (needsCompany) {
    return (
      <div className="p-4 sm:p-8">
        <div className="max-w-md mx-auto bg-card border border-line rounded-sm p-6 mt-12 text-center">
          <h2 className="font-display text-xl mb-2">Almost there.</h2>
          <p className="text-sm text-ink-soft mb-5">
            Create your first company to start scoring opportunities.
          </p>
          <a href="/login?firstcompany=1"
            className="inline-block bg-ink text-paper px-4 py-2 rounded-sm text-sm">
            Set up company →
          </a>
        </div>
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
