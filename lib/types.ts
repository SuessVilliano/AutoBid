export type SubScores = {
  naics: number; psc: number; agency: number; location: number;
  past_perf: number; deadline: number; value: number; certs: number;
  competition: number; doc_complexity: number; strategic: number;
};

export type FeedItem = {
  id: string;
  title: string;
  naics: string | null;
  set_aside: string | null;
  response_deadline: string | null;
  url: string | null;
  total_score: number | null;
  recommended: boolean | null;
  rationale: string | null;
};

export type Opportunity = {
  id: string; source: string; type: string; title: string;
  description: string | null; naics: string | null; psc: string | null;
  set_aside: string | null; place_of_perf_state: string | null;
  posted_date: string | null; response_deadline: string | null;
  solicitation_no: string | null; url: string | null;
  resource_links: { name?: string; url?: string }[] | null;
};

export type ScoreRow = {
  total_score: number; subscores: SubScores; rationale: string | null;
  recommended: boolean; scored_at: string;
};

export type OpportunityDetail = {
  opportunity: Opportunity;
  score: ScoreRow | null;
  workspaces: { id: string; name: string; status: string }[];
};

export type ChecklistItem = {
  id: string; requirement: string; section_ref: string | null;
  category: string; status: "open" | "satisfied" | "waived" | "blocked";
  is_attestation: boolean;
};

export type ProposalSection = {
  id: string; section_type: string; ordinal: number;
  content_md: string | null; is_locked: boolean; is_ai_generated: boolean;
};

export type WorkspaceDetail = {
  workspace: {
    id: string; name: string; status: string;
    opportunity_id: string | null; opportunity_title: string | null;
    opportunity_url: string | null; response_deadline: string | null;
  };
  proposals: { id: string; version: number; status: string; created_at: string }[];
};

export type ReadyState = {
  ready: boolean; open_items: number; unsigned_attestations: number;
};
