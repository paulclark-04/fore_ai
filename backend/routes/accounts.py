"""Endpoints for accounts (domains) and their leads."""

from __future__ import annotations

import tempfile
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel

from backend.core.database import get_all_accounts, get_leads_by_domain, upsert_account_vertical
from backend.services.scorer_service import generate_xlsx

router = APIRouter()

ALLOWED_VERTICALS = {"banking", "insurance", "media", "ecommerce", "travel"}


class VerticalUpdate(BaseModel):
    vertical: Optional[str] = None


@router.patch("/api/accounts/{domain}/vertical")
async def update_vertical(domain: str, body: VerticalUpdate):
    """Set or clear the vertical for an account domain."""
    if body.vertical is not None and body.vertical not in ALLOWED_VERTICALS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid vertical. Allowed: {', '.join(sorted(ALLOWED_VERTICALS))}",
        )
    upsert_account_vertical(domain, body.vertical)
    return {"domain": domain, "vertical": body.vertical}


@router.get("/api/accounts")
async def list_accounts():
    """Return all unique domains with aggregated lead stats."""
    return get_all_accounts()


@router.get("/api/accounts/{domain}/leads")
async def account_leads(
    domain: str,
    tier: Optional[str] = Query(None, description="Filter by tier (A/B/C/D)"),
    min_score: Optional[int] = Query(None, description="Minimum score"),
    max_score: Optional[int] = Query(None, description="Maximum score"),
    enriched: Optional[str] = Query(None, description="Filter by enriched status (true/false)"),
):
    """Return leads for a specific domain with optional filters."""
    enriched_bool = None
    if enriched is not None:
        enriched_bool = enriched.lower() == "true"

    return get_leads_by_domain(
        domain=domain,
        tier=tier,
        min_score=min_score,
        max_score=max_score,
        enriched=enriched_bool,
    )


@router.get("/api/accounts/{domain}/export/xlsx")
async def export_account_xlsx(
    domain: str,
    tier: Optional[str] = Query(None, description="Filter by tier (A/B/C/D)"),
    enriched: Optional[str] = Query(None, description="Filter by enriched status (true/false)"),
):
    """Export leads for a domain as XLSX, respecting current filters."""
    enriched_bool = None
    if enriched is not None:
        enriched_bool = enriched.lower() == "true"

    leads = get_leads_by_domain(
        domain=domain,
        tier=tier,
        enriched=enriched_bool,
    )
    if not leads:
        raise HTTPException(status_code=404, detail="No leads found for this domain")

    # Convert to the dict format that write_output_xlsx expects
    results_for_xlsx = []
    for lead in leads:
        results_for_xlsx.append({
            "firstName": lead.get("first_name", ""),
            "lastName": lead.get("last_name", ""),
            "linkedinUrl": lead.get("linkedin_url", ""),
            "headline": lead.get("headline", ""),
            "company": lead.get("company", ""),
            "score": lead.get("score", 0),
            "tier": lead.get("tier", ""),
            "category": lead.get("category", ""),
            "reasoning": lead.get("reasoning", ""),
            "persona_label": lead.get("persona_label", ""),
            "seniority": lead.get("seniority_level", ""),
            "special_flags": "",
            "red_flags_detail": lead.get("red_flags", ""),
            "method": lead.get("method", ""),
            "email": lead.get("email", ""),
        })

    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    tmp.close()
    await generate_xlsx(results_for_xlsx, tmp.name)

    company = domain.replace(".", "_")
    filename = f"leads_{company}.xlsx"

    return FileResponse(
        tmp.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
