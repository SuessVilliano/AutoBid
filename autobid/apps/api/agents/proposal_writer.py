"""agents/proposal_writer.py — drafts proposal sections from APPROVED language.

Hard rules enforced via the system prompt + retrieval filter:
  * reuse only approved vault language (RAG over is_approved documents)
  * never invent metrics, certs, client names, or past performance
  * emit [NEEDS HUMAN INPUT: ...] for any missing fact
  * never write final pricing numbers or sign certifications
"""
from __future__ import annotations

from db.audit import log
from db.pool import execute, query
from llm import complete
from rag.retrieve import retrieve_approved

SECTIONS = [
    "cover_letter", "executive_summary", "technical_approach",
    "management_approach", "staffing_plan", "past_performance",
    "risk_mitigation", "pricing_notes", "budget_narrative",
    "grant_narrative", "compliance_matrix", "required_attachment_list",
]

WRITER_SYS = (
    "You draft ONE section of a U.S. government proposal. Use ONLY the approved "
    "company language and facts in CONTEXT. You may rephrase to fit the "
    "solicitation but must not invent metrics, certifications, client names, or "
    "past performance. For any required fact missing from CONTEXT, output the "
    "literal token [NEEDS HUMAN INPUT: <what is needed>]. Never write final "
    "pricing numbers and never complete certifications — for pricing/budget "
    "sections, produce structure and placeholders only. Respect any page/format "
    "limits in REQUIREMENTS. Return Markdown only."
)


def draft_section(workspace_id: str, company_id: str, section_type: str,
                  proposal_id: str, requirements_text: str = "",
                  ordinal: int = 0) -> dict:
    kinds = None
    if section_type == "past_performance":
        kinds = ["past_performance"]
    elif section_type in ("executive_summary", "technical_approach",
                          "management_approach"):
        kinds = ["capability_statement", "past_performance", "template"]

    ctx_docs = retrieve_approved(company_id, f"{section_type} {requirements_text}",
                                 k=6, kinds=kinds)
    context = "\n\n".join(f"[{d['title']} | {d['kind']}] (doc {d['id']})"
                          for d in ctx_docs) or "(no approved vault content found)"

    body = complete(
        WRITER_SYS,
        f"SECTION: {section_type}\n\nREQUIREMENTS:\n{requirements_text[:6000]}\n\n"
        f"CONTEXT (approved language only):\n{context}",
        max_tokens=3000,
    )

    is_pricing = section_type in ("pricing_notes", "budget_narrative")
    row = execute(
        """
        insert into proposal_sections
          (proposal_id, section_type, ordinal, content_md, source_blurbs,
           is_ai_generated, is_locked)
        values (%s,%s,%s,%s,%s,true,false)
        returning id
        """,
        (proposal_id, section_type, ordinal, body,
         [d["id"] for d in ctx_docs]),
    )
    log(action="create", entity_type="proposal_section",
        entity_id=row["id"] if row else None, company_id=company_id,
        actor_kind="agent",
        meta={"agent": "proposal_writer", "section": section_type,
              "pricing_section": is_pricing,
              "needs_human": "[NEEDS HUMAN INPUT" in body})
    return {"section_id": row["id"] if row else None, "content_md": body,
            "source_docs": [d["id"] for d in ctx_docs]}


def draft_all(workspace_id: str, company_id: str,
              requirements_text: str = "") -> dict:
    proposal = execute(
        """insert into generated_proposals (workspace_id, version, status, model_version)
           values (%s, 1, 'draft', 'writer-v1') returning id""",
        (workspace_id,),
    )
    pid = proposal["id"]
    out = []
    for i, sec in enumerate(SECTIONS):
        out.append(draft_section(workspace_id, company_id, sec, pid,
                                 requirements_text, ordinal=i))
    return {"proposal_id": pid, "sections": out}
