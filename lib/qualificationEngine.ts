import type { CompanyProfile } from "./companyProfile";

export type QualificationInput = {
  title?: string | null;
  description?: string | null;
  naics?: string | null;
  set_aside?: string | null;
  value?: number | null;
  response_deadline?: string | null;
  place_of_perf_state?: string | null;
};

export type FitFactor = {
  label: string;
  score: number;
  outOf: number;
  evidence: string;
};

export type QualificationResult = {
  score: number;
  confidence: "low" | "medium" | "high";
  posture: "pursue_review" | "team_or_verify" | "monitor" | "low_fit";
  factors: FitFactor[];
  watchouts: string[];
};

/**
 * A transparent opportunity-fit estimate. It ranks work for human review;
 * it does not determine legal eligibility, size status, or ability to perform.
 */
export function qualifyOpportunity(
  opportunity: QualificationInput,
  profile: CompanyProfile,
): QualificationResult {
  const activeCodes = profile.naics.filter((item) => item.on).map((item) => item.code);
  const oppCode = (opportunity.naics ?? "").replace(/\D/g, "");
  const exact = !!oppCode && activeCodes.includes(oppCode);
  const sameFour = !exact && !!oppCode && activeCodes.some((code) => code.slice(0, 4) === oppCode.slice(0, 4));
  const sameTwo = !exact && !sameFour && !!oppCode && activeCodes.some((code) => code.slice(0, 2) === oppCode.slice(0, 2));
  const naicsPoints = exact ? 30 : sameFour ? 20 : sameTwo ? 10 : 0;
  const naicsEvidence = exact
    ? `Exact NAICS match: ${oppCode}`
    : sameFour
      ? `Related 4-digit NAICS family: ${oppCode}`
      : sameTwo
        ? `Related 2-digit NAICS sector: ${oppCode}`
        : oppCode ? `No active profile code matches ${oppCode}` : "Opportunity NAICS is missing";

  const profileTerms = meaningfulTerms(profile.description);
  const opportunityTerms = meaningfulTerms(`${opportunity.title ?? ""} ${opportunity.description ?? ""}`);
  const overlap = [...profileTerms].filter((term) => opportunityTerms.has(term));
  const capabilityPoints = profileTerms.size === 0
    ? 0
    : Math.round(25 * Math.min(1, overlap.length / Math.max(2, Math.min(5, profileTerms.size))));
  const capabilityEvidence = overlap.length
    ? `Shared capability terms: ${overlap.slice(0, 4).join(", ")}`
    : profileTerms.size ? "No clear service-language overlap found" : "Add a specific company capability description";

  let valuePoints = 7;
  let valueEvidence = "Opportunity value is not listed; value fit is unknown";
  if (typeof opportunity.value === "number" && opportunity.value > 0) {
    if (opportunity.value >= profile.minValue && opportunity.value <= profile.maxValue) {
      valuePoints = 15;
      valueEvidence = "Estimated value is inside your target range";
    } else {
      const boundary = opportunity.value < profile.minValue ? profile.minValue : profile.maxValue;
      const gap = Math.abs(opportunity.value - boundary) / Math.max(boundary, 1);
      valuePoints = Math.max(0, Math.round(15 * (1 - Math.min(gap, 1))));
      valueEvidence = opportunity.value < profile.minValue
        ? "Estimated value is below your target range"
        : "Estimated value is above your target range";
    }
  }

  const days = daysUntil(opportunity.response_deadline);
  let deadlinePoints = 7;
  let deadlineEvidence = "Response deadline is missing";
  if (days !== null) {
    deadlinePoints = days < 0 ? 0 : days >= 21 ? 15 : days >= 10 ? 11 : days >= 5 ? 7 : days >= 2 ? 4 : 1;
    deadlineEvidence = days < 0 ? "Response deadline has passed" : `${days} calendar days remain`;
  }

  const state = (opportunity.place_of_perf_state ?? "").trim().toUpperCase();
  const states = profile.serviceStates.map((item) => item.trim().toUpperCase()).filter(Boolean);
  const locationPoints = !state || !states.length
    ? 5
    : states.includes(state) ? 10
      : ["US", "NATIONWIDE", "REMOTE"].includes(state) ? 8 : 2;
  const locationEvidence = !state
    ? "Place of performance is not listed"
    : !states.length
      ? `Add service areas to compare against ${state}`
      : states.includes(state) ? `Within your listed service area: ${state}`
        : ["US", "NATIONWIDE", "REMOTE"].includes(state) ? "Nationwide or remote performance"
          : `${state} is outside your listed service areas`;

  const factors: FitFactor[] = [
    { label: "NAICS alignment", score: naicsPoints, outOf: 30, evidence: naicsEvidence },
    { label: "Capability evidence", score: capabilityPoints, outOf: 25, evidence: capabilityEvidence },
    { label: "Value range", score: valuePoints, outOf: 15, evidence: valueEvidence },
    { label: "Deadline", score: deadlinePoints, outOf: 15, evidence: deadlineEvidence },
    { label: "Place of performance", score: locationPoints, outOf: 10, evidence: locationEvidence },
    { label: "Profile coverage", score: profileCoverage(profile), outOf: 5, evidence: profileCoverageEvidence(profile) },
  ];

  const score = factors.reduce((sum, factor) => sum + factor.score, 0);
  const completeSignals = [
    activeCodes.length > 0,
    profile.description.trim().length >= 24,
    profile.minValue > 0 && profile.maxValue >= profile.minValue,
    profile.serviceStates.length > 0,
    profile.setAsides.length > 0,
  ].filter(Boolean).length;
  const confidence: QualificationResult["confidence"] =
    completeSignals >= 4 ? "high" : completeSignals >= 2 ? "medium" : "low";

  const watchouts: string[] = [];
  if (!opportunity.naics) watchouts.push("Confirm the opportunity's NAICS in the official notice.");
  if (opportunity.set_aside) {
    const normalized = opportunity.set_aside.toLowerCase();
    const matching = profile.setAsides.some((item) => item.toLowerCase() === normalized);
    watchouts.push(matching
      ? `Verify ${opportunity.set_aside} status is current and applies to this solicitation.`
      : `Verify eligibility for the ${opportunity.set_aside} set-aside; no exact match is recorded in the profile.`);
  }
  if (confidence !== "high") watchouts.push("Profile is incomplete, so this score has limited confidence.");
  if (days !== null && days < 5) watchouts.push("Short response window; confirm staffing and proposal capacity.");
  if (opportunity.value == null) watchouts.push("Confirm the contract value from the solicitation.");
  if (state && states.length && !states.includes(state) && !["US", "NATIONWIDE", "REMOTE"].includes(state)) {
    watchouts.push("Confirm whether your team or a local partner can perform in this location.");
  }

  const posture: QualificationResult["posture"] = score >= 70 && confidence !== "low"
    ? "pursue_review"
    : score >= 50 ? "team_or_verify"
      : score >= 35 ? "monitor" : "low_fit";

  return { score, confidence, posture, factors, watchouts };
}

