"""db/audit.py — append-only audit trail. Every agent/user action lands here."""
from __future__ import annotations

import json
from typing import Any, Optional

from db.pool import execute


def log(
    *,
    action: str,                      # create|update|delete|approve|reject|submit|export|login|ingest
    entity_type: str,
    entity_id: Optional[str] = None,
    company_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    actor_kind: str = "system",       # user|agent|system
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    meta: Optional[dict[str, Any]] = None,
) -> None:
    execute(
        """
        insert into audit_logs
            (company_id, actor_id, actor_kind, action, entity_type, entity_id,
             before, after, meta)
        values (%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (company_id, actor_id, actor_kind, action, entity_type, entity_id,
         json.dumps(before) if before else None,
         json.dumps(after) if after else None,
         json.dumps(meta or {})),
    )
