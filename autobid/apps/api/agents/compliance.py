"""agents/compliance.py — Compliance Matrix agent.

Extracts every binding requirement and Section L/M item from solicitation text
into compliance_checklists rows. Legal certifications are flagged
is_attestation=true so the rest of the system treats them as HUMAN-ONLY.

Uses the critical (Opus) model — this is compliance-sensitive work.
"""
from __future__ import annotations

import json

from config import settings
from db.audit import log
from db.pool import execute
from llm import complete_json

COMPLIANCE_SYS = (
    "You extract binding requirements from a U.S. government solicitation. "
    "Capture every 'shall', 'must', 'required to', and all Section L (instructions) "
    "and Section M (evaluation) items. Do NOT summarize requirements away; when "
    "unsure, include and flag it. Return a JSON array where each item is "
    "{\"requirement\": str, \"section_ref\": str|null, "
    "\"category\": \"format\"|\"cert\"|\"attachment\"|\"eval\"|\"other\", "
    "\"is_attestation\": bool}. Set is_attestation=true for any legal "
    "certification, representation, or signature requirement."
)


def extract_requirements(workspace_id: str, solicitation_text: str,
                         company_id: str | None = None) -> list[dict]:
    items = complete_json(
        COMPLIANCE_SYS,
        solicitation_text[:60000],     # chunk longer docs upstream
        model=settings.model_critical,
        max_tokens=8000,
    )
    if isinstance(items, dict):        # tolerate {"items": [...]}
        items = items.get("items") or items.get("requirements") or []

    inserted = 0
    for it in items:
        execute(
            """
            insert into compliance_checklists
              (workspace_id, requirement, section_ref, category, status,
               is_attestation)
            values (%s,%s,%s,%s,'open',%s)
            """,
            (workspace_id, it.get("requirement"), it.get("section_ref"),
             it.get("category", "other"), bool(it.get("is_attestation", False))),
        )
        inserted += 1

    log(action="create", entity_type="compliance_checklist",
        entity_id=workspace_id, company_id=company_id, actor_kind="agent",
        after={"items": inserted}, meta={"agent": "compliance",
                                         "model_version": settings.model_critical})
    return items


def validate_ready_to_export(workspace_id: str) -> dict:
    """Submission Prep gate: block export if anything is open or attestations unsigned."""
    from db.pool import query
    open_items = query(
        "select count(*) as n from compliance_checklists "
        "where workspace_id = %s and status = 'open'", (workspace_id,))[0]["n"]
    unsigned = query(
        "select count(*) as n from compliance_checklists "
        "where workspace_id = %s and is_attestation = true and status != 'satisfied'",
        (workspace_id,))[0]["n"]
    ok = open_items == 0 and unsigned == 0
    return {"ready": ok, "open_items": open_items, "unsigned_attestations": unsigned}
