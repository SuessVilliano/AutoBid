"""main.py — FastAPI surface for the AutoBid backend.

    pip install fastapi uvicorn
Run:  uvicorn main:app --reload   (from apps/api/)

NOTE: auth is stubbed. In production, verify the Supabase JWT, resolve the
caller's company_id, and rely on Postgres RLS for tenant isolation. Never
trust a company_id passed from the client without checking the token.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from agents.compliance import extract_requirements, validate_ready_to_export
from agents.proposal_writer import draft_all
from agents.scoring_agent import score_opportunity
from db.audit import log
from db.pool import execute, query
from docs.render_pdf import render_proposal_pdf
from ingest import ingest_grants, ingest_sam
from llm import complete

app = FastAPI(title="AutoBid API", version="0.1.0")

import os
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- health ----------
@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


# ---------- ingestion (manual trigger; normally via Celery beat) ----------
@app.post("/ingest/sam")
def trigger_sam(days_back: int = 2) -> dict:
    return {"upserted": ingest_sam(days_back=days_back)}


@app.post("/ingest/grants")
def trigger_grants(keyword: str = "") -> dict:
    return {"upserted": ingest_grants(keyword=keyword)}


# ---------- opportunity feed ----------
@app.get("/companies/{company_id}/feed")
def feed(company_id: str, min_score: int = 0, limit: int = 50) -> dict:
    rows = query(
        """
        select o.id, o.title, o.naics, o.set_aside, o.response_deadline, o.url,
               s.total_score, s.recommended, s.rationale
        from opportunities o
        left join opportunity_scores s
          on s.opportunity_id = o.id and s.company_id = %s
        where coalesce(s.total_score, 0) >= %s
        order by s.total_score desc nulls last, o.posted_date desc nulls last
        limit %s
        """,
        (company_id, min_score, limit),
    )
    return {"items": rows}


@app.get("/companies/{company_id}/opportunities/{opportunity_id}")
def opportunity_detail(company_id: str, opportunity_id: str) -> dict:
    opp = query("select * from opportunities where id = %s", (opportunity_id,))
    if not opp:
        raise HTTPException(404, "not found")
    score_row = query(
        "select total_score, subscores, rationale, recommended, scored_at "
        "from opportunity_scores where opportunity_id = %s and company_id = %s "
        "order by scored_at desc limit 1", (opportunity_id, company_id))
    ws = query("select id, name, status from bid_workspaces "
               "where opportunity_id = %s and company_id = %s",
               (opportunity_id, company_id))
    return {"opportunity": opp[0],
            "score": score_row[0] if score_row else None,
            "workspaces": ws}


# ---------- scoring ----------
@app.post("/companies/{company_id}/opportunities/{opportunity_id}/score")
def score(company_id: str, opportunity_id: str) -> dict:
    try:
        return score_opportunity(company_id, opportunity_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


# ---------- AI summary ----------
@app.get("/opportunities/{opportunity_id}/summary")
def summary(opportunity_id: str) -> dict:
    opp = query("select title, description, naics, response_deadline, "
                "estimated_value from opportunities where id = %s", (opportunity_id,))
    if not opp:
        raise HTTPException(404, "not found")
    o = opp[0]
    text = complete(
        "Summarize a government opportunity in exactly 5 short sentences: what it "
        "is, who the buyer is, rough value, the deadline, and the single biggest "
        "consideration for bidding. Be factual; do not invent details.",
        str(o), max_tokens=300)
    return {"summary": text}


# ---------- workspace ----------
class WorkspaceIn(BaseModel):
    opportunity_id: Optional[str] = None
    grant_id: Optional[str] = None
    name: str
    owner_id: Optional[str] = None


@app.post("/companies/{company_id}/workspaces")
def create_workspace(company_id: str, body: WorkspaceIn) -> dict:
    if not body.opportunity_id and not body.grant_id:
        raise HTTPException(400, "opportunity_id or grant_id required")
    row = execute(
        """insert into bid_workspaces
             (company_id, opportunity_id, grant_id, name, status, owner_id)
           values (%s,%s,%s,%s,'draft',%s) returning id""",
        (company_id, body.opportunity_id, body.grant_id, body.name, body.owner_id),
    )
    log(action="create", entity_type="bid_workspace", entity_id=row["id"],
        company_id=company_id, actor_id=body.owner_id, actor_kind="user")
    return {"workspace_id": row["id"]}


# ---------- compliance ----------
class ComplianceIn(BaseModel):
    solicitation_text: str
    company_id: Optional[str] = None


@app.post("/workspaces/{workspace_id}/compliance/extract")
def compliance_extract(workspace_id: str, body: ComplianceIn) -> dict:
    items = extract_requirements(workspace_id, body.solicitation_text, body.company_id)
    return {"extracted": len(items), "items": items}


@app.get("/workspaces/{workspace_id}/compliance/ready")
def compliance_ready(workspace_id: str) -> dict:
    return validate_ready_to_export(workspace_id)


# ---------- proposal ----------
class ProposalIn(BaseModel):
    company_id: str
    requirements_text: str = ""


@app.post("/workspaces/{workspace_id}/proposal/draft")
def proposal_draft(workspace_id: str, body: ProposalIn) -> dict:
    return draft_all(workspace_id, body.company_id, body.requirements_text)


@app.get("/workspaces/{workspace_id}")
def get_workspace(workspace_id: str) -> dict:
    ws = query(
        """select w.*, o.title as opportunity_title, o.url as opportunity_url,
                  o.response_deadline
           from bid_workspaces w
           left join opportunities o on o.id = w.opportunity_id
           where w.id = %s""", (workspace_id,))
    if not ws:
        raise HTTPException(404, "not found")
    proposals = query(
        "select id, version, status, created_at from generated_proposals "
        "where workspace_id = %s order by version desc", (workspace_id,))
    return {"workspace": ws[0], "proposals": proposals}


@app.get("/workspaces/{workspace_id}/compliance")
def list_compliance(workspace_id: str) -> dict:
    rows = query(
        "select id, requirement, section_ref, category, status, is_attestation "
        "from compliance_checklists where workspace_id = %s order by created_at",
        (workspace_id,))
    return {"items": rows}


class ChecklistPatch(BaseModel):
    status: str                      # open|satisfied|waived|blocked
    actor_id: Optional[str] = None


@app.patch("/compliance/{item_id}")
def update_compliance(item_id: str, body: ChecklistPatch) -> dict:
    row = execute(
        "update compliance_checklists set status = %s where id = %s "
        "returning id, workspace_id, is_attestation, status",
        (body.status, item_id))
    if not row:
        raise HTTPException(404, "not found")
    log(action="update", entity_type="compliance_checklist", entity_id=item_id,
        actor_id=body.actor_id, actor_kind="user",
        after={"status": body.status})
    return row


@app.get("/proposals/{proposal_id}/sections")
def list_sections(proposal_id: str) -> dict:
    rows = query(
        "select id, section_type, ordinal, content_md, is_locked, is_ai_generated "
        "from proposal_sections where proposal_id = %s order by ordinal",
        (proposal_id,))
    return {"sections": rows}


class SectionPatch(BaseModel):
    content_md: Optional[str] = None
    is_locked: Optional[bool] = None
    actor_id: Optional[str] = None


@app.patch("/sections/{section_id}")
def update_section(section_id: str, body: SectionPatch) -> dict:
    sets, params = [], []
    if body.content_md is not None:
        sets.append("content_md = %s"); params.append(body.content_md)
        sets.append("is_ai_generated = false")
    if body.is_locked is not None:
        sets.append("is_locked = %s"); params.append(body.is_locked)
    if not sets:
        raise HTTPException(400, "nothing to update")
    sets.append("updated_at = now()")
    params.append(section_id)
    row = execute(f"update proposal_sections set {', '.join(sets)} "
                  f"where id = %s returning id, is_locked", params)
    if not row:
        raise HTTPException(404, "not found")
    log(action="update", entity_type="proposal_section", entity_id=section_id,
        actor_id=body.actor_id, actor_kind="user")
    return row


# ---------- export (gated) ----------
@app.post("/workspaces/{workspace_id}/proposals/{proposal_id}/export")
def export_pdf(workspace_id: str, proposal_id: str, title: str = "Proposal") -> Response:
    gate = validate_ready_to_export(workspace_id)
    if not gate["ready"]:
        raise HTTPException(
            409, f"Not ready to export: {gate['open_items']} open items, "
                 f"{gate['unsigned_attestations']} unsigned attestations. "
                 f"Human review required.")
    pdf = render_proposal_pdf(proposal_id, title=title)
    log(action="export", entity_type="proposal", entity_id=proposal_id,
        actor_kind="system", meta={"workspace_id": workspace_id})
    return Response(content=pdf, media_type="application/pdf")
