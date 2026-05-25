"use client";
import clsx from "clsx";
import {
  Activity, BarChart3, Bot, Building2, ChevronDown, FileStack, Gauge, Inbox,
  LayoutList, LogOut, Menu, Plus, PlusCircle, Settings, Vault, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  createCompany, dataMode, getActiveCompany, getAllCompanies, getCurrentUser,
  setActiveCompanyId, signOut, type AppUser,
} from "@/lib/data";
import type { CompanyProfile } from "@/lib/companyProfile";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/feed", label: "Opportunity Feed", icon: Inbox },
  { href: "/pipeline", label: "Pipeline", icon: LayoutList },
  { href: "/add-opportunity", label: "Add Opportunity", icon: PlusCircle },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/health", label: "System Health", icon: Activity },
  { href: "/vault", label: "Company Vault", icon: Vault },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setMobileOpen(false), [path]);

  return (
    <>
      <button
        aria-label="Open menu"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-sm bg-card border border-line shadow-card flex items-center justify-center">
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 scrim animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={clsx(
        "bg-card min-h-screen px-4 py-6 flex flex-col border-r border-line",
        "md:w-60 md:shrink-0 md:sticky md:top-0",
        "fixed md:relative z-50 top-0 left-0 w-72 transition-transform",
        mobileOpen ? "translate-x-0 animate-slide-in-left" : "-translate-x-full md:translate-x-0",
      )}>
        <div className="flex items-start justify-between mb-6">
          <Link href="/" className="px-2 block">
            <div className="font-display text-2xl leading-none tracking-tight">AutoBid</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-brass mt-1">
              Capture&nbsp;·&nbsp;Desk
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-good">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-good animate-pulse" />
              SYSTEM ACTIVE
            </div>
          </Link>
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="md:hidden w-8 h-8 rounded-sm hover:bg-paper flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <CompanySwitcher />

        <nav className="space-y-1 mt-4">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/dashboard" && path.startsWith(href));
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

        <UserMenu />

        <div className="mt-4 pt-4 border-t border-line">
          <div className="flex items-center gap-2 px-2 text-[11px] text-ink-faint font-mono">
            <FileStack size={13} /> Human-gated submission
          </div>
          <p className="px-2 mt-1.5 text-[11px] leading-snug text-ink-faint">
            Drafts prepared automatically. Nothing certified, priced, or submitted
            without your approval.
          </p>
          <p className="px-2 mt-3 text-[10px] font-mono text-ink-faint uppercase tracking-wider">
            {dataMode === "supabase" ? "Supabase · cloud" : "Demo · browser-only"}
          </p>
        </div>
      </aside>
    </>
  );
}

function CompanySwitcher() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [active, setActive] = useState<CompanyProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [all, act] = await Promise.all([getAllCompanies(), getActiveCompany()]);
      setCompanies(all);
      setActive(act);
    })();
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!active) return null;

  return (
    <div ref={popRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 border border-line rounded-sm bg-paper hover:border-ink/30 transition-colors text-left">
        <Building2 size={14} className="text-brass shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">Active company</div>
          <div className="text-sm font-medium truncate">{active.name}</div>
        </div>
        <ChevronDown size={14} className={clsx("text-ink-faint transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-line rounded-sm shadow-card z-50 animate-fade-in">
          <ul className="max-h-64 overflow-y-auto">
            {companies.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => {
                    setActiveCompanyId(c.id);
                    setActive(c);
                    setOpen(false);
                    router.refresh();
                    window.location.reload();
                  }}
                  className={clsx(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-paper",
                    c.id === active.id && "bg-paper font-medium",
                  )}>
                  <Building2 size={12} className="text-ink-faint" />
                  <span className="flex-1 truncate">{c.name}</span>
                  {c.id === active.id && <span className="text-[10px] font-mono text-good">active</span>}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-line p-2">
            {adding ? (
              <div className="space-y-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New company name"
                  autoFocus
                  className="w-full text-sm bg-paper border border-line rounded-sm px-2 py-1.5 focus:outline-none focus:border-ink"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      const name = newName.trim();
                      if (!name) return;
                      const c = await createCompany(name);
                      setCompanies((cs) => [...cs, c]);
                      setActive(c);
                      setActiveCompanyId(c.id);
                      setNewName("");
                      setAdding(false);
                      router.refresh();
                      window.location.reload();
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-ink text-paper rounded-sm">
                    Add
                  </button>
                  <button
                    onClick={() => { setAdding(false); setNewName(""); }}
                    className="px-2 py-1 text-xs text-ink-soft hover:text-ink">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-2 px-1 py-1.5 text-xs text-brass hover:text-ink">
                <Plus size={12} /> Add another company
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => { getCurrentUser().then(setUser); }, []);

  if (!user) return null;

  return (
    <div className="mt-auto pt-4 border-t border-line">
      <div className="flex items-center gap-2 px-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-brass/20 text-brass flex items-center justify-center text-xs font-mono">
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{user.name}</div>
          <div className="text-[11px] text-ink-faint truncate">{user.email}</div>
        </div>
        <button
          aria-label="Sign out"
          onClick={async () => {
            await signOut();
            router.push("/");
            window.location.reload();
          }}
          className="w-7 h-7 rounded-sm hover:bg-paper flex items-center justify-center text-ink-faint hover:text-ink">
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );
}
