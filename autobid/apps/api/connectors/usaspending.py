"""connectors/usaspending.py — USAspending award research (keyless POST).

POST https://api.usaspending.gov/api/v2/search/spending_by_award/
Feeds the Agency-Relevance and Competition sub-scores: who won this kind of
work, for how much, how recently, and how many distinct recipients.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

USASPENDING = "https://api.usaspending.gov/api/v2/search/spending_by_award/"


class USAspendingConnector:
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=30))
    def awards_by_naics(self, naics: str, agency_name: Optional[str] = None,
                        months_back: int = 36, limit: int = 50) -> dict:
        start = (datetime.utcnow() - timedelta(days=30 * months_back)).date()
        filters: dict = {
            "award_type_codes": ["A", "B", "C", "D"],
            "naics_codes": [naics],
            "time_period": [{"start_date": start.isoformat(),
                             "end_date": date.today().isoformat()}],
        }
        if agency_name:
            filters["agencies"] = [{"type": "awarding", "tier": "toptier",
                                    "name": agency_name}]
        body = {
            "filters": filters,
            "fields": ["Award ID", "Recipient Name", "Award Amount",
                       "Awarding Agency", "Period of Performance Start Date",
                       "generated_internal_id"],
            "sort": "Award Amount", "order": "desc", "limit": limit,
        }
        with httpx.Client(timeout=60) as c:
            r = c.post(USASPENDING, json=body,
                       headers={"Content-Type": "application/json"})
            r.raise_for_status()
            return r.json()

    def market_signals(self, naics: str, agency_name: Optional[str] = None) -> dict:
        """Distill raw awards into scoring inputs (0..1 each)."""
        data = self.awards_by_naics(naics, agency_name)
        results = data.get("results", []) or []
        recipients = {r.get("Recipient Name") for r in results if r.get("Recipient Name")}
        n_awards = len(results)
        n_recipients = len(recipients)
        # Fewer distinct recipients => more incumbent-locked => harder to win.
        competition = 0.0 if n_recipients == 0 else min(1.0, n_recipients / 15.0)
        # Any awards in this NAICS (esp. at this agency) => more agency relevance signal.
        agency_relevance = min(1.0, n_awards / 25.0)
        return {
            "n_awards": n_awards,
            "n_recipients": n_recipients,
            "competition": round(competition, 3),
            "agency_relevance_signal": round(agency_relevance, 3),
            "top_recipients": list(recipients)[:5],
        }
