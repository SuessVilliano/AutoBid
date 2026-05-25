"""docs/render_pdf.py — assemble approved sections into a proposal PDF.

    pip install markdown weasyprint
WeasyPrint needs system libs (pango, cairo). On Debian/Ubuntu:
    apt-get install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0
"""
from __future__ import annotations

from io import BytesIO

import markdown as md
from weasyprint import HTML

from db.pool import query

CSS = """
@page { size: Letter; margin: 1in; @bottom-center { content: counter(page); } }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.45; color:#111; }
h1 { font-size: 18pt; border-bottom: 2px solid #222; padding-bottom: 4px; }
h2 { font-size: 14pt; margin-top: 1.2em; }
.section { page-break-inside: avoid; margin-bottom: 1.5em; }
.needs-human { background:#fff3cd; padding:2px 4px; border:1px solid #e0a800; }
"""


def render_proposal_pdf(proposal_id: str, title: str = "Proposal") -> bytes:
    sections = query(
        "select section_type, content_md from proposal_sections "
        "where proposal_id = %s order by ordinal", (proposal_id,))

    html_parts = [f"<h1>{title}</h1>"]
    for s in sections:
        heading = s["section_type"].replace("_", " ").title()
        body_html = md.markdown(s["content_md"] or "", extensions=["extra"])
        body_html = body_html.replace(
            "[NEEDS HUMAN INPUT",
            "<span class='needs-human'>[NEEDS HUMAN INPUT")
        html_parts.append(
            f"<div class='section'><h2>{heading}</h2>{body_html}</div>")

    html = f"<html><head><style>{CSS}</style></head><body>{''.join(html_parts)}</body></html>"
    buf = BytesIO()
    HTML(string=html).write_pdf(buf)
    return buf.getvalue()
