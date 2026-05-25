"""llm.py — thin Anthropic wrapper used by all agents.

    pip install anthropic
"""
from __future__ import annotations

import json
from typing import Optional

import anthropic

from config import settings

_client: Optional[anthropic.Anthropic] = None


def client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def complete(system: str, user: str, *, model: Optional[str] = None,
             max_tokens: int = 2000) -> str:
    """Return plain text from a single-turn completion."""
    resp = client().messages.create(
        model=model or settings.model_draft,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return "".join(b.text for b in resp.content if b.type == "text").strip()


def complete_json(system: str, user: str, *, model: Optional[str] = None,
                  max_tokens: int = 4000):
    """Force a JSON response and parse it. System prompt MUST request JSON-only."""
    raw = complete(system + "\n\nRespond with valid JSON only — no prose, no code fences.",
                   user, model=model, max_tokens=max_tokens)
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)
