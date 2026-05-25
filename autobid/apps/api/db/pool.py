"""db/pool.py — psycopg3 connection pool and tiny query helpers.

    pip install "psycopg[binary,pool]"
"""
from __future__ import annotations

from typing import Any, Iterable, Optional

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from config import settings

_pool: Optional[ConnectionPool] = None


def pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(settings.database_url, min_size=1, max_size=10,
                               kwargs={"row_factory": dict_row})
    return _pool


def query(sql: str, params: Iterable[Any] = ()) -> list[dict]:
    with pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, tuple(params))
        return cur.fetchall() if cur.description else []


def execute(sql: str, params: Iterable[Any] = ()) -> Optional[dict]:
    """Run a write; return the first row if RETURNING is used."""
    with pool().connection() as conn, conn.cursor() as cur:
        cur.execute(sql, tuple(params))
        row = cur.fetchone() if cur.description else None
        conn.commit()
        return row


def to_vector(values: list[float]) -> str:
    """Format a float list into a pgvector literal: '[0.1,0.2,...]'."""
    return "[" + ",".join(f"{v:.7f}" for v in values) + "]"
