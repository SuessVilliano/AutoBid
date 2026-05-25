"""Demo serverless API for AutoBid on Vercel.

Returns static sample data so the Next.js UI renders without a real backend.
Replace with the real FastAPI app in /autobid/apps/api/ once Postgres,
Anthropic, OpenAI, and SAM.gov keys are wired up (Celery + weasyprint need
non-serverless infra).
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from fastapi import FastAPI, HTTPException

app = FastAPI(title="AutoBid Demo API", version="0.1.0-demo")


def _iso(days_ahead: int) -> str:
    return (date.today() + timedelta(days=days_ahead)).isoformat()


DEMO_OPPS: list[dict[str, Any]] = [
    {
        "id": "opp-001",
        "title": "Cloud Migration Services for Veterans Affairs Regional Office",
        "naics": "541512",
        "set_aside": "SDVOSB",
        "response_deadline": _iso(5),
        "url": "https://sam.gov/opp/demo-001",
        "total_score": 87,
        "recommended": True,
        "rationale": "Strong NAICS match, agency past performance, and a comfortable timeline.",
    },
    {
        "id": "opp-002",
        "title": "Cybersecurity Assessment and Authorization (A&A) Support",
        "naics": "541519",
        "set_aside": "Small Business",
        "response_deadline": _iso(12),
        "url": "https://sam.gov/opp/demo-002",
        "total_score": 79,
        "recommended": True,
        "rationale": "Aligned with cyber capability statement; CMMC L2 is a plus.",
    },
    {
        "id": "opp-003",
        "title": "Data Analytics Platform Modernization — Department of Energy",
        "naics": "541511",
        "set_aside": None,
        "response_deadline": _iso(3),
        "url": "https://sam.gov/opp/demo-003",
        "total_score": 71,
        "recommended": True,
        "rationale": "Tight deadline but strong technical fit.",
    },
    {
        "id": "opp-004",
        "title": "AI / ML Research Support — DARPA",
        "naics": "541715",
        "set_aside": None,
        "response_deadline": _iso(21),
        "url": "https://sam.gov/opp/demo-004",
        "total_score": 64,
        "recommended": False,
        "rationale": "Adjacent NAICS; weak past performance signal.",
    },
    {
        "id": "opp-005",
        "title": "Help Desk and End-User Support Services",
        "naics": "541513",
        "set_aside": "8(a)",
        "response_deadline": _iso(30),
        "url": "https://sam.gov/opp/demo-005",
        "total_score": 58,
        "recommended": False,
        "rationale": "Lower-margin support work, not a strategic fit.",
    },
    {
        "id": "opp-006",
        "title": "DevSecOps Platform — Air Force Software Factory",
        "naics": "541512",
        "set_aside": "Small Business",
        "response_deadline": _iso(8),
        "url": "https://sam.gov/opp/demo-006",
        "total_score": 82,
        "recommended": True,
        "rationale": "Excellent NAICS + agency fit; pipeline experience matches.",
    },
]


def _opp_detail(opp_id: str) -> dict[str, Any] | None:
    base = next((o for o in DEMO_OPPS if o["id"] == opp_id), None)
    if not base:
        return None
    return {
        "opportunity": {
            "id": base["id"],
            "source": "SAM.gov (demo)",
            "type": "Solicitation",
            "title": base["title"],
            "description": (
                "This is a demo opportunity. Wire the real FastAPI backend "
                "(see /autobid/apps/api) and Postgres to see live data."
            ),
            "naics": base["naics"],
            "psc": "D399",
            "set_aside": base["set_aside"],
            "place_of_perf_state": "VA",
            "posted_date": _iso(-7),
            "response_deadline": base["response_deadline"],
            "solicitation_no": f"DEMO-{base['id'].upper()}",
            "url": base["url"],
            "resource_links": [
                {"name": "Solicitation PDF", "url": base["url"] or ""},
            ],
        },
        "score": {
            "total_score": base["total_score"],
            "subscores": {
                "naics": 90, "psc": 70, "agency": 80, "location": 60,
                "past_perf": 75, "deadline": 65, "value": 70, "certs": 85,
                "competition": 60, "doc_complexity": 70, "strategic": 80,
            },
            "rationale": base["rationale"],
            "recommended": base["recommended"],
            "scored_at": _iso(0) + "T00:00:00Z",
        },
        "workspaces": [],
    }


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "mode": "demo"}


@app.get("/api/companies/{company_id}/feed")
def feed(company_id: str, min_score: int = 0, limit: int = 100) -> dict[str, Any]:
    items = [o for o in DEMO_OPPS if (o["total_score"] or 0) >= min_score][:limit]
    return {"items": items}


@app.get("/api/companies/{company_id}/opportunities/{opportunity_id}")
def opportunity_detail(company_id: str, opportunity_id: str) -> dict[str, Any]:
    detail = _opp_detail(opportunity_id)
    if not detail:
        raise HTTPException(404, "not found")
    return detail


@app.get("/api/opportunities/{opportunity_id}/summary")
def summary(opportunity_id: str) -> dict[str, str]:
    base = next((o for o in DEMO_OPPS if o["id"] == opportunity_id), None)
    if not base:
        raise HTTPException(404, "not found")
    text = (
        f"{base['title']} is a federal opportunity in NAICS {base['naics']}. "
        f"The set-aside is {base['set_aside'] or 'unrestricted'}. "
        f"Estimated value is mid-six figures (demo data). "
        f"Responses are due {base['response_deadline']}. "
        f"The biggest consideration is timeline — confirm staffing before bidding."
    )
    return {"summary": text}


@app.post("/api/companies/{company_id}/opportunities/{opportunity_id}/score")
def score(company_id: str, opportunity_id: str) -> dict[str, Any]:
    detail = _opp_detail(opportunity_id)
    if not detail:
        raise HTTPException(404, "not found")
    return detail["score"]


@app.post("/api/companies/{company_id}/workspaces")
def create_workspace(company_id: str) -> dict[str, str]:
    return {"workspace_id": "demo-workspace-1"}


@app.get("/api/workspaces/{workspace_id}")
def get_workspace(workspace_id: str) -> dict[str, Any]:
    return {
        "workspace": {
            "id": workspace_id,
            "name": "Demo Bid Workspace",
            "status": "draft",
            "opportunity_id": "opp-001",
            "opportunity_title": DEMO_OPPS[0]["title"],
            "opportunity_url": DEMO_OPPS[0]["url"],
            "response_deadline": DEMO_OPPS[0]["response_deadline"],
        },
        "proposals": [],
    }


@app.get("/api/workspaces/{workspace_id}/compliance")
def list_compliance(workspace_id: str) -> dict[str, list]:
    return {"items": []}


@app.get("/api/workspaces/{workspace_id}/compliance/ready")
def compliance_ready(workspace_id: str) -> dict[str, Any]:
    return {"ready": False, "open_items": 0, "unsigned_attestations": 0}
