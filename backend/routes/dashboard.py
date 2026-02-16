"""Dashboard aggregation endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from backend.core.database import get_dashboard_stats

router = APIRouter()


@router.get("/api/dashboard/stats")
async def dashboard_stats():
    """Return aggregated metrics for the Dashboard page."""
    return get_dashboard_stats()
