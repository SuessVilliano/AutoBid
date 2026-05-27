export type SubcontractorStatus = "vetted" | "active" | "contacted" | "inactive";

export type Subcontractor = {
  id: string;
  companyId: string;       // tenant
  name: string;             // sub company name
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  capabilities: string[];
  naics: string[];
  certifications: string[];
  regions: string[];
  pastProjects?: number;
  rate?: string;
  status: SubcontractorStatus;
  preferred: boolean;
  notes?: string;
  lastContacted?: number;   // ms epoch
  createdAt: number;
  updatedAt: number;
};

export const CERTIFICATIONS = [
  "SDVOSB", "WOSB", "EDWOSB", "8(a)", "HUBZone", "Small Business",
  "CMMC L1", "CMMC L2", "CMMC L3",
  "FedRAMP Moderate", "FedRAMP High",
  "ISO 27001", "ISO 9001", "SOC 2",
] as const;

export const STATUS_TONE: Record<SubcontractorStatus, "good" | "ink" | "warn"> = {
  vetted: "good",
  active: "ink",
  contacted: "warn",
  inactive: "ink",
};

/** Starter subs seeded for a brand-new company, so the Rolodex isn't empty. */
export const STARTER_SUBS: Omit<Subcontractor, "id" | "companyId" | "createdAt" | "updatedAt">[] = [
  {
    name: "Beacon Cyber Group",
    contactName: "Maya Ortiz",
    email: "maya@beaconcyber.example",
    phone: "+1 703 555 0142",
    website: "https://beaconcyber.example",
    capabilities: ["cybersecurity", "penetration testing", "CMMC L2 assessment"],
    naics: ["541512", "541519"],
    certifications: ["SDVOSB", "CMMC L2", "ISO 27001"],
    regions: ["VA", "DC", "MD", "nationwide remote"],
    pastProjects: 14,
    rate: "$185/hr blended",
    status: "vetted",
    preferred: true,
    notes: "Strong DoD past performance. Cleared engineers available.",
  },
  {
    name: "RidgePath Cloud Services",
    contactName: "Jordan Patel",
    email: "jordan@ridgepath.example",
    phone: "+1 512 555 0177",
    website: "https://ridgepath.example",
    capabilities: ["AWS migration", "FedRAMP support", "Kubernetes"],
    naics: ["541512", "518210"],
    certifications: ["8(a)", "FedRAMP Moderate"],
    regions: ["TX", "CA", "nationwide"],
    pastProjects: 22,
    rate: "T&M, $165-225/hr",
    status: "vetted",
    preferred: true,
    notes: "Prime'd two VA migrations. Likes 60/40 splits.",
  },
  {
    name: "Compass Proposal Writers",
    contactName: "Hannah Lee",
    email: "hannah@compassproposals.example",
    phone: "+1 240 555 0102",
    website: "https://compassproposals.example",
    capabilities: ["proposal writing", "compliance matrix", "graphics"],
    naics: ["541611", "541613"],
    certifications: ["WOSB"],
    regions: ["MD", "DC", "VA", "nationwide remote"],
    pastProjects: 41,
    rate: "$135/hr or fixed-price",
    status: "active",
    preferred: false,
    notes: "Surge capacity for tight deadlines.",
  },
];

/** Rank subs by fit against a specific opportunity. */
export function matchScore(
  sub: Subcontractor,
  naics: string | null | undefined,
  setAside: string | null | undefined,
): number {
  let score = 0;
  if (naics && sub.naics.includes(naics)) score += 5;
  if (setAside) {
    const sa = setAside.toLowerCase();
    for (const cert of sub.certifications) {
      if (sa.includes(cert.toLowerCase())) score += 3;
    }
  }
  if (sub.preferred) score += 1;
  return score;
}

export function suggestSubs(
  subs: Subcontractor[],
  naics: string | null | undefined,
  setAside: string | null | undefined,
  limit = 4,
): Subcontractor[] {
  return subs
    .map((s) => ({ s, score: matchScore(s, naics, setAside) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}
