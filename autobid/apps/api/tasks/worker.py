"""tasks/worker.py — Celery app and background tasks.

    pip install celery redis
Run worker:  celery -A tasks.worker.app worker -l info
Run beat:    celery -A tasks.worker.app beat -l info
"""
from __future__ import annotations

from celery import Celery

from config import settings
from ingest import ingest_grants, ingest_sam

app = Celery("autobid", broker=settings.redis_url, backend=settings.redis_url)
app.conf.update(task_track_started=True, timezone="UTC")


@app.task
def task_ingest_sam(days_back: int = 1) -> int:
    return ingest_sam(days_back=days_back)


@app.task
def task_ingest_grants(keyword: str = "") -> int:
    return ingest_grants(keyword=keyword)


@app.task
def task_score_new() -> int:
    """Score opportunities that don't yet have a score, for every company."""
    from db.pool import query
    from agents.scoring_agent import score_opportunity
    companies = query("select id from companies")
    scored = 0
    for comp in companies:
        rows = query(
            """select o.id from opportunities o
               where not exists (
                 select 1 from opportunity_scores s
                 where s.opportunity_id = o.id and s.company_id = %s)
               order by o.posted_date desc nulls last limit 100""",
            (comp["id"],))
        for r in rows:
            try:
                score_opportunity(comp["id"], r["id"])
                scored += 1
            except Exception:  # noqa: BLE001 — keep batch alive
                continue
    return scored


@app.task
def task_fire_reminders() -> int:
    """Send due reminders via the configured provider and mark them sent."""
    from db.pool import query, execute
    from notify import send
    due = query(
        """select r.id, r.message, r.channel, r.kind, u.email
           from reminders r
           left join users u on u.company_id = r.company_id and u.role = 'owner'
           where r.sent = false and r.fire_at <= now()""")
    sent = 0
    for r in due:
        to = r.get("email")
        if to:
            send(r.get("channel") or "email", to,
                 f"AutoBid: {r.get('kind','reminder')} reminder", r["message"])
        execute("update reminders set sent = true where id = %s", (r["id"],))
        sent += 1
    return sent
