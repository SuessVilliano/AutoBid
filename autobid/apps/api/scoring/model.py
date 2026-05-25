"""scoring/model.py — deterministic 0-100 fit score (Section 6 of the plan).

Pure functions only. The agent layer (agents/scoring_agent.py) gathers the
inputs (NAICS/PSC compare, USAspending signals, RAG past-performance
similarity) and calls score(). The LLM only writes a rationale afterwards;
it never changes the numbers.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

# Weights sum to 100.
WEIGHTS = {
    "naics": 15, "psc": 8, "agency": 10, "location": 7, "past_perf": 15,
    "deadline": 12, "value": 8, "certs": 10, "competition": 8,
    "doc_complexity": 4, "strategic": 3,
}
assert sum(WEIGHTS.values()) == 100


@dataclass
class ScoreInput:
    # opportunity
    opp_naics: Optional[str] = None
    opp_psc: Optional[str] = None
    opp_state: Optional[str] = None
    response_deadline: Optional[datetime] = None
    estimated_value: Optional[float] = None
    set_aside: Optional[str] = None
    attachment_count: int = 0
    # company profile
    profile_naics: list[str] = field(default_factory=list)
    profile_psc: list[str] = field(default_factory=list)
    service_states: list[str] = field(default_factory=list)
    remote_ok: bool = True
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    held_set_asides: list[str] = field(default_factory=list)
    obtainable_set_asides: list[str] = field(default_factory=list)
    # derived signals (0..1), supplied by the agent layer
    past_perf_similarity: float = 0.0     # RAG cosine vs approved past-perf
    agency_relevance: float = 0.0         # from USAspending
    competition: float = 0.0              # from USAspending (higher = better odds)
    effort_tier_days: int = 14            # estimated days of effort to respond
    strategic: float = 0.0                # 0..1 manual flag


def _naics(i: ScoreInput) -> float:
    if not i.opp_naics or not i.profile_naics:
        return 0.0
    o = i.opp_naics
    if o in i.profile_naics:
        return 1.0
    if any(o[:4] == p[:4] for p in i.profile_naics):
        return 0.6
    if any(o[:2] == p[:2] for p in i.profile_naics):
        return 0.3
    return 0.0


def _psc(i: ScoreInput) -> float:
    if not i.opp_psc or not i.profile_psc:
        return 0.0
    if i.opp_psc in i.profile_psc:
        return 1.0
    if any(i.opp_psc[:1] == p[:1] for p in i.profile_psc):
        return 0.5
    return 0.0


def _location(i: ScoreInput) -> float:
    if i.remote_ok:
        return 1.0
    if i.opp_state and i.opp_state in i.service_states:
        return 1.0
    return 0.4 if i.opp_state else 0.0


def _deadline(i: ScoreInput) -> float:
    if not i.response_deadline:
        return 0.5
    now = datetime.now(timezone.utc)
    dl = i.response_deadline
    if dl.tzinfo is None:
        dl = dl.replace(tzinfo=timezone.utc)
    days = (dl - now).total_seconds() / 86400
    if days <= 0:
        return 0.0
    if days < 7:
        return 0.2
    ratio = days / max(i.effort_tier_days, 1)
    return max(0.0, min(1.0, ratio))


def _value(i: ScoreInput) -> float:
    v = i.estimated_value
    if v is None:
        return 0.5
    lo, hi = i.min_value, i.max_value
    if lo is not None and hi is not None:
        if lo <= v <= hi:
            return 1.0
        if v < lo:
            return max(0.0, v / lo) * 0.6
        return max(0.0, hi / v) * 0.6  # taper above ceiling
    return 0.5


def _certs(i: ScoreInput) -> float:
    if not i.set_aside:
        return 1.0
    sa = i.set_aside
    if sa in i.held_set_asides:
        return 1.0
    if sa in i.obtainable_set_asides:
        return 0.4
    return 0.0


def _doc_complexity(i: ScoreInput) -> float:
    # inverse of attachment burden; >10 attachments => heavy
    return max(0.0, 1.0 - (i.attachment_count / 10.0))


def score(i: ScoreInput) -> dict:
    subs = {
        "naics": _naics(i),
        "psc": _psc(i),
        "agency": max(0.0, min(1.0, i.agency_relevance)),
        "location": _location(i),
        "past_perf": max(0.0, min(1.0, i.past_perf_similarity)),
        "deadline": _deadline(i),
        "value": _value(i),
        "certs": _certs(i),
        "competition": max(0.0, min(1.0, i.competition)),
        "doc_complexity": _doc_complexity(i),
        "strategic": max(0.0, min(1.0, i.strategic)),
    }
    total = round(sum(WEIGHTS[k] / 100 * v for k, v in subs.items()) * 100)
    deadline_feasible = subs["deadline"] >= 0.2
    return {
        "total": total,
        "subscores": {k: round(v, 3) for k, v in subs.items()},
        "weighted": {k: round(WEIGHTS[k] / 100 * v * 100, 2) for k, v in subs.items()},
        "deadline_feasible": deadline_feasible,
    }
