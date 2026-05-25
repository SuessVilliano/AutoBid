"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { activeCompany, currentUser, type User } from "@/lib/auth";
import type { CompanyProfile } from "@/lib/companyProfile";

type Ctx = { user: User; company: CompanyProfile };

export function AuthGate({ children }: { children: (ctx: Ctx) => React.ReactNode }) {
  const router = useRouter();
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const u = currentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    const c = activeCompany(u);
    if (!c) {
      router.replace("/login");
      return;
    }
    setCtx({ user: u, company: c });
    setChecked(true);
  }, [router]);

  if (!checked || !ctx) {
    return (
      <div className="p-8">
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
