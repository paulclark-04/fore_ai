"""Endpoints for historical pipeline runs."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.core.database import get_all_runs_summary, get_run_with_leads

router = APIRouter()


@router.get("/api/runs")
async def list_runs():
    """Return lightweight summaries of all historical pipeline runs."""
    return get_all_runs_summary()


@router.get("/api/runs/{run_id}")
async def get_historical_run(run_id: str):
    """Return a full historical run with all leads from SQLite."""
    run = get_run_with_leads(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run
