"""Demo serverless API for AutoBid on Vercel.

Returns static sample data so the Next.js UI renders without a real backend.
Replace with the real FastAPI app in /autobid/apps/api/ once Postgres,
Anthropic, OpenAI, and SAM.gov keys are wired up (Celery + weasyprint need
non-serverless infra).
"""
import json
import os
import re
import urllib.error
import urllib.request
from datetime import date, timedelta
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AutoBid Demo API", version="0.2.0-demo")


def _iso(days_ahead: int) -> str:
    return (date.today() + timedelta(days=days_ahead)).isoformat()


DEMO_OPPS: List[Dict[str, Any]] = [
    {
        "id": "opp-001",
        "title": "Cloud Migration Services for Veterans Affairs Regional Office",
        "agency": "Department of Veterans Affairs",
        "naics": "541512",
        "set_aside": "SDVOSB",
        "value": 480000,
        "response_deadline": _iso(5),
        "url": "https://sam.gov/opp/demo-001",
        "total_score": 87,
        "recommended": True,
        "rationale": "Strong NAICS match, agency past performance, and a comfortable timeline.",
        "stage": "qualified",
        "type": "Contract",
    },
    {
        "id": "opp-002",
        "title": "Cybersecurity Assessment and Authorization (A&A) Support",
        "agency": "Department of Homeland Security",
        "naics": "541519",
        "set_aside": "Small Business",
        "value": 320000,
        "response_deadline": _iso(12),
        "url": "https://sam.gov/opp/demo-002",
        "total_score": 79,
        "recommended": True,
        "rationale": "Aligned with cyber capability statement; CMMC L2 is a plus.",
        "stage": "proposal_ready",
        "type": "Contract",
    },
    {
        "id": "opp-003",
        "title": "Data Analytics Platform Modernization — Department of Energy",
        "agency": "Department of Energy",
        "naics": "541511",
        "set_aside": None,
        "value": 750000,
        "response_deadline": _iso(3),
        "url": "https://sam.gov/opp/demo-003",
        "total_score": 71,
        "recommended": True,
        "rationale": "Tight deadline but strong technical fit.",
        "stage": "enriched",
        "type": "Contract",
    },
    {
        "id": "opp-004",
        "title": "AI / ML Research Support — DARPA",
        "agency": "DARPA",
        "naics": "541715",
        "set_aside": None,
        "value": 1200000,
        "response_deadline": _iso(21),
        "url": "https://sam.gov/opp/demo-004",
        "total_score": 64,
        "recommended": False,
        "rationale": "Adjacent NAICS; weak past performance signal.",
        "stage": "new",
        "type": "Contract",
    },
    {
        "id": "opp-005",
        "title": "Help Desk and End-User Support Services",
        "agency": "General Services Administration",
        "naics": "541513",
        "set_aside": "8(a)",
        "value": 220000,
        "response_deadline": _iso(30),
        "url": "https://sam.gov/opp/demo-005",
        "total_score": 58,
        "recommended": False,
        "rationale": "Lower-margin support work, not a strategic fit.",
        "stage": "not_fit",
        "type": "Contract",
    },
    {
        "id": "opp-006",
        "title": "DevSecOps Platform — Air Force Software Factory",
        "agency": "Department of the Air Force",
        "naics": "541512",
        "set_aside": "Small Business",
        "value": 540000,
        "response_deadline": _iso(8),
        "url": "https://sam.gov/opp/demo-006",
        "total_score": 82,
        "recommended": True,
        "rationale": "Excellent NAICS + agency fit; pipeline experience matches.",
        "stage": "submitted",
        "type": "Contract",
    },
    {
        "id": "opp-007",
        "title": "Grant: Small Business Innovation Research Phase II",
        "agency": "National Science Foundation",
        "naics": "541715",
        "set_aside": "Small Business",
        "value": 1500000,
        "response_deadline": _iso(45),
        "url": "https://grants.gov/opp/demo-007",
        "total_score": 76,
        "recommended": True,
        "rationale": "SBIR Phase I awarded — Phase II is a natural progression.",
        "stage": "qualified",
        "type": "Grant",
    },
    {
        "id": "opp-008",
        "title": "Translation Services for State Department Diplomatic Documents",
        "agency": "State Department",
        "naics": "541930",
        "set_aside": "Set_aside",
        "value": 75000,
        "response_deadline": _iso(11),
        "url": "https://sam.gov/opp/demo-008",
        "total_score": 35,
        "recommended": False,
        "rationale": "NAICS mismatch.",
        "stage": "not_fit",
        "type": "Contract",
    },
]


