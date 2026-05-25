"""ingest.py — pull from connectors and upsert into opportunities / grants.

Idempotent: dedupe on (source, external_id). Safe to re-run nightly.
"""
from __future__ import annotations

import json
from datetime import date, timedelta

from connectors.grants_gov import GrantsGovConnector
from connectors.sam_gov import SamGovConnector
from db.audit import log
from db.pool import execute, query


def _company_naics() -> list[str]:
    rows = query("select distinct unnest(naics_list) as code from company_profiles")
    return [r["code"] for r in rows if r["code"]]


def ingest_sam(days_back: int = 1) -> int:
    today = date.today()
    start = today - timedelta(days=days_back)
    sam = SamGovConnector()
    count = 0
    for naics in _company_naics() or [None]:
        for opp in sam.search(start, today, naics=naics):
            if not opp.get("external_id"):
                continue
            execute(
                """
                insert into opportunities
                  (source, external_id, type, title, description, naics, psc,
                   set_aside, place_of_perf_state, posted_date, response_deadline,
                   solicitation_no, url, resource_links, raw)
                values
                  (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                on conflict (source, external_id) do update set
                  title = excluded.title,
                  response_deadline = excluded.response_deadline,
                  raw = excluded.raw
                """,
                (opp["source"], opp["external_id"], opp["type"], opp["title"],
                 opp.get("description"), opp.get("naics"), opp.get("psc"),
                 opp.get("set_aside"), opp.get("place_of_perf_state"),
                 opp.get("posted_date") or None, opp.get("response_deadline") or None,
                 opp.get("solicitation_no"), opp.get("url"),
                 json.dumps(opp.get("resource_links") or []),
                 json.dumps(opp.get("raw") or {})),
            )
            count += 1
    log(action="ingest", entity_type="opportunities", actor_kind="system",
        after={"upserted": count}, meta={"source": "sam_gov"})
    return count


def ingest_grants(keyword: str = "") -> int:
    g = GrantsGovConnector()
    payload = g.search(keyword=keyword, opp_statuses="posted|forecasted", rows=200)
    count = 0
    for hit in g.hits(payload):
        gr = g.normalize(hit)
        if not gr.get("external_id"):
            continue
        execute(
            """
            insert into grants
              (source, external_id, title, cfda_aln, open_date, close_date, url, raw)
            values (%s,%s,%s,%s,%s,%s,%s,%s)
            on conflict (source, external_id) do update set
              title = excluded.title, close_date = excluded.close_date,
              raw = excluded.raw
            """,
            (gr["source"], gr["external_id"], gr["title"], gr.get("cfda_aln"),
             gr.get("open_date") or None, gr.get("close_date") or None,
             gr.get("url"), json.dumps(gr.get("raw") or {})),
        )
        count += 1
    log(action="ingest", entity_type="grants", actor_kind="system",
        after={"upserted": count}, meta={"source": "grants_gov"})
    return count
