"""agents/scoring_agent.py — orchestrates fit scoring for one opportunity.

Flow: load opp + profile -> gather USAspending signals + RAG past-perf
similarity -> run deterministic scoring/model.score() -> ask the LLM for a
short rationale (numbers are NOT changed) -> persist to opportunity_scores.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from connectors.usaspending import USAspendingConnector
from db.audit import log
from db.pool import execute, query
from llm import complete
from rag.retrieve import top_similarity
from scoring.model import ScoreInput, score

RATIONALE_SYS = (
    "You explain a government-opportunity fit score. You are given the computed "
    "sub-scores and the opportunity/profile. Write 3-4 candid sentences covering "
    "why the total landed where it did and the single biggest risk. Do NOT change "
    "any numbers. Do not oversell weaknesses."
)


def _parse_dt(v) -> Optional[datetime]:
    if not v:
        return None
    if isinstance(v, datetime):
        return v
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None


def score_opportunity(company_id: str, opportunity_id: str) -> dict:
    opp = query("select * from opportunities where id = %s", (opportunity_id,))
    prof = query("select * from company_profiles where company_id = %s", (company_id,))
    comp = query("select set_asides from companies where id = %s", (company_id,))
    if not opp or not prof:
        raise ValueError("opportunity or company profile not found")
    opp, prof = opp[0], prof[0]
    held_set_asides = (comp[0]["set_asides"] if comp else None) or []

    # market signals (best-effort; scoring still works if this fails)
    signals = {"competition": 0.0, "agency_relevance_signal": 0.0, "top_recipients": []}
    if opp.get("naics"):
        try:
            agency = query("select name from agencies where id = %s",
                           (opp.get("agency_id"),))
            signals = USAspendingConnector().market_signals(
                opp["naics"], agency[0]["name"] if agency else None)
        except Exception:  # noqa: BLE001 — degrade gracefully
            pass

    # past-performance similarity from approved vault docs
    pp_sim = 0.0
    try:
        pp_sim = top_similarity(company_id,
                                f"{opp.get('title','')} {opp.get('description','') or ''}",
                                kinds=["past_performance", "capability_statement"])
    except Exception:  # noqa: BLE001
        pass

    si = ScoreInput(
        opp_naics=opp.get("naics"), opp_psc=opp.get("psc"),
        opp_state=opp.get("place_of_perf_state"),
        response_deadline=_parse_dt(opp.get("response_deadline")),
        estimated_value=opp.get("estimated_value"),
        set_aside=opp.get("set_aside"),
        attachment_count=len(opp.get("resource_links") or []),
        profile_naics=prof.get("naics_list") or [],
        profile_psc=prof.get("psc_list") or [],
        service_states=prof.get("service_states") or [],
        remote_ok=bool(prof.get("remote_ok", True)),
        min_value=prof.get("min_value"), max_value=prof.get("max_value"),
        held_set_asides=held_set_asides,
        past_perf_similarity=pp_sim,
        agency_relevance=signals["agency_relevance_signal"],
        competition=signals["competition"],
    )
    result = score(si)

    eligibility_pass = result["subscores"]["certs"] > 0
    recommended = result["total"] >= 70 and eligibility_pass and result["deadline_feasible"]

    rationale = complete(
        RATIONALE_SYS,
        f"Total: {result['total']}\nSub-scores: {result['subscores']}\n"
        f"Title: {opp.get('title')}\nNAICS: {opp.get('naics')}  "
        f"Set-aside: {opp.get('set_aside')}\nTop incumbents: {signals['top_recipients']}",
        max_tokens=300,
    )

    row = execute(
        """
        insert into opportunity_scores
          (company_id, opportunity_id, total_score, subscores, rationale,
           recommended, model_version, scored_at)
        values (%s,%s,%s,%s,%s,%s,%s, now())
        returning id
        """,
        (company_id, opportunity_id, result["total"],
         _json(result["subscores"]), rationale, recommended, "scoring-v1"),
    )
    log(action="create", entity_type="opportunity_score",
        entity_id=row["id"] if row else None, company_id=company_id,
        actor_kind="agent", after={"total": result["total"]},
        meta={"agent": "scoring", "model_version": "scoring-v1"})
    return {"score_id": row["id"] if row else None, **result,
            "recommended": recommended, "rationale": rationale}


def _json(obj) -> str:
    import json
    return json.dumps(obj)