def _opp_detail(opp_id: str) -> Optional[Dict[str, Any]]:
    base = next((o for o in DEMO_OPPS if o["id"] == opp_id), None)
    if not base:
        return None
    return {
        "opportunity": {
            "id": base["id"],
            "source": "SAM.gov (demo)",
            "type": base["type"],
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


# ---------- existing routes (kept for the dashboard/feed) ----------

@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "mode": "demo"}


@app.get("/api/companies/{company_id}/feed")
def feed(company_id: str, min_score: int = 0, limit: int = 100) -> Dict[str, Any]:
    items = [o for o in DEMO_OPPS if (o["total_score"] or 0) >= min_score][:limit]
    return {"items": items}


@app.get("/api/companies/{company_id}/opportunities/{opportunity_id}")
def opportunity_detail(company_id: str, opportunity_id: str) -> Dict[str, Any]:
    detail = _opp_detail(opportunity_id)
    if not detail:
        raise HTTPException(404, "not found")
    return detail


@app.get("/api/opportunities/{opportunity_id}/summary")
def summary(opportunity_id: str) -> Dict[str, str]:
    base = next((o for o in DEMO_OPPS if o["id"] == opportunity_id), None)
    if not base:
        raise HTTPException(404, "not found")
    text = (
        f"{base['title']} is a federal opportunity in NAICS {base['naics']}. "
        f"The set-aside is {base['set_aside'] or 'unrestricted'}. "
        f"Estimated value is ${base['value']:,}. "
        f"Responses are due {base['response_deadline']}. "
        f"The biggest consideration is timeline — confirm staffing before bidding."
    )
    return {"summary": text}


@app.post("/api/companies/{company_id}/opportunities/{opportunity_id}/score")
def score(company_id: str, opportunity_id: str) -> Dict[str, Any]:
    detail = _opp_detail(opportunity_id)
    if not detail:
        raise HTTPException(404, "not found")
    return detail["score"]


@app.post("/api/companies/{company_id}/workspaces")
def create_workspace(company_id: str) -> Dict[str, str]:
    return {"workspace_id": "demo-workspace-1"}


@app.get("/api/workspaces/{workspace_id}")
def get_workspace(workspace_id: str) -> Dict[str, Any]:
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
def list_compliance(workspace_id: str) -> Dict[str, list]:
    return {"items": []}


@app.get("/api/workspaces/{workspace_id}/compliance/ready")
def compliance_ready(workspace_id: str) -> Dict[str, Any]:
    return {"ready": False, "open_items": 0, "unsigned_attestations": 0}


# ---------- pipeline ----------

STAGE_LABELS = {
    "new": "New",
    "enriched": "Data Enriched",
    "qualified": "Qualified",
    "proposal_ready": "Proposal Ready",
    "submitted": "Submitted",
    "not_fit": "Not a Fit",
}


@app.get("/api/pipeline")
def pipeline(stage: Optional[str] = None, q: Optional[str] = None) -> Dict[str, Any]:
    items = list(DEMO_OPPS)
    if stage and stage != "all":
        items = [o for o in items if o["stage"] == stage]
    if q:
        ql = q.lower()
        items = [o for o in items if ql in o["title"].lower() or ql in (o["agency"] or "").lower()]
    return {
        "items": items,
        "stage_labels": STAGE_LABELS,
        "counts": {s: sum(1 for o in DEMO_OPPS if o["stage"] == s) for s in STAGE_LABELS},
        "totals": {
            "value": sum(o["value"] or 0 for o in items),
            "qualified": sum(1 for o in items if o["stage"] == "qualified"),
            "submitted": sum(1 for o in items if o["stage"] == "submitted"),
            "due_this_week": sum(
                1 for o in items
                if o["response_deadline"]
                and 0 <= (date.fromisoformat(o["response_deadline"]) - date.today()).days <= 7
            ),
        },
    }


# ---------- add opportunity ----------

class OpportunityIn(BaseModel):
    title: str
    agency: str
    url: str
    type: str = "Contract"
    value: Optional[int] = None
    due_date: Optional[str] = None
    naics: Optional[str] = None
    description: Optional[str] = None
    contact: Optional[str] = None


@app.post("/api/opportunities")
def create_opportunity(body: OpportunityIn) -> Dict[str, Any]:
    return {
        "id": f"opp-new-{abs(hash(body.title)) % 10000:04d}",
        "status": "queued",
        "message": "Opportunity queued for Deep-Dive Data Scraper. AI processing will begin shortly.",
    }


# ---------- agents ----------

AGENTS = [
    {
        "id": "scraper",
        "name": "Deep-Dive Data Scraper",
        "role": "Data Extraction Specialist",
        "status": "active",
        "tasks_completed": 47,
        "last_active": "2 hours ago",
        "description": "Pulls solicitation details, attachments, and Q&A from SAM.gov, Grants.gov, and USAspending.",
    },
    {
        "id": "qualifier",
        "name": "Qualification Analyst",
        "role": "Opportunity Evaluator",
        "status": "processing",
        "tasks_completed": 23,
        "last_active": "30 minutes ago",
        "description": "Scores opportunities against your NAICS, certifications, past performance, and strategic fit.",
    },
    {
        "id": "writer",
        "name": "Grant & Proposal Writer",
        "role": "Content Generation Expert",
        "status": "idle",
        "tasks_completed": 15,
        "last_active": "1 hour ago",
        "description": "Drafts proposal sections from approved vault language. Flags missing facts as [NEEDS HUMAN INPUT].",
    },
    {
        "id": "coordinator",
        "name": "Submission Coordinator",
        "role": "Process Manager",
        "status": "active",
        "tasks_completed": 31,
        "last_active": "15 minutes ago",
        "description": "Tracks compliance items, attestations, and the gated export workflow.",
    },
]


@app.get("/api/agents")
def list_agents() -> Dict[str, Any]:
    return {
        "agents": AGENTS,
        "performance": {
            "total_tasks": sum(a["tasks_completed"] for a in AGENTS),
            "active": sum(1 for a in AGENTS if a["status"] == "active"),
            "processing": sum(1 for a in AGENTS if a["status"] == "processing"),
        },
    }


# ---------- analytics ----------

@app.get("/api/analytics")
def analytics() -> Dict[str, Any]:
    return {
        "headline": {
            "total_opportunities": 47,
            "qualification_rate": 52.3,
            "win_rate": 23.5,
            "total_pipeline_value": 2_500_000,
            "deltas": {
                "total_opportunities": "+18%",
                "qualification_rate": "+5.2%",
                "win_rate": "-2.1%",
                "total_pipeline_value": "+32%",
            },
        },
        "trends": [
            {"week": "Week 1", "total": 8, "qualified": 4, "submitted": 2},
            {"week": "Week 2", "total": 12, "qualified": 7, "submitted": 3},
            {"week": "Week 3", "total": 15, "qualified": 8, "submitted": 5},
            {"week": "Week 4", "total": 12, "qualified": 6, "submitted": 4},
        ],
        "status_distribution": [
            {"label": "New", "count": 8, "pct": 17.0, "tone": "ink"},
            {"label": "Enriched", "count": 6, "pct": 12.8, "tone": "brass"},
            {"label": "Qualified", "count": 12, "pct": 25.5, "tone": "good"},
            {"label": "Proposal Generated", "count": 8, "pct": 17.0, "tone": "brass"},
            {"label": "Submitted", "count": 5, "pct": 10.6, "tone": "warn"},
            {"label": "Not a Fit", "count": 8, "pct": 17.0, "tone": "bad"},
        ],
        "by_agency": [
            {"name": "Department of Defense", "count": 12, "value": 850_000},
            {"name": "GSA", "count": 8, "value": 420_000},
            {"name": "Department of Commerce", "count": 6, "value": 380_000},
            {"name": "EPA", "count": 5, "value": 290_000},
            {"name": "Other", "count": 16, "value": 510_000},
        ],
        "top_naics": [
            {"code": "541519", "label": "Other Computer Related Services", "count": 15},
            {"code": "541511", "label": "Custom Computer Programming", "count": 12},
            {"code": "541611", "label": "Management Consulting", "count": 8},
            {"code": "541613", "label": "Marketing Consulting", "count": 6},
            {"code": "518210", "label": "Data Processing Services", "count": 6},
        ],
        "agent_performance": [
            {"name": "Deep-Dive Data Scraper", "tasks": 47, "avg_time_min": 12},
            {"name": "Qualification Analyst", "tasks": 23, "avg_time_min": 8},
            {"name": "Grant & Proposal Writer", "tasks": 15, "avg_time_min": 45},
            {"name": "Submission Coordinator", "tasks": 31, "avg_time_min": 15},
        ],
    }


# ---------- system health ----------

@app.get("/api/system/health")
def system_health() -> Dict[str, Any]:
    return {
        "updated_at": _iso(0) + "T08:00:31Z",
        "metrics": [
            {"label": "System Uptime", "value": "99.8%", "target": "99.5%", "tone": "good"},
            {"label": "Processing Success Rate", "value": "94.2%", "target": "95%", "tone": "warn"},
            {"label": "Website Extraction Success", "value": "96.8%", "target": "95%", "tone": "good"},
            {"label": "AI Qualification Accuracy", "value": "91.5%", "target": "90%", "tone": "good"},
            {"label": "Proposal Generation Rate", "value": "88.3%", "target": "85%", "tone": "good"},
            {"label": "Average Processing Time", "value": "4.2 min", "target": "5 min", "tone": "good"},
            {"label": "Active Errors", "value": "3", "target": "0", "tone": "warn"},
            {"label": "Queue Backlog", "value": "0", "target": "0", "tone": "good"},
        ],
        "components": [
            {"name": "SAM.gov Integration", "status": "healthy"},
            {"name": "Grants.gov Integration", "status": "healthy"},
            {"name": "Postgres / Supabase", "status": "healthy"},
            {"name": "LLM Provider (Anthropic)", "status": "warning"},
            {"name": "Embedding Provider (OpenAI)", "status": "healthy"},
            {"name": "Celery Worker / Beat", "status": "healthy"},
        ],
        "recent_errors": [
            {
                "title": "Website Extraction Failed",
                "context": "AI Platform Development Contract",
                "detail": "Connection timeout after 30 seconds",
                "severity": "medium",
                "state": "in_progress",
                "when": "2 hours ago",
                "retries": 2,
            },
            {
                "title": "AI Processing Error",
                "context": "Data Analytics Services",
                "detail": "AI model returned invalid response format",
                "severity": "high",
                "state": "new",
                "when": "4 hours ago",
                "retries": 1,
            },
            {
                "title": "Webhook Timeout",
                "context": "Slack notifier",
                "detail": "Webhook receiver did not respond in 10s",
                "severity": "low",
                "state": "resolved",
                "when": "1 day ago",
                "retries": 3,
            },
        ],
    }


# ---------- dashboard rollups ----------

@app.get("/api/dashboard/kpis")
def dashboard_kpis() -> Dict[str, Any]:
    return {
        "total_opportunities": 47,
        "qualified": 23,
        "proposals_generated": 15,
        "submitted": 8,
        "total_pipeline_value": 2_500_000,
        "win_rate": 32.5,
        "deltas": {
            "total_opportunities": "+12%",
            "qualified": "+8%",
            "proposals_generated": "+15%",
            "submitted": "+5%",
            "total_pipeline_value": "+22%",
            "win_rate": "+3.2%",
        },
        "pipeline_stages": [
            {"stage": "new", "label": "New Opportunities", "count": 47, "tone": "ink"},
            {"stage": "enriched", "label": "Data Enriched", "count": 35, "tone": "brass"},
            {"stage": "qualified", "label": "Qualified", "count": 23, "tone": "good"},
            {"stage": "proposal_ready", "label": "Proposal Generated", "count": 15, "tone": "brass"},
            {"stage": "submitted", "label": "Submitted", "count": 8, "tone": "warn"},
            {"stage": "awarded", "label": "Awarded", "count": 3, "tone": "good"},
        ],
        "conversion_rate": 6.4,
    }


@app.get("/api/activity")
def activity() -> Dict[str, Any]:
    return {
        "events": [
            {
                "id": "evt-1",
                "kind": "opportunity_detected",
                "title": "New opportunity detected",
                "detail": "AI Development Services — Department of Defense",
                "when": "2 minutes ago",
            },
            {
                "id": "evt-2",
                "kind": "qualified",
                "title": "Qualification analysis completed",
                "detail": "Cybersecurity Consulting — DHS marked as Qualified",
                "when": "15 minutes ago",
            },
            {
                "id": "evt-3",
                "kind": "proposal_generated",
                "title": "Proposal generated",
                "detail": "Data Analytics Platform — EPA capability statement created",
                "when": "1 hour ago",
            },
            {
                "id": "evt-4",
                "kind": "agent_processed",
                "title": "AI Agent processed opportunity",
                "detail": "Deep-Dive Scraper extracted details from 3 new opportunities",
                "when": "2 hours ago",
            },
            {
                "id": "evt-5",
                "kind": "manual_review",
                "title": "Manual review required",
                "detail": "Cloud Migration Services — VA needs human evaluation",
                "when": "3 hours ago",
            },
            {
                "id": "evt-6",
                "kind": "submitted",
                "title": "Proposal submitted",
                "detail": "Software Development — NASA proposal successfully submitted",
                "when": "5 hours ago",
            },
        ]
    }


# ---------- chat assistant ----------

class ChatMsg(BaseModel):
    role: str
    content: str


class ChatIn(BaseModel):
    messages: List[ChatMsg]


def _route_hint(text: str) -> Optional[str]:
    t = text.lower()
    if any(k in t for k in ["pipeline", "stage", "kanban"]):
        return "Take me to → /pipeline"
    if any(k in t for k in ["agent", "scraper", "writer", "coordinator"]):
        return "Take me to → /agents"
    if any(k in t for k in ["analytic", "trend", "metric", "win rate"]):
        return "Take me to → /analytics"
    if any(k in t for k in ["add", "new opportunity", "submit url"]):
        return "Take me to → /add-opportunity"
    if any(k in t for k in ["health", "uptime", "error"]):
        return "Take me to → /health"
    return None


SYSTEM_PROMPT = (
    "You are the AutoBid copilot — a human-gated government contract bidding "
    "and grant submission assistant. Be concise (3-6 short paragraphs max), "
    "factual, and never invent solicitation numbers, certifications, or "
    "pricing. Defer pricing, attestations, and final submission to the human. "
    "When relevant, suggest the user navigate to /pipeline, /analytics, "
    "/agents, /add-opportunity, or /health."
)


def _try_anthropic(messages: List[Dict[str, str]]) -> Optional[str]:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        from anthropic import Anthropic
        model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        client = Anthropic(api_key=key)
        resp = client.messages.create(
            model=model,
            max_tokens=600,
            system=SYSTEM_PROMPT,
            messages=[{"role": m["role"], "content": m["content"]} for m in messages if m["role"] in ("user", "assistant")],
        )
        parts = [b.text for b in resp.content if getattr(b, "type", "") == "text"]
        return "\n".join(parts).strip() or None
    except Exception:
        return None


@app.post("/api/chat")
def chat(body: ChatIn) -> Dict[str, str]:
    last_user = next((m.content for m in reversed(body.messages) if m.role == "user"), "")
    if not last_user:
        return {"reply": "Ask me anything about your pipeline."}

    live = _try_anthropic([{"role": m.role, "content": m.content} for m in body.messages])
    if live:
        hint = _route_hint(last_user)
        return {"reply": f"{live}\n\n{hint}" if hint else live}

    hint = _route_hint(last_user)
    summary_text = (
        "Here's a quick read on your pipeline:\n\n"
        "• 47 total opportunities, 23 qualified (52% qualification rate)\n"
        "• $2.5M total pipeline value (+32% MoM)\n"
        "• 15 proposals generated, 8 submitted, 3 awarded\n"
        "• Highest-fit right now: Cloud Migration Services (VA) — score 87, due in 5 days\n"
        "• Watch-out: Data Analytics Platform (DOE) closes in 3 days — confirm staffing"
    )

    lower = last_user.lower()
    if "summarize" in lower or "summary" in lower or "pipeline" in lower:
        reply = summary_text
    elif "prioritize" in lower or "priority" in lower or "this week" in lower:
        reply = (
            "Three to prioritize this week:\n\n"
            "1. Cloud Migration Services (VA) — score 87, SDVOSB set-aside, due in 5 days\n"
            "2. DevSecOps Platform (USAF) — score 82, due in 8 days\n"
            "3. Data Analytics Platform (DOE) — score 71, due in 3 days — tight timeline"
        )
    elif "blocking" in lower or "blocked" in lower:
        reply = (
            "Two drafts are blocked:\n\n"
            "• Cybersecurity A&A — 3 [NEEDS HUMAN INPUT] flags on pricing and CMMC certs\n"
            "• Cloud Migration — past-performance citations not yet approved in the vault"
        )
    elif "capability statement" in lower or "draft" in lower:
        reply = (
            "Draft outline (you'll edit + approve before anything is final):\n\n"
            "• Corporate overview & UEI/CAGE\n"
            "• Core competencies (cloud, DevSecOps, cyber)\n"
            "• Differentiators (SDVOSB, CMMC L2, FedRAMP)\n"
            "• Past performance — pull 3 from approved vault\n"
            "• NAICS codes & contact\n\n"
            "Want me to pre-fill from your vault?"
        )
    else:
        reply = (
            f"I heard: “{last_user}”.\n\n"
            "In demo mode I can summarize the pipeline, suggest priorities, surface "
            "blocked drafts, or draft a capability statement. Once the real backend is "
            "wired up, I'll have full read/write access to your opportunities."
        )

    if hint:
        reply = f"{reply}\n\n{hint}"
    return {"reply": reply}


# ---------- NAICS suggestion from company websites ----------

class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: List[str] = []
        self._skip = 0

    def handle_starttag(self, tag: str, attrs: Any) -> None:
        if tag in ("script", "style", "noscript", "svg"):
            self._skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in ("script", "style", "noscript", "svg") and self._skip > 0:
            self._skip -= 1

    def handle_data(self, data: str) -> None:
        if self._skip:
            return
        s = data.strip()
        if s:
            self.parts.append(s)


def _fetch_text(url: str, max_chars: int = 8000) -> str:
    if not re.match(r"^https?://", url):
        url = "https://" + url
    req = urllib.request.Request(url, headers={
        "User-Agent": "AutoBid/0.1 (+https://auto-bid-smoky.vercel.app)",
        "Accept": "text/html,application/xhtml+xml",
    })
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = resp.read(200_000).decode("utf-8", errors="ignore")
    parser = _TextExtractor()
    try:
        parser.feed(raw)
    except Exception:
        pass
    text = " ".join(parser.parts)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars]


