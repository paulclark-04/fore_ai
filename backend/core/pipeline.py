"""Pipeline orchestrator — Apify Search → LinkedIn Enrich → (optional) Score."""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from backend.models.schemas import (
    SearchRequest, LeadResult, PipelineEvent, PipelineRun, CostBreakdown,
)
from backend.models.data_mapper import map_apify_lead, map_linkedin_profile
from backend.services import apify_service, linkedin_enrichment_service

# In-memory storage for pipeline runs
_runs: Dict[str, PipelineRun] = {}
_event_queues: Dict[str, asyncio.Queue] = {}

# Cost constants
LEADS_FINDER_COST_PER_LEAD = 0.0015  # ~$1.5 per 1,000 leads
LINKEDIN_ENRICHMENT_COST_PER_PROFILE = 0.004  # $4 per 1,000 profiles


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
    """Execute the pipeline: Apify Search → LinkedIn Enrich → (optional) Score."""
    run = PipelineRun(run_id=run_id, status="running", request=request)
    cost = CostBreakdown()
    run.cost = cost
    _runs[run_id] = run
    _event_queues[run_id] = asyncio.Queue()

    try:
        # ── Step 1: Apify Leads Finder ──
        domains_display = ", ".join(request.company_domain)
        await _emit(run_id, PipelineEvent(
            step="search", status="running",
            message=f"Searching for leads at {domains_display}...",
        ))

        leads = await apify_service.run_leads_finder(
            company_domains=request.company_domain,
            job_titles=request.job_titles,
            seniority_levels=request.seniority_levels,
            location=request.location,
            email_status=request.email_status,
            fetch_count=request.fetch_count,
        )

        # Update cost
        cost.leads_found = len(leads)
        cost.leads_finder = len(leads) * LEADS_FINDER_COST_PER_LEAD

        await _emit(run_id, PipelineEvent(
            step="search", status="complete",
            total=len(leads),
            message=f"Found {len(leads)} contacts",
            cost=cost,
        ))

        if not leads:
            run.status = "complete"
            run.results = []
            cost.total = cost.leads_finder
            await _emit(run_id, PipelineEvent(
                step="done", status="complete",
                message="No contacts found. Try different filters or domain.",
                summary={"A": 0, "B": 0, "C": 0, "D": 0},
                cost=cost,
            ))
            return

        # ── Step 1.5: Map leads to LeadResult objects ──
        results: List[LeadResult] = []
        for raw_lead in leads:
            lead = map_apify_lead(raw_lead)
            results.append(LeadResult(
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
            ))

        # ── Step 2: LinkedIn Profile Enrichment ──
        # Collect LinkedIn URLs for enrichment
        linkedin_urls = [r.linkedin_url for r in results if r.linkedin_url]

        if linkedin_urls:
            await _emit(run_id, PipelineEvent(
                step="enrich", status="running",
                total=len(linkedin_urls),
                message=f"Enriching {len(linkedin_urls)} LinkedIn profiles...",
            ))

            enriched_profiles = await linkedin_enrichment_service.enrich_profiles(
                linkedin_urls=linkedin_urls,
            )

            # Update cost
            cost.profiles_enriched = len(enriched_profiles)
            cost.linkedin_enrichment = len(enriched_profiles) * LINKEDIN_ENRICHMENT_COST_PER_PROFILE

            # Build a lookup by LinkedIn URL for matching
            enrichment_by_url = {}
            for profile in enriched_profiles:
                url = (profile.get("linkedinUrl") or "").rstrip("/").lower()
                if url:
                    enrichment_by_url[url] = map_linkedin_profile(profile)

            # Merge enrichment into results
            enriched_count = 0
            for result in results:
                url_key = result.linkedin_url.rstrip("/").lower()
                enrichment = enrichment_by_url.get(url_key)
                if enrichment:
                    result.about = enrichment.get("about") or ""
                    result.headline = enrichment.get("headline") or result.headline
                    result.experience = enrichment.get("experience")
                    result.education = enrichment.get("education")
                    result.skills = enrichment.get("skills")
                    result.languages = enrichment.get("languages")
                    result.certifications = enrichment.get("certifications")
                    result.connections_count = enrichment.get("connections_count") or 0
                    result.enriched = True
                    enriched_count += 1

                    # Update name if enrichment has better data
                    if enrichment.get("first_name"):
                        result.first_name = enrichment["first_name"]
                    if enrichment.get("last_name"):
                        result.last_name = enrichment["last_name"]

            await _emit(run_id, PipelineEvent(
                step="enrich", status="complete",
                total=len(linkedin_urls),
                progress=enriched_count,
                message=f"Enriched {enriched_count}/{len(linkedin_urls)} profiles",
                cost=cost,
            ))
        else:
            await _emit(run_id, PipelineEvent(
                step="enrich", status="complete",
                message="No LinkedIn URLs to enrich",
                cost=cost,
            ))

        # ── Step 3: Scoring (optional) ──
        if request.enable_scoring:
            from backend.services import scorer_service
            from backend.models.data_mapper import build_enriched_lead_dict

            await _emit(run_id, PipelineEvent(
                step="score", status="running", total=len(results),
                message="Scoring leads with AI...",
            ))

            for i, result in enumerate(results):
                name = f"{result.first_name} {result.last_name}".strip()
                await _emit(run_id, PipelineEvent(
                    step="score", status="running",
                    progress=i + 1, total=len(results),
                    current=name,
                ))

                # Build scorer-compatible dict from result + enrichment
                result_dict = result.dict()
                enrichment = {
                    "about": result.about,
                    "headline": result.headline,
                    "experience": result.experience or [],
                    "education": result.education or [],
                    "skills": result.skills or [],
                    "first_name": result.first_name,
                    "last_name": result.last_name,
                    "linkedin_url": result.linkedin_url,
                }
                lead_for_scorer = build_enriched_lead_dict(result_dict, enrichment)

                try:
                    score_result = await scorer_service.score_lead_async(lead_for_scorer)
                except Exception as e:
                    score_result = {
                        "score": 0, "tier": "D", "category": "",
                        "persona_label": "", "reasoning": f"Scoring error: {e}",
                        "method": "Error",
                    }

                result.score = score_result.get("score") or 0
                result.tier = score_result.get("tier") or "D"
                result.category = score_result.get("category") or ""
                result.persona_label = score_result.get("persona_label") or ""
                result.reasoning = score_result.get("reasoning") or ""
                result.outreach_angle = score_result.get("outreach_angle") or ""
                result.method = score_result.get("method") or ""
                result.red_flags = score_result.get("red_flags_detail") or ""
                result.special_flags = score_result.get("special_flags") or ""

                # Rate limit only actual AI (Gemini) calls
                if score_result.get("method") == "AI":
                    await asyncio.sleep(0.5)

            await _emit(run_id, PipelineEvent(
                step="score", status="complete",
                total=len(results),
                message=f"Scored {len(results)} leads",
            ))

            # Sort by score when scoring is enabled
            results.sort(key=lambda r: r.score, reverse=True)

        # ── Step 4: Done ──
        run.results = results
        run.status = "complete"
        cost.total = cost.leads_finder + cost.linkedin_enrichment
        run.cost = cost

        tier_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        if request.enable_scoring:
            for r in results:
                tier_counts[r.tier] = tier_counts.get(r.tier, 0) + 1

        msg = f"Pipeline complete — {len(results)} leads"
        if request.enable_scoring:
            msg += f" — {tier_counts['A'] + tier_counts['B']} actionable"

        await _emit(run_id, PipelineEvent(
            step="done", status="complete",
            summary=tier_counts if request.enable_scoring else None,
            message=msg,
            cost=cost,
        ))

    except Exception as e:
        run.status = "error"
        run.error = str(e)
        cost.total = cost.leads_finder + cost.linkedin_enrichment
        await _emit(run_id, PipelineEvent(
            step="error", status="error",
            message=f"Pipeline failed: {e}",
            cost=cost,
        ))

    finally:
        # Signal end of stream
        queue = _event_queues.get(run_id)
        if queue:
            await queue.put(None)
