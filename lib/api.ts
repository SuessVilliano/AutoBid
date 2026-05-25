import type {
  ChecklistItem, FeedItem, OpportunityDetail, ProposalSection,
  ReadyState, WorkspaceDetail,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "/api";
export const COMPANY_ID = process.env.NEXT_PUBLIC_COMPANY_ID || "demo";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${detail}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  feed: (companyId: string, minScore = 0) =>
    req<{ items: FeedItem[] }>(
      `/companies/${companyId}/feed?min_score=${minScore}&limit=100`),

  opportunity: (companyId: string, oppId: string) =>
    req<OpportunityDetail>(`/companies/${companyId}/opportunities/${oppId}`),

  score: (companyId: string, oppId: string) =>
    req(`/companies/${companyId}/opportunities/${oppId}/score`, { method: "POST" }),

  summary: (oppId: string) =>
    req<{ summary: string }>(`/opportunities/${oppId}/summary`),

  createWorkspace: (companyId: string, body: { opportunity_id: string; name: string }) =>
    req<{ workspace_id: string }>(`/companies/${companyId}/workspaces`,
      { method: "POST", body: JSON.stringify(body) }),

  workspace: (id: string) => req<WorkspaceDetail>(`/workspaces/${id}`),

  compliance: (id: string) =>
    req<{ items: ChecklistItem[] }>(`/workspaces/${id}/compliance`),

  extractCompliance: (id: string, solicitation_text: string, company_id: string) =>
    req(`/workspaces/${id}/compliance/extract`,
      { method: "POST", body: JSON.stringify({ solicitation_text, company_id }) }),

  setChecklistStatus: (itemId: string, status: ChecklistItem["status"]) =>
    req(`/compliance/${itemId}`, { method: "PATCH", body: JSON.stringify({ status }) }),

  ready: (id: string) => req<ReadyState>(`/workspaces/${id}/compliance/ready`),

  draftProposal: (id: string, company_id: string, requirements_text = "") =>
    req<{ proposal_id: string }>(`/workspaces/${id}/proposal/draft`,
      { method: "POST", body: JSON.stringify({ company_id, requirements_text }) }),

  sections: (proposalId: string) =>
    req<{ sections: ProposalSection[] }>(`/proposals/${proposalId}/sections`),

  saveSection: (sectionId: string, content_md: string, is_locked?: boolean) =>
    req(`/sections/${sectionId}`,
      { method: "PATCH", body: JSON.stringify({ content_md, is_locked }) }),

  exportUrl: (workspaceId: string, proposalId: string) =>
    `${BASE}/workspaces/${workspaceId}/proposals/${proposalId}/export`,
};
