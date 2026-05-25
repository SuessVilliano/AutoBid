import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }:
  { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-card/60 backdrop-blur px-8 py-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

export function Notice({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="m-8 border border-dashed border-line rounded-sm p-8 text-center bg-card">
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-ink-soft text-sm max-w-md mx-auto leading-relaxed">{body}</p>
    </div>
  );
}
