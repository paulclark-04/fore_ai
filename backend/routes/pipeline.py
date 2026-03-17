"""GET /api/pipeline — cross-run pipeline status for Kanban view."""

from __future__ import annotations

import json
from fastapi import APIRouter
from backend.core.pipeline import get_live_run_steps, get_run
from backend.core.database import get_all_wave_run_ids, get_all_runs_summary

router = APIRouter()


@router.get("/api/pipeline")
async def get_pipeline_status():
    """Return all pipeline runs grouped with their current step for the Kanban view."""
    live_steps = get_live_run_steps()

    # Build a lookup of wave run_ids → wave info
    wave_run_map: dict = {}  # run_id → {wave_id, wave_name, domain}
    for row in get_all_wave_run_ids():
        wave_run_map[row["run_id"]] = {
            "wave_id": row["wave_id"],
            "wave_name": row["wave_name"],
            "domain": row["domain"],
        }

    # Get all runs from DB
    db_runs = get_all_runs_summary()

    cards = []
    seen_run_ids = set()

    for run in db_runs:
        run_id = run["run_id"]
        seen_run_ids.add(run_id)

        wave_info = wave_run_map.get(run_id, {})
        live = live_steps.get(run_id, {})

        # Determine the display domain
        domains = run.get("domains", [])
        domain = wave_info.get("domain") or (domains[0] if domains else run_id)

        # Determine current step
        step = live.get("step") if live else None
        # If the run completed, step should be 'done'
        if run["status"] == "complete" and not step:
            step = "done"

        cards.append({
            "run_id": run_id,
            "domain": domain,
            "wave_id": wave_info.get("wave_id"),
            "wave_name": wave_info.get("wave_name"),
            "status": run["status"],
            "step": step,
            "step_progress": live.get("progress"),
            "step_total": live.get("total"),
            "step_message": live.get("message"),
            "leads_found": run.get("leads_found", 0),
            "total_results": run.get("total_results", 0),
            "tier_a": run.get("tier_a", 0),
            "tier_b": run.get("tier_b", 0),
            "tier_c": run.get("tier_c", 0),
            "tier_d": run.get("tier_d", 0),
            "created_at": run.get("created_at"),
            "completed_at": run.get("completed_at"),
            "export_available": run["status"] == "complete" and (run.get("total_results") or 0) > 0,
        })

    # Also include live in-memory runs not yet in DB (very fresh runs)
    for run_id, step_info in live_steps.items():
        if run_id in seen_run_ids:
            continue
        in_mem = get_run(run_id)
        if not in_mem:
            continue
        wave_info = wave_run_map.get(run_id, {})
        domains = in_mem.request.company_domain if in_mem.request else []
        domain = wave_info.get("domain") or (domains[0] if domains else run_id)
        cards.append({
            "run_id": run_id,
            "domain": domain,
            "wave_id": wave_info.get("wave_id"),
            "wave_name": wave_info.get("wave_name"),
            "status": in_mem.status,
            "step": step_info.get("step"),
            "step_progress": step_info.get("progress"),
            "step_total": step_info.get("total"),
            "step_message": step_info.get("message"),
            "leads_found": in_mem.cost.leads_found if in_mem.cost else 0,
            "total_results": 0,
            "tier_a": 0, "tier_b": 0, "tier_c": 0, "tier_d": 0,
            "created_at": in_mem.created_at,
            "completed_at": None,
            "export_available": False,
        })

    # Sort: running first, then by created_at desc
    cards.sort(key=lambda c: (0 if c["status"] == "running" else 1, c.get("created_at") or ""), reverse=False)

    return cards
