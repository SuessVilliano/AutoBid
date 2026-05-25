import { ReactNode } from "react";

export function PageHeader({ eyebrow, title, children }:
  { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="border-b border-line bg-card/60 backdrop-blur px-4 sm:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4 pl-16 md:pl-8">
      <div>
        {eyebrow && (
          <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-brass mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </header>
  );
}

export function Notice({ title, body }: { title: string; body: ReactNode }) {
  return (
    <div className="m-4 sm:m-8 border border-dashed border-line rounded-sm p-6 sm:p-8 text-center bg-card">
      <h3 className="font-display text-xl mb-2">{title}</h3>
      <p className="text-ink-soft text-sm max-w-md mx-auto leading-relaxed">{body}</p>
    </div>
  );
}
