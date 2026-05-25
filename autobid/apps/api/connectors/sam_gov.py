"""connectors/sam_gov.py — SAM.gov Get Opportunities Public API.

Endpoint : https://api.sam.gov/prod/opportunities/v2/search
Auth     : api_key in query string  (load from SAM_GOV_API_KEY)
Required : postedFrom/postedTo MM/DD/YYYY, pagination via limit/offset
Limits   : ~1,000 calls/day (registered non-federal key). Cache hard.
           No GET-by-id (refetch via noticeId param); title-only search.
"""
from __future__ import annotations

import os
from datetime import date
from typing import Iterator, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

SAM_BASE = "https://api.sam.gov/prod/opportunities/v2/search"


class SamGovConnector:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ["SAM_GOV_API_KEY"]

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(min=2, max=60))
    def _page(self, params: dict) -> dict:
        with httpx.Client(timeout=45) as c:
            r = c.get(SAM_BASE, params=params, headers={"Accept": "application/json"})
            r.raise_for_status()
            return r.json()

    def search(self, posted_from: date, posted_to: date,
               naics: Optional[str] = None, ptype: str = "o",
               set_aside: Optional[str] = None, page_size: int = 100) -> Iterator[dict]:
        offset = 0
        while True:
            params = {
                "api_key": self.api_key,
                "postedFrom": posted_from.strftime("%m/%d/%Y"),
                "postedTo": posted_to.strftime("%m/%d/%Y"),
                "limit": page_size, "offset": offset, "ptype": ptype,
            }
            if naics:
                params["ncode"] = naics
            if set_aside:
                params["typeOfSetAside"] = set_aside

            data = self._page(params)
            records = data.get("opportunitiesData", []) or []
            for rec in records:
                yield self._normalize(rec)

            total = int(data.get("totalRecords", 0))
            offset += page_size
            if offset >= total or not records:
                break

    @staticmethod
    def _normalize(rec: dict) -> dict:
        pop = (rec.get("placeOfPerformance") or {}).get("state", {})
        return {
            "source": "sam_gov",
            "external_id": rec.get("noticeId"),
            "type": "contract",
            "title": rec.get("title"),
            "description": rec.get("description"),
            "naics": rec.get("naicsCode") or (rec.get("naicsCodes") or [None])[0],
            "psc": rec.get("classificationCode"),
            "set_aside": rec.get("typeOfSetAside"),
            "place_of_perf_state": pop.get("code") if isinstance(pop, dict) else None,
            "posted_date": rec.get("postedDate"),
            "response_deadline": rec.get("responseDeadLine"),
            "solicitation_no": rec.get("solicitationNumber"),
            "url": rec.get("uiLink"),
            "resource_links": rec.get("resourceLinks") or [],
            "raw": rec,
        }
