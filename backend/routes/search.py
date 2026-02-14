"""POST /api/search — start a new pipeline run."""

from __future__ import annotations

import asyncio
import uuid

from fastapi import APIRouter, BackgroundTasks
from backend.models.schemas import SearchRequest
from backend.core.pipeline import run_pipeline

router = APIRouter()


@router.post("/api/search")
async def start_search(request: SearchRequest, background_tasks: BackgroundTasks):
    """Start a new lead scoring pipeline. Returns run_id immediately."""
    run_id = str(uuid.uuid4())[:8]
    background_tasks.add_task(run_pipeline, run_id, request)
    return {"run_id": run_id}
