"""Pipeline orchestrator — runs the full Apify search → score flow."""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from backend.models.schemas import SearchRequest, LeadResult, PipelineEvent, PipelineRun
from backend.models.data_mapper import map_apify_lead
from backend.services import apify_service, scorer_service

# In-memory storage for pipeline runs
_runs: Dict[str, PipelineRun] = {}
_event_queues: Dict[str, asyncio.Queue] = {}


def get_run(run_id: str) -> Optional[PipelineRun]:
    return _runs.get(run_id)


def get_event_queue(run_id: str) -> Optional[asyncio.Queue]:
    return _event_queues.get(run_id)


async def _emit(run_id: str, event: PipelineEvent):
    """Push an SSE event to the run's queue."""
    queue = _event_queues.get(run_id)
    if queue:
        await queue.put(event)


async def run_pipeline(run_id: str, request: SearchRequest):
    """Execute the lead scoring pipeline: Apify Search → AI Score → Results."""
    run = PipelineRun(run_id=run_id, status="running", request=request)
    _runs[run_id] = run
    _event_queues[run_id] = asyncio.Queue()

    try:
        # ── Step 1: Apify Leads Finder ──
        domains_display = ", ".join(request.company_domain)
        await _emit(run_id, PipelineEvent(
            step="search", status="running",
            message=f"Searching Apify for leads at {domains_display}...",
        ))

        leads = await apify_service.run_leads_finder(
            company_domains=request.company_domain,
            job_titles=request.job_titles,
            seniority_levels=request.seniority_levels,
            location=request.location,
            email_status=request.email_status,
            fetch_count=request.fetch_count,
        )

        await _emit(run_id, PipelineEvent(
            step="search", status="complete",
            total=len(leads),
            message=f"Found {len(leads)} contacts",
        ))

        if not leads:
            run.status = "complete"
            run.results = []
            await _emit(run_id, PipelineEvent(
                step="done", status="complete",
                message="No contacts found. Try different filters or domain.",
                summary={"A": 0, "B": 0, "C": 0, "D": 0},
            ))
            return

        # ── Step 2: Map & Score each lead ──
        await _emit(run_id, PipelineEvent(
            step="score", status="running", total=len(leads),
            message="Scoring leads with AI...",
        ))

        results: List[LeadResult] = []
        for i, raw_lead in enumerate(leads):
            # Map Apify output to scorer format
            lead = map_apify_lead(raw_lead)
            name = f"{lead.get('firstName', '')} {lead.get('lastName', '')}".strip()

            await _emit(run_id, PipelineEvent(
                step="score", status="running",
                progress=i + 1, total=len(leads),
                current=name,
            ))

            try:
                score_result = await scorer_service.score_lead_async(lead)
            except Exception as e:
                score_result = {
                    "score": 0, "tier": "D", "category": "",
                    "persona_label": "", "reasoning": f"Scoring error: {e}",
                    "method": "Error",
                }

            result = LeadResult(
                first_name=lead.get("firstName") or "",
                last_name=lead.get("lastName") or "",
                headline=lead.get("headline") or "",
                job_title=lead.get("experience/0/position") or "",
                company=lead.get("currentPosition/0/companyName") or "",
                linkedin_url=lead.get("linkedinUrl") or "",
                email=lead.get("email") or "",
                personal_email=lead.get("personal_email") or "",
                mobile_number=str(lead.get("mobile_number") or ""),
                seniority_level=lead.get("seniority_level") or "",
                functional_level=lead.get("functional_level") or "",
                country=lead.get("country") or "",
                score=score_result.get("score") or 0,
                tier=score_result.get("tier") or "D",
                category=score_result.get("category") or "",
                persona_label=score_result.get("persona_label") or "",
                reasoning=score_result.get("reasoning") or "",
                outreach_angle=score_result.get("outreach_angle") or "",
                method=score_result.get("method") or "",
                red_flags=score_result.get("red_flags_detail") or "",
                special_flags=score_result.get("special_flags") or "",
            )
            results.append(result)

            # Rate limit only actual AI (Gemini) calls
            if score_result.get("method") == "AI":
                await asyncio.sleep(0.5)

        await _emit(run_id, PipelineEvent(
            step="score", status="complete",
            total=len(results),
            message=f"Scored {len(results)} leads",
        ))

        # ── Step 3: Done ──
        results.sort(key=lambda r: r.score, reverse=True)
        run.results = results
        run.status = "complete"

        tier_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        for r in results:
            tier_counts[r.tier] = tier_counts.get(r.tier, 0) + 1

        await _emit(run_id, PipelineEvent(
            step="done", status="complete",
            summary=tier_counts,
            message=f"Pipeline complete — {tier_counts['A'] + tier_counts['B']} actionable leads",
        ))

    except Exception as e:
        run.status = "error"
        run.error = str(e)
        await _emit(run_id, PipelineEvent(
            step="error", status="error",
            message=f"Pipeline failed: {e}",
        ))

    finally:
        # Signal end of stream
        queue = _event_queues.get(run_id)
        if queue:
            await queue.put(None)