def _stub_naics_suggestions(websites: List[str]) -> List[Dict[str, Any]]:
    joined = " ".join(websites).lower()
    looks_ai = any(k in joined for k in ["ai", "ml", "intelligen"])
    looks_digital = any(k in joined for k in ["digital", "market", "agency", "media"])
    base = [
        {"code": "541613", "label": "Marketing Consulting Services",
         "confidence": 0.92 if looks_digital else 0.7,
         "rationale": "Digital marketing strategy and consulting services."},
        {"code": "541810", "label": "Advertising Agencies",
         "confidence": 0.85 if looks_digital else 0.55,
         "rationale": "Creative and paid-media advertising work."},
        {"code": "541511", "label": "Custom Computer Programming Services",
         "confidence": 0.88 if looks_ai else 0.75,
         "rationale": "Custom software and AI-enabled application development."},
        {"code": "541512", "label": "Computer Systems Design Services",
         "confidence": 0.82,
         "rationale": "Systems integration and platform design."},
        {"code": "541519", "label": "Other Computer Related Services",
         "confidence": 0.78,
         "rationale": "Catch-all for IT services not covered elsewhere; common on federal awards."},
        {"code": "518210", "label": "Data Processing, Hosting, and Related Services",
         "confidence": 0.7 if looks_ai else 0.55,
         "rationale": "Hosted AI/data services delivery."},
        {"code": "541715", "label": "R&D in Physical, Engineering, and Life Sciences",
         "confidence": 0.65 if looks_ai else 0.4,
         "rationale": "Applied AI R&D for federal sponsors (DARPA, DoD)."},
        {"code": "611420", "label": "Computer Training",
         "confidence": 0.5,
         "rationale": "AI / digital marketing training and enablement engagements."},
    ]
    return sorted(base, key=lambda x: -x["confidence"])


