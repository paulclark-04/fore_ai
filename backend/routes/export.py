"""GET /api/export/{run_id}/xlsx — download scored results as XLSX."""

from __future__ import annotations

import os
import tempfile

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from backend.core.pipeline import get_run
from backend.services.scorer_service import generate_xlsx

router = APIRouter()


@router.get("/api/export/{run_id}/xlsx")
async def export_xlsx(run_id: str):
    """Export pipeline results as formatted XLSX."""
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    if not run.results:
        raise HTTPException(status_code=400, detail="No results to export")

    # Convert LeadResult objects to the dicts that write_output_xlsx expects
    results_for_xlsx = []
    for r in run.results:
        results_for_xlsx.append({
            "firstName": r.first_name,
            "lastName": r.last_name,
            "linkedinUrl": r.linkedin_url,
            "headline": r.headline,
            "company": r.company,
            "score": r.score,
            "tier": r.tier,
            "category": r.category,
            "reasoning": r.reasoning,
            "persona_label": r.persona_label,
            "seniority": r.seniority_level,
            "special_flags": r.special_flags,
            "red_flags_detail": r.red_flags,
            "method": r.method,
            "email": r.email,
            "mobile_number": r.mobile_number,
            "phone_number": r.phone_number,
            "website": r.website,
            "job_title": r.job_title,
        })

    # Write to temp file
    tmp = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
    tmp.close()
    await generate_xlsx(results_for_xlsx, tmp.name)

    domains = run.request.company_domain if run.request else ["leads"]
    company = domains[0].replace(".", "_") if domains else "leads"
    filename = f"scored_{company}.xlsx"

    return FileResponse(
        tmp.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )
