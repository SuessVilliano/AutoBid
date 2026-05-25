export function scoreTier(score: number | null | undefined): "good" | "warn" | "bad" | "none" {
  if (score == null) return "none";
  if (score >= 70) return "good";
  if (score >= 45) return "warn";
  return "bad";
}

export function scoreHex(score: number | null | undefined): string {
  const t = scoreTier(score);
  return t === "good" ? "var(--good)" : t === "warn" ? "var(--warn)"
    : t === "bad" ? "var(--bad)" : "var(--ink-faint)";
}

export function daysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined,
    { month: "short", day: "numeric", year: "numeric" });
}

export const SUBSCORE_LABELS: Record<string, string> = {
  naics: "NAICS match", psc: "PSC match", agency: "Agency relevance",
  location: "Location fit", past_perf: "Past performance", deadline: "Deadline feasibility",
  value: "Value fit", certs: "Certifications", competition: "Competition",
  doc_complexity: "Doc complexity", strategic: "Strategic value",
};

export const SUBSCORE_WEIGHTS: Record<string, number> = {
  naics: 15, psc: 8, agency: 10, location: 7, past_perf: 15, deadline: 12,
  value: 8, certs: 10, competition: 8, doc_complexity: 4, strategic: 3,
};