class SuggestNaicsIn(BaseModel):
    urls: List[str]
    company_name: Optional[str] = None
    description: Optional[str] = None


@app.post("/api/suggest-naics")
def suggest_naics(body: SuggestNaicsIn) -> Dict[str, Any]:
    urls = [u for u in body.urls if u and u.strip()]
    if not urls:
        raise HTTPException(status_code=400, detail="At least one URL is required")

    fetched: List[Dict[str, str]] = []
    errors: List[str] = []
    for u in urls[:4]:
        try:
            fetched.append({"url": u, "text": _fetch_text(u)})
        except (urllib.error.URLError, TimeoutError, ValueError) as e:
            errors.append(f"{u}: {type(e).__name__}")

    live = _try_naics_anthropic(body.company_name or "", body.description or "", fetched)
    if live:
        return {"suggestions": live, "errors": errors, "source": "anthropic", "fetched": [f["url"] for f in fetched]}

    return {
        "suggestions": _stub_naics_suggestions(urls),
        "errors": errors,
        "source": "stub",
        "fetched": [f["url"] for f in fetched],
    }


def _try_naics_anthropic(name: str, desc: str, fetched: List[Dict[str, str]]) -> Optional[List[Dict[str, Any]]]:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        from anthropic import Anthropic
        model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        client = Anthropic(api_key=key)
        context = "\n\n".join(f"=== {f['url']} ===\n{f['text']}" for f in fetched) or "(no fetched content)"
        prompt = (
            f"Company name: {name or 'unknown'}\n"
            f"Self-description: {desc or 'unknown'}\n\n"
            f"Website content excerpts:\n{context}\n\n"
            "Return a JSON array of NAICS code suggestions for this company in the U.S. "
            "federal contracting context. Each item must have keys: code (6-digit string), "
            "label (official NAICS title), confidence (0-1), rationale (1 sentence). "
            "Return 5-8 codes, ordered by confidence descending. Output ONLY the JSON array."
        )
        resp = client.messages.create(
            model=model,
            max_tokens=1500,
            system="You are a U.S. federal contracting NAICS code expert. Output valid JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
        text = "\n".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(0))
        out: List[Dict[str, Any]] = []
        for item in data:
            if not isinstance(item, dict):
                continue
            code = str(item.get("code", "")).strip()
            if not re.match(r"^\d{4,6}$", code):
                continue
            out.append({
                "code": code,
                "label": str(item.get("label", "")).strip(),
                "confidence": float(item.get("confidence", 0.5)),
                "rationale": str(item.get("rationale", "")).strip(),
            })
        return out or None
    except Exception:
        return None


