"""connectors/grants_gov.py — Grants.gov search2 (keyless POST).

Search : POST https://api.grants.gov/v1/api/search2
Detail : POST https://api.grants.gov/v1/api/fetchOpportunity
Results under data.oppHits[]; data.hitCount for paging.
"""
from __future__ import annotations

from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

GRANTS_SEARCH = "https://api.grants.gov/v1/api/search2"
GRANTS_FETCH = "https://api.grants.gov/v1/api/fetchOpportunity"


class GrantsGovConnector:
    @retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=30))
    def search(self, keyword: str = "", agencies: Optional[list[str]] = None,
               funding_categories: Optional[list[str]] = None,
               opp_statuses: str = "posted|forecasted",
               rows: int = 100, start: int = 0) -> dict:
        body: dict = {
            "keyword": keyword, "oppStatuses": opp_statuses,
            "rows": rows, "startRecordNum": start,
        }
        if agencies:
            body["agencies"] = "|".join(agencies)
        if funding_categories:
            body["fundingCategories"] = "|".join(funding_categories)
        with httpx.Client(timeout=45) as c:
            r = c.post(GRANTS_SEARCH, json=body,
                       headers={"Content-Type": "application/json"})
            r.raise_for_status()
            return r.json()

    @staticmethod
    def hits(payload: dict) -> list[dict]:
        return (payload.get("data") or {}).get("oppHits") or []

    @staticmethod
    def normalize(hit: dict) -> dict:
        return {
            "source": "grants_gov",
            "external_id": hit.get("number"),
            "title": hit.get("title"),
            "cfda_aln": (hit.get("cfdaList") or [None])[0],
            "open_date": hit.get("openDate"),
            "close_date": hit.get("closeDate"),
            "url": f"https://www.grants.gov/search-results-detail/{hit.get('id')}",
            "raw": hit,
        }
