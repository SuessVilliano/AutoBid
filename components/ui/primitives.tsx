import clsx from "clsx";
import { ReactNode } from "react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("bg-card border border-line rounded-sm shadow-card", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "ink", className }:
  { children: ReactNode; tone?: "ink" | "brass" | "good" | "warn" | "bad"; className?: string }) {
  const tones: Record<string, string> = {
    ink: "border-line text-ink-soft bg-paper",
    brass: "border-brass/40 text-brass bg-brass/5",
    good: "border-good/30 text-good bg-good/5",
    warn: "border-warn/30 text-warn bg-warn/5",
    bad: "border-bad/30 text-bad bg-bad/5",
  };
  return (
    <span className={clsx(
      "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] uppercase tracking-wider border rounded-sm font-mono",
      tones[tone], className)}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = "solid", disabled, className }:
  { children: ReactNode; onClick?: () => void; variant?: "solid" | "ghost" | "outline";
    disabled?: boolean; className?: string }) {
  const variants: Record<string, string> = {
    solid: "bg-ink text-paper hover:bg-navy",
    outline: "border border-ink text-ink hover:bg-ink hover:text-paper",
    ghost: "text-ink-soft hover:text-ink hover:bg-paper",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={clsx(
        "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        variants[variant], className)}>
      {children}
    </button>
  );
}