# ---------- AI document generation for the vault ----------

DOC_KIND_PROMPTS: Dict[str, str] = {
    "Capability statement": (
        "Draft a 1-page federal capability statement in Markdown. Sections: "
        "Corporate Overview, Core Competencies, Differentiators, Past Performance "
        "(placeholders), NAICS Codes, Set-Asides, Contact. Mark any unknowns as "
        "[NEEDS HUMAN INPUT]. Use only what's provided — do not invent numbers, "
        "UEI/CAGE codes, certifications, or contract values."
    ),
    "Past performance": (
        "Draft a past-performance summary template in Markdown with 3 placeholder "
        "engagements. Each: client, period, value, scope, results. Mark every "
        "specific fact as [NEEDS HUMAN INPUT]."
    ),
    "Key personnel resumes": (
        "Draft a key-personnel one-pager template in Markdown for 2 placeholder "
        "team members. Sections per person: role, clearance, education, "
        "certifications, relevant experience. All facts marked [NEEDS HUMAN INPUT]."
    ),
    "Certifications (8(a)/WOSB/SDVOSB)": (
        "Draft a certifications register in Markdown listing common federal "
        "small-business certifications (8(a), WOSB, EDWOSB, HUBZone, SDVOSB, "
        "VOSB) with a checkbox per item and an [Active / Expired / N/A] field. "
        "Do not assume which the company holds."
    ),
    "Financials": (
        "Draft a financial overview template in Markdown. Sections: revenue last "
        "3 FY, profitability, DCAA-compliance status, bonding capacity, banking "
        "reference. All values [NEEDS HUMAN INPUT]."
    ),
    "SAM / registration": (
        "Draft a SAM.gov registration checklist in Markdown: UEI, CAGE, NAICS "
        "primary + secondaries, set-asides, POCs, banking info, reps & certs "
        "(FAR 52.204-26), small-business size status, expiration date. Mark all "
        "values [NEEDS HUMAN INPUT]."
    ),
    "Reusable templates": (
        "Draft a reusable proposal-language template index in Markdown with "
        "8-12 commonly-reused blocks (e.g., 'Company Background', 'Quality "
        "Assurance Approach', 'Risk Management Plan'). For each block, one "
        "sentence describing when to use it."
    ),
}


