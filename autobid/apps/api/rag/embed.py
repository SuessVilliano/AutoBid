"""rag/embed.py — generate + store embeddings for vault documents.

Uses OpenAI text-embedding-3-small (1536 dims) to match schema vector(1536).
Swap to Voyage AI by changing embed() + EMBED_DIM (re-create the column).

    pip install openai
"""
from __future__ import annotations

from typing import Optional

from openai import OpenAI

from config import settings
from db.pool import execute, to_vector

_client: Optional[OpenAI] = None


def client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def embed(text: str) -> list[float]:
    resp = client().embeddings.create(model=settings.embed_model, input=text[:8000])
    return resp.data[0].embedding


def embed_document(document_id: str, text: str) -> None:
    """Compute and persist an embedding onto documents.embedding."""
    vec = embed(text)
    execute("update documents set embedding = %s where id = %s",
            (to_vector(vec), document_id))
