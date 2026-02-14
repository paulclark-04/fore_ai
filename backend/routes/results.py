"""GET /api/results/{run_id} — fetch pipeline results."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from backend.core.pipeline import get_run

router = APIRouter()


@router.get("/api/results/{run_id}")
async def get_results(run_id: str):
    """Get results for a completed pipeline run."""
    run = get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    return {
        "run_id": run.run_id,
        "status": run.status,
        "results": [r.dict() for r in run.results],
        "error": run.error,
        "cost": run.cost.dict() if run.cost else None,
    }
