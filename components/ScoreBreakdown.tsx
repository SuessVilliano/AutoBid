import { SUBSCORE_LABELS, SUBSCORE_WEIGHTS } from "@/lib/format";
import type { SubScores } from "@/lib/types";

export function ScoreBreakdown({ subscores }: { subscores: SubScores }) {
  const rows = Object.keys(SUBSCORE_WEIGHTS).map((k) => {
    const weight = SUBSCORE_WEIGHTS[k];
    const sub = (subscores as Record<string, number>)[k] ?? 0;
    return { k, weight, sub, contribution: +(weight * sub).toFixed(1) };
  }).sort((a, b) => b.contribution - a.contribution);

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-3">
          <div className="w-36 text-xs text-ink-soft shrink-0">{SUBSCORE_LABELS[r.k]}</div>
          <div className="flex-1 h-2 bg-paper border border-line rounded-full overflow-hidden">
            <div className="h-full bg-ink rounded-full"
              style={{ width: `${(r.contribution / r.weight) * 100}%`, transition: "width 0.6s" }} />
          </div>
          <div className="w-20 text-right font-mono tnum text-xs text-ink-soft">
            {r.contribution}
            <span className="text-ink-faint">/{r.weight}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
