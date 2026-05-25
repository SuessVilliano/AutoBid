import { scoreHex } from "@/lib/format";

export function ScoreDial({ score, size = 56 }: { score: number | null; size?: number }) {
  const v = score ?? 0;
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const dash = (v / 100) * c;
  const color = scoreHex(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--line)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.2,0.7,0.2,1)" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono tnum font-semibold"
          style={{ color, fontSize: size * 0.32 }}>
          {score == null ? "—" : v}
        </span>
      </div>
    </div>
  );
}