def _stub_doc_markdown(kind: str, profile: Dict[str, Any]) -> str:
    name = profile.get("name") or "[NEEDS HUMAN INPUT]"
    email = profile.get("email") or "[NEEDS HUMAN INPUT]"
    websites = ", ".join(profile.get("websites") or []) or "[NEEDS HUMAN INPUT]"
    description = profile.get("description") or "[NEEDS HUMAN INPUT]"
    naics_lines = "\n".join(
        f"- **{n['code']}** — {n.get('label', '')}"
        for n in (profile.get("naics") or []) if n.get("on")
    ) or "- [NEEDS HUMAN INPUT]"

    if kind == "Capability statement":
        return (
            f"# {name} — Capability Statement\n\n"
            f"**Website:** {websites}  \n"
            f"**Contact:** {email}\n\n"
            "## Corporate Overview\n"
            f"{description}\n\n"
            "**UEI:** [NEEDS HUMAN INPUT]  \n"
            "**CAGE:** [NEEDS HUMAN INPUT]\n\n"
            "## Core Competencies\n"
            "- [NEEDS HUMAN INPUT — list 4-6 core service lines]\n\n"
            "## Differentiators\n"
            "- [NEEDS HUMAN INPUT — what makes you the choice?]\n\n"
            "## Past Performance\n"
            "1. [NEEDS HUMAN INPUT — client, period, value, outcome]\n"
            "2. [NEEDS HUMAN INPUT]\n"
            "3. [NEEDS HUMAN INPUT]\n\n"
            "## NAICS Codes\n"
            f"{naics_lines}\n\n"
            "## Set-Asides\n"
            "- [NEEDS HUMAN INPUT — 8(a), WOSB, SDVOSB, HUBZone?]\n\n"
            "## Contact\n"
            f"- {email}\n"
        )
    base = DOC_KIND_PROMPTS.get(kind, "Draft a one-page Markdown document.")
    return (
        f"# {kind} — {name}\n\n"
        f"> **Stub draft.** Wire `ANTHROPIC_API_KEY` (and add `anthropic` to "
        f"`api/requirements.txt`) for AI-authored drafts.\n\n"
        f"_Prompt that will be sent to Claude:_\n\n> {base}\n\n"
        "## Replace this section\n- [NEEDS HUMAN INPUT]\n"
    )


