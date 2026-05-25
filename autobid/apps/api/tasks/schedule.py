"""tasks/schedule.py — Celery beat schedule.

Import into your beat config, or set app.conf.beat_schedule = SCHEDULE.
"""
from __future__ import annotations

from celery.schedules import crontab

SCHEDULE = {
    "ingest-sam-nightly": {
        "task": "tasks.worker.task_ingest_sam",
        "schedule": crontab(hour=6, minute=0),     # 06:00 UTC daily
        "kwargs": {"days_back": 2},                 # small overlap for safety
    },
    "ingest-grants-nightly": {
        "task": "tasks.worker.task_ingest_grants",
        "schedule": crontab(hour=6, minute=30),
    },
    "score-new-opps": {
        "task": "tasks.worker.task_score_new",
        "schedule": crontab(hour=7, minute=0),
    },
    "fire-reminders": {
        "task": "tasks.worker.task_fire_reminders",
        "schedule": crontab(minute="*/15"),         # every 15 min
    },
}
