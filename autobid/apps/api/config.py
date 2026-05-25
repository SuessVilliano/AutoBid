"""config.py — environment-driven settings (no secrets in code)."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str = os.environ.get("DATABASE_URL", "")
    redis_url: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

    # Government APIs
    sam_gov_api_key: str = os.environ.get("SAM_GOV_API_KEY", "")
    # grants.gov search2 + usaspending need no key

    # AI
    anthropic_api_key: str = os.environ.get("ANTHROPIC_API_KEY", "")
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")  # embeddings

    # Models (override per-deployment). Opus for compliance-critical work,
    # Sonnet for higher-volume drafting/summaries.
    model_critical: str = os.environ.get("MODEL_CRITICAL", "claude-opus-4-7")
    model_draft: str = os.environ.get("MODEL_DRAFT", "claude-sonnet-4-6")
    embed_model: str = os.environ.get("EMBED_MODEL", "text-embedding-3-small")  # 1536-dim
    embed_dim: int = int(os.environ.get("EMBED_DIM", "1536"))

    environment: str = os.environ.get("ENVIRONMENT", "development")


settings = Settings()