class GenerateDocIn(BaseModel):
    kind: str
    profile: Dict[str, Any]


@app.post("/api/generate-doc")
def generate_doc(body: GenerateDocIn) -> Dict[str, Any]:
    if body.kind not in DOC_KIND_PROMPTS:
        raise HTTPException(status_code=400, detail=f"Unknown doc kind: {body.kind}")
    live = _try_doc_anthropic(body.kind, body.profile)
    if live:
        return {"markdown": live, "source": "anthropic"}
    return {"markdown": _stub_doc_markdown(body.kind, body.profile), "source": "stub"}


def _try_doc_anthropic(kind: str, profile: Dict[str, Any]) -> Optional[str]:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        from anthropic import Anthropic
        model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        client = Anthropic(api_key=key)
        profile_json = json.dumps(profile, indent=2)
        prompt = (
            f"{DOC_KIND_PROMPTS[kind]}\n\n"
            f"Company profile (JSON):\n```json\n{profile_json}\n```\n\n"
            "Output ONLY the Markdown document — no preamble, no code fences around the result."
        )
        resp = client.messages.create(
            model=model,
            max_tokens=2500,
            system="You draft government-contracting documents. Mark unknowns as [NEEDS HUMAN INPUT]. Never invent numbers, certifications, UEI/CAGE, or contract values.",
            messages=[{"role": "user", "content": prompt}],
        )
        text = "\n".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        return text or None
    except Exception:
        return None


