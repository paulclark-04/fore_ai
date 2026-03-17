"""Waves — named groups of accounts that run in parallel."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.core.database import (
    create_wave, get_all_waves, get_wave, update_wave_status, delete_wave,
    add_wave_account, remove_wave_account, update_wave_account_run,
    update_wave_account_vertical,
)
from backend.core.pipeline import run_pipeline
from backend.models.schemas import SearchRequest

router = APIRouter()

ALLOWED_VERTICALS = {"banking", "insurance", "media", "ecommerce", "travel"}


class CreateWaveRequest(BaseModel):
    name: str


class AddAccountRequest(BaseModel):
    domain: str
    vertical: Optional[str] = None


class UpdateAccountVerticalRequest(BaseModel):
    vertical: Optional[str] = None


class WaveRunRequest(BaseModel):
    job_titles: Optional[List[str]] = None
    seniority_levels: Optional[List[str]] = None
    location: Optional[List[str]] = None
    email_status: Optional[List[str]] = None
    fetch_count: int = 100
    enable_scoring: bool = False


@router.get("/api/waves")
async def list_waves():
    return get_all_waves()


@router.post("/api/waves")
async def create_new_wave(body: CreateWaveRequest):
    if not body.name.strip():
        raise HTTPException(status_code=400, detail="Wave name required")
    wave_id = str(uuid.uuid4())[:8]
    return create_wave(wave_id, body.name.strip())


@router.get("/api/waves/{wave_id}")
async def get_wave_detail(wave_id: str):
    wave = get_wave(wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    return wave


@router.delete("/api/waves/{wave_id}")
async def delete_wave_endpoint(wave_id: str):
    wave = get_wave(wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    delete_wave(wave_id)
    return {"status": "deleted"}


def _normalize_domain(raw: str) -> str:
    """Strip protocol, www prefix, and trailing slash from a domain string."""
    import re
    d = raw.lower().strip()
    d = re.sub(r'^https?://', '', d)
    d = re.sub(r'^www\.', '', d)
    d = d.rstrip('/')
    return d


@router.post("/api/waves/{wave_id}/accounts")
async def add_account(wave_id: str, body: AddAccountRequest):
    wave = get_wave(wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")
    domain = _normalize_domain(body.domain)
    if not domain:
        raise HTTPException(status_code=400, detail="Domain required")
    if body.vertical and body.vertical not in ALLOWED_VERTICALS:
        raise HTTPException(status_code=422, detail=f"Invalid vertical. Allowed: {', '.join(sorted(ALLOWED_VERTICALS))}")
    add_wave_account(wave_id, domain, body.vertical)
    return {"wave_id": wave_id, "domain": domain, "vertical": body.vertical}


@router.delete("/api/waves/{wave_id}/accounts/{domain}")
async def remove_account(wave_id: str, domain: str):
    remove_wave_account(wave_id, domain)
    return {"status": "removed"}


@router.patch("/api/waves/{wave_id}/accounts/{domain}/vertical")
async def update_account_vertical(wave_id: str, domain: str, body: UpdateAccountVerticalRequest):
    if body.vertical and body.vertical not in ALLOWED_VERTICALS:
        raise HTTPException(status_code=422, detail=f"Invalid vertical. Allowed: {', '.join(sorted(ALLOWED_VERTICALS))}")
    update_wave_account_vertical(wave_id, domain, body.vertical)
    return {"wave_id": wave_id, "domain": domain, "vertical": body.vertical}


@router.post("/api/waves/{wave_id}/run")
async def run_wave(wave_id: str, body: WaveRunRequest, background_tasks: BackgroundTasks):
    """Start pipeline for every account in the wave simultaneously."""
    wave = get_wave(wave_id)
    if not wave:
        raise HTTPException(status_code=404, detail="Wave not found")

    accounts = wave.get("accounts", [])
    if not accounts:
        raise HTTPException(status_code=400, detail="No accounts in wave")

    account_run_ids: dict = {}
    for acct in accounts:
        run_id = str(uuid.uuid4())[:8]
        search_req = SearchRequest(
            company_domain=[acct["domain"]],
            vertical=acct.get("vertical"),
            job_titles=body.job_titles,
            seniority_levels=body.seniority_levels,
            location=body.location,
            email_status=body.email_status,
            fetch_count=body.fetch_count,
            enable_scoring=body.enable_scoring,
        )
        update_wave_account_run(wave_id, acct["domain"], run_id, "running")
        background_tasks.add_task(run_pipeline, run_id, search_req)
        account_run_ids[acct["domain"]] = run_id

    update_wave_status(wave_id, "running")

    return {
        "wave_id": wave_id,
        "status": "running",
        "account_run_ids": account_run_ids,
    }
