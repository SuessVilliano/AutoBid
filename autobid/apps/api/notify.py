"""notify.py — outbound notifications via Resend's HTTP API (uses httpx).

Set RESEND_API_KEY and NOTIFY_FROM. SMS can be added later (Twilio) behind the
same send() interface keyed on channel.
"""
from __future__ import annotations

import os

import httpx

RESEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("NOTIFY_FROM", "AutoBid <alerts@example.com>")
    if not api_key:
        # No provider configured — log and no-op so the task stays green in dev.
        print(f"[notify:dev] would email {to!r}: {subject}")
        return False
    resp = httpx.post(
        RESEND_URL,
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"},
        json={"from": sender, "to": [to], "subject": subject, "html": html},
        timeout=20,
    )
    return resp.status_code < 300


def send(channel: str, to: str, subject: str, message: str) -> bool:
    if channel == "email":
        return send_email(to, subject, f"<p>{message}</p>")
    # TODO: 'sms' via Twilio, 'in_app' via a notifications table
    print(f"[notify:dev] channel={channel} to={to}: {message}")
    return False