# ---------- on-demand URL scrape (Firecrawl-style, stdlib) ----------

class ScrapeIn(BaseModel):
    url: str


@app.post("/api/scrape")
def scrape_url(body: ScrapeIn) -> Dict[str, Any]:
    try:
        text = _fetch_text(body.url, max_chars=20000)
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch {body.url}: {type(e).__name__}")
    summary = _try_scrape_anthropic(body.url, text)
    return {"url": body.url, "text": text, "summary": summary, "source": "anthropic" if summary else "raw"}


def _try_scrape_anthropic(url: str, text: str) -> Optional[Dict[str, Any]]:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key or not text:
        return None
    try:
        from anthropic import Anthropic
        model = os.environ.get("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001")
        client = Anthropic(api_key=key)
        prompt = (
            f"Page URL: {url}\n\nPage text (truncated):\n{text[:12000]}\n\n"
            "If this looks like a federal contracting opportunity or grant, "
            "extract a JSON object with keys: title, agency, naics (string or null), "
            "set_aside (string or null), value (number or null), response_deadline "
            "(YYYY-MM-DD or null), description, contact (string or null). "
            "If this is NOT an opportunity, return {\"is_opportunity\": false}. "
            "Output ONLY JSON."
        )
        resp = client.messages.create(
            model=model,
            max_tokens=900,
            system="You extract structured opportunity data from federal contracting pages. Output valid JSON only.",
            messages=[{"role": "user", "content": prompt}],
        )
        out = "\n".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
        match = re.search(r"\{.*\}", out, re.DOTALL)
        if not match:
            return None
        return json.loads(match.group(0))
    except Exception:
        return None

