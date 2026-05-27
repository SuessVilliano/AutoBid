"use client";
import clsx from "clsx";
import {
  Activity, BarChart3, Bot, FileStack, Gauge, HardHat, Inbox, LayoutList,
  PlusCircle, Settings, Vault,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/feed", label: "Opportunity Feed", icon: Inbox },
  { href: "/pipeline", label: "Pipeline", icon: LayoutList },
  { href: "/add-opportunity", label: "Add Opportunity", icon: PlusCircle },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/health", label: "System Health", icon: Activity },
  { href: "/subcontractors", label: "Subcontractors", icon: HardHat },
  { href: "/vault", label: "Company Vault", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-line bg-card min-h-screen sticky top-0 px-4 py-6 flex flex-col">
      <Link href="/" className="px-2 mb-8 block">
        <div className="font-display text-2xl leading-none tracking-tight">AutoBid</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass mt-1">
          Capture&nbsp;·&nbsp;Desk
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-good">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
          SYSTEM ACTIVE
        </div>
      </Link>
      <nav className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors",
                active ? "bg-ink text-paper" : "text-ink-soft hover:bg-paper hover:text-ink")}>
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto pt-6 border-t border-line">
        <div className="flex items-center gap-2 px-2 text-[11px] text-ink-faint font-mono">
          <FileStack size={13} /> Human-gated submission
        </div>
        <p className="px-2 mt-1.5 text-[11px] leading-snug text-ink-faint">
          Drafts prepared automatically. Nothing is certified, priced, or submitted
          without your approval.
        </p>
      </div>
    </aside>
  );
}