function meaningfulTerms(value: string): Set<string> {
  const stop = new Set([
    "about", "and", "are", "for", "from", "into", "our", "services", "that",
    "the", "their", "this", "with", "your", "company", "business", "agency",
    "support", "solutions", "service", "digital",
  ]);
  return new Set(
    value.toLowerCase().match(/[a-z0-9]{3,}/g)?.filter((term) => !stop.has(term)) ?? [],
  );
}

function daysUntil(value?: string | null): number | null {
  if (!value) return null;
  const due = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function profileCoverage(profile: CompanyProfile): number {
  const present = [
    profile.naics.some((item) => item.on),
    profile.description.trim().length >= 24,
    profile.minValue > 0 && profile.maxValue >= profile.minValue,
    profile.serviceStates.length > 0,
    profile.setAsides.length > 0,
  ].filter(Boolean).length;
  return present;
}

function profileCoverageEvidence(profile: CompanyProfile): string {
  const missing = [
    !profile.naics.some((item) => item.on) && "active NAICS",
    profile.description.trim().length < 24 && "specific capabilities",
    !(profile.minValue > 0 && profile.maxValue >= profile.minValue) && "target contract range",
    !profile.serviceStates.length && "service locations",
    !profile.setAsides.length && "set-aside status",
  ].filter(Boolean);
  return missing.length ? `Add profile details: ${missing.join(", ")}` : "Core fit fields are present";
}
