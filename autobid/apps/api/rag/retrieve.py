"""rag/retrieve.py — semantic retrieval over APPROVED vault documents only.

The Proposal Writer is allowed to reuse only approved company language, so
retrieval filters is_approved = true and scopes to the company.
"""
from __future__ import annotations

from rag.embed import embed
from db.pool import query, to_vector


def retrieve_approved(company_id: str, prompt: str, k: int = 6,
                      kinds: list[str] | None = None) -> list[dict]:
    """Return top-k approved documents by cosine similarity to `prompt`."""
    qvec = to_vector(embed(prompt))
    kind_clause = "and kind = any(%s)" if kinds else ""
    rows = query(
        f"""
        select id, title, kind, source_note,
               1 - (embedding <=> %s::vector) as similarity
        from documents
        where company_id = %s
          and is_approved = true
          and embedding is not null
          {kind_clause}
        order by embedding <=> %s::vector
        limit %s
        """,
        # note: param order matches the %s placeholders below
        [qvec, company_id] + ([kinds] if kinds else []) + [qvec, k],
    )
    return rows


def top_similarity(company_id: str, prompt: str, kinds: list[str] | None = None) -> float:
    """Best cosine similarity (0..1) — feeds the past-performance sub-score."""
    rows = retrieve_approved(company_id, prompt, k=1, kinds=kinds)
    return float(rows[0]["similarity"]) if rows else 0.0
