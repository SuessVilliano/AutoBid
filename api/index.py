"""Demo serverless API for AutoBid on Vercel.

Returns static sample data so the Next.js UI renders without a real backend.
Replace with the real FastAPI app in /autobid/apps/api/ once Postgres,
Anthropic, OpenAI, and SAM.gov keys are wired up (Celery + weasyprint need
non-serverless infra).
"""
import ipaddress
import json
import os
import re
import socket
import urllib.error
import urllib.parse
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
    # Pipeline is empty until the user pulls opportunities from the Feed into
    # workspaces. Tracking workspace state per-user is a follow-up build.
    _ = stage, q
    return {
        "items": [],
        "stage_labels": STAGE_LABELS,
        "counts": {s: 0 for s in STAGE_LABELS},
        "totals": {"value": 0, "qualified": 0, "submitted": 0, "due_this_week": 0},
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
    # Agent definitions are real product features. Counts/status will become
    # real when the worker queue lands; until then report honest zeros.
    agents = [
        {**a, "status": "idle", "tasks_completed": 0, "last_active": "—"}
        for a in AGENTS
    ]
    return {
        "agents": agents,
        "performance": {"total_tasks": 0, "active": 0, "processing": 0},
    }


# ---------- analytics ----------

@app.get("/api/analytics")
def analytics() -> Dict[str, Any]:
    return {
        "headline": {
            "total_opportunities": 0,
            "qualification_rate": 0.0,
            "win_rate": 0.0,
            "total_pipeline_value": 0,
            "deltas": {},
        },
        "trends": [],
        "status_distribution": [],
        "by_agency": [],
        "top_naics": [],
        "agent_performance": [],
    }


# ---------- system health ----------

@app.get("/api/system/health")
def system_health() -> Dict[str, Any]:
    """Reports real-ish config status based on which integrations have keys
    set. No fabricated uptime / error history."""
    def _comp(name: str, ok: bool, missing_hint: str) -> Dict[str, str]:
        return {
            "name": name,
            "status": "healthy" if ok else "warning",
            "detail": "configured" if ok else missing_hint,
        }

    sam_ok = bool(os.environ.get("SAM_GOV_API_KEY") or os.environ.get("SAM_API_KEY"))
    anth_ok = bool(os.environ.get("ANTHROPIC_API_KEY"))
    supa_ok = bool(os.environ.get("NEXT_PUBLIC_SUPABASE_URL")) and bool(
        os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    )

    return {
        "updated_at": _iso(0),
        "metrics": [
            {"label": "Configured integrations",
             "value": f"{int(sam_ok) + int(anth_ok) + int(supa_ok)}/3",
             "target": "3/3",
             "tone": "good" if (sam_ok and anth_ok and supa_ok) else "warn"},
        ],
        "components": [
            _comp("SAM.gov", sam_ok, "set SAM_GOV_API_KEY in Vercel"),
            _comp("Supabase (auth + DB)", supa_ok, "set NEXT_PUBLIC_SUPABASE_URL + _ANON_KEY"),
            _comp("LLM provider (Anthropic)", anth_ok, "set ANTHROPIC_API_KEY for live AI"),
        ],
        "recent_errors": [],
    }


# ---------- dashboard rollups ----------

@app.get("/api/dashboard/kpis")
def dashboard_kpis() -> Dict[str, Any]:
    return {
        "total_opportunities": 0,
        "qualified": 0,
        "proposals_generated": 0,
        "submitted": 0,
        "total_pipeline_value": 0,
        "win_rate": 0.0,
        "deltas": {},
        "pipeline_stages": [
            {"stage": "new", "label": "New Opportunities", "count": 0, "tone": "ink"},
            {"stage": "enriched", "label": "Data Enriched", "count": 0, "tone": "brass"},
            {"stage": "qualified", "label": "Qualified", "count": 0, "tone": "good"},
            {"stage": "proposal_ready", "label": "Proposal Generated", "count": 0, "tone": "brass"},
            {"stage": "submitted", "label": "Submitted", "count": 0, "tone": "warn"},
            {"stage": "awarded", "label": "Awarded", "count": 0, "tone": "good"},
        ],
        "conversion_rate": 0.0,
    }


@app.get("/api/activity")
def activity() -> Dict[str, Any]:
    # Real activity log lands once we wire workspace events into Supabase.
    return {"events": []}


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
    reply = (
        "I'm running without an LLM key right now, so I can only route you "
        "around the app. Set `ANTHROPIC_API_KEY` in Vercel to get real "
        "answers about your pipeline."
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


class _NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Refuse redirects so SSRF validation can't be bypassed by a 30x to an
    internal host."""

    def http_error_301(self, req, fp, code, msg, headers):  # type: ignore[override]
        raise urllib.error.HTTPError(req.full_url, code, "redirects disabled", headers, fp)

    http_error_302 = http_error_301
    http_error_303 = http_error_301
    http_error_307 = http_error_301
    http_error_308 = http_error_301


_NO_REDIRECT_OPENER = urllib.request.build_opener(_NoRedirectHandler)


def _validate_public_url(url: str) -> str:
    """Reject anything that could SSRF: non-http(s) schemes, hosts that
    resolve to private / loopback / link-local / reserved IP space, or
    embedded credentials.

    Returns the normalised URL on success; raises ValueError otherwise.
    """
    if not re.match(r"^https?://", url, re.IGNORECASE):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise ValueError(f"scheme not allowed: {parsed.scheme}")
    if parsed.username or parsed.password:
        raise ValueError("credentials in URL not allowed")

    host = parsed.hostname
    if not host:
        raise ValueError("missing host")

    # Hard-deny common cloud-metadata host literals, even before DNS.
    if host.lower() in {"metadata.google.internal", "metadata", "instance-data"}:
        raise ValueError("host is a cloud metadata service")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise ValueError(f"dns lookup failed: {e}")
    if not infos:
        raise ValueError("dns lookup returned no addresses")

    for info in infos:
        addr = info[4][0]
        # IPv6 scoped addresses include a "%zone"; strip it.
        addr = addr.split("%", 1)[0]
        try:
            ip = ipaddress.ip_address(addr)
        except ValueError:
            raise ValueError(f"could not parse address: {addr}")
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            raise ValueError(f"host resolves to non-public address: {ip}")
    return url


def _fetch_text(url: str, max_chars: int = 8000) -> str:
    safe_url = _validate_public_url(url)
    req = urllib.request.Request(safe_url, headers={
        "User-Agent": "AutoBid/0.1 (+https://auto-bid-smoky.vercel.app)",
        "Accept": "text/html,application/xhtml+xml",
    })
    with _NO_REDIRECT_OPENER.open(req, timeout=8) as resp:
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
        except ValueError as e:
            errors.append(f"{u}: rejected ({e})")
        except (urllib.error.URLError, TimeoutError) as e:
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
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"URL not allowed: {e}")
    except (urllib.error.URLError, TimeoutError) as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch {body.url}: {type(e).__name__}")
    summary = _try_scrape_anthropic(body.url, text)
    return {"url": body.url, "text": text, "summary": summary, "source": "anthropic" if summary else "raw"}


# ---------- SAM.gov opportunity search ----------

class SamSearchIn(BaseModel):
    naics: List[str] = []
    posted_from: Optional[str] = None  # mm/dd/yyyy
    posted_to: Optional[str] = None
    limit: int = 50
    keyword: Optional[str] = None


def _sam_date(days_ago: int) -> str:
    d = date.today() - timedelta(days=days_ago)
    return d.strftime("%m/%d/%Y")


@app.post("/api/sam-search")
def sam_search(body: SamSearchIn) -> Dict[str, Any]:
    key = os.environ.get("SAM_GOV_API_KEY") or os.environ.get("SAM_API_KEY")
    if not key:
        return {
            "items": [],
            "source": "stub",
            "error": "SAM_GOV_API_KEY is not set in Vercel environment variables.",
        }

    params: List[tuple[str, str]] = [
        ("api_key", key),
        ("limit", str(min(max(body.limit, 1), 100))),
        ("postedFrom", body.posted_from or _sam_date(30)),
        ("postedTo", body.posted_to or _sam_date(0)),
    ]
    if body.naics:
        params.append(("ncode", ",".join(body.naics)))
    if body.keyword:
        params.append(("q", body.keyword))

    qs = urllib.parse.urlencode(params)
    url = f"https://api.sam.gov/opportunities/v2/search?{qs}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        data = json.loads(raw)
    except urllib.error.HTTPError as e:
        body_text = ""
        try:
            body_text = e.read().decode("utf-8", errors="ignore")[:400]
        except Exception:
            pass
        return {"items": [], "source": "sam", "error": f"SAM {e.code}: {body_text or e.reason}"}
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        return {"items": [], "source": "sam", "error": f"{type(e).__name__}: {e}"}

    opps = data.get("opportunitiesData") or data.get("_embedded", {}).get("opportunity") or []
    items: List[Dict[str, Any]] = []
    for o in opps:
        items.append(_sam_to_item(o))
    return {
        "items": items,
        "total_records": data.get("totalRecords", len(items)),
        "source": "sam",
        "naics_filter": body.naics,
    }


def _sam_to_item(o: Dict[str, Any]) -> Dict[str, Any]:
    naics_list = o.get("naicsCode") or o.get("naicsCodes") or []
    if isinstance(naics_list, list) and naics_list:
        first = naics_list[0]
        naics_code = first.get("code") if isinstance(first, dict) else str(first)
    elif isinstance(naics_list, dict):
        naics_code = naics_list.get("code")
    else:
        naics_code = str(naics_list) if naics_list else None

    setaside = None
    sa = o.get("typeOfSetAsideDescription") or o.get("typeOfSetAside")
    if sa and sa != "None":
        setaside = sa

    award_val = None
    award = o.get("award") or {}
    if isinstance(award, dict):
        try:
            award_val = int(float(award.get("amount") or 0)) or None
        except (TypeError, ValueError):
            award_val = None

    deadline = o.get("responseDeadLine") or o.get("responseDeadline")
    if deadline and isinstance(deadline, str) and "T" in deadline:
        deadline = deadline.split("T")[0]

    return {
        "id": o.get("noticeId") or o.get("id") or o.get("solicitationNumber"),
        "title": o.get("title") or o.get("subject") or "(no title)",
        "agency": (o.get("fullParentPathName") or o.get("department") or "").split(".")[0],
        "naics": naics_code,
        "set_aside": setaside,
        "value": award_val,
        "response_deadline": deadline,
        "url": o.get("uiLink") or o.get("link") or None,
        "type": o.get("type") or "Contract",
        "posted_date": o.get("postedDate"),
        "description": o.get("description"),
        "raw_source": "sam.gov",
    }


# ---------- Grants.gov opportunity search ----------

class GrantsSearchIn(BaseModel):
    keyword: Optional[str] = None
    agencies: List[str] = []
    eligibilities: List[str] = []
    cfdas: List[str] = []
    limit: int = 50


@app.post("/api/grants-search")
def grants_search(body: GrantsSearchIn) -> Dict[str, Any]:
    """Hit api.grants.gov/v1/api/search2. No API key required."""
    payload: Dict[str, Any] = {
        "rows": min(max(body.limit, 1), 100),
        "keyword": (body.keyword or "").strip(),
        # forecasted = upcoming, posted = currently open
        "oppStatuses": "forecasted|posted",
    }
    if body.agencies:
        payload["agencies"] = "|".join(body.agencies)
    if body.eligibilities:
        payload["eligibilities"] = "|".join(body.eligibilities)
    if body.cfdas:
        payload["cfda"] = "|".join(body.cfdas)

    req = urllib.request.Request(
        "https://api.grants.gov/v1/api/search2",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "AutoBid/0.2 (+https://autobid.liv8.co)",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
        data = json.loads(raw)
    except urllib.error.HTTPError as e:
        msg = ""
        try:
            msg = e.read().decode("utf-8", errors="ignore")[:400]
        except Exception:
            pass
        return {"items": [], "source": "grants", "error": f"Grants {e.code}: {msg or e.reason}"}
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        return {"items": [], "source": "grants", "error": f"{type(e).__name__}: {e}"}

    inner = data.get("data") or {}
    hits = inner.get("oppHits") or []
    items: List[Dict[str, Any]] = []
    for h in hits:
        items.append(_grant_to_item(h))
    return {
        "items": items,
        "total_records": inner.get("hitCount", len(items)),
        "source": "grants",
    }


def _grant_to_item(g: Dict[str, Any]) -> Dict[str, Any]:
    deadline = g.get("closeDate")
    if isinstance(deadline, str):
        # grants.gov returns "MM/DD/YYYY"; normalize to ISO.
        m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", deadline.strip())
        if m:
            deadline = f"{m.group(3)}-{m.group(1)}-{m.group(2)}"

    cfdas = g.get("alnist") or g.get("cfdaList") or []
    cfda_code = None
    if isinstance(cfdas, list) and cfdas:
        cfda_code = cfdas[0] if isinstance(cfdas[0], str) else cfdas[0].get("code")

    opp_id = g.get("id") or g.get("number")
    return {
        "id": str(opp_id) if opp_id else None,
        "title": g.get("title") or "(no title)",
        "agency": g.get("agencyName") or g.get("agencyCode") or "",
        "naics": None,  # grants don't use NAICS
        "cfda": cfda_code,
        "set_aside": None,
        "value": None,  # search2 doesn't include award amounts; details endpoint does
        "response_deadline": deadline,
        "url": f"https://grants.gov/search-results-detail/{opp_id}" if opp_id else None,
        "type": "Grant",
        "posted_date": g.get("openDate"),
        "description": g.get("docType"),
        "raw_source": "grants.gov",
    }


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

