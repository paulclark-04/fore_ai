"""Pipeline orchestrator — Apify Search → LinkedIn Enrich → (optional) Score."""

from __future__ import annotations

import asyncio
import logging
import re
import unicodedata
from typing import Dict, List, Optional
from urllib.parse import unquote

logger = logging.getLogger(__name__)

from backend.models.schemas import (
    SearchRequest, LeadResult, PipelineEvent, PipelineRun, CostBreakdown,
)
from backend.models.data_mapper import map_apify_lead, map_linkedin_profile
from backend.services import apify_service, linkedin_enrichment_service
from backend.core.database import save_pipeline_run, upsert_account_vertical

# In-memory storage for pipeline runs
_runs: Dict[str, PipelineRun] = {}
_event_queues: Dict[str, asyncio.Queue] = {}

# Cost constants
LEADS_FINDER_COST_PER_LEAD = 0.002  # $2 per 1,000 leads
LEADS_FINDER_ACTOR_RUN_FEE = 0.02  # $0.02 per actor run
LINKEDIN_ENRICHMENT_COST_PER_PROFILE = 0.004  # $4 per 1,000 profiles
SCORING_COST_PER_AI_CALL = 0.00042  # ~2000 input + ~200 output tokens at Gemini Flash rates

TITLE_FILTER_COST_PER_CALL = 0.0003  # ~1500 input + ~100 output tokens

_TITLE_FILTER_PROMPT = """You are a lead filter for Fore AI, which sells autonomous QA agents for enterprise web application testing (French market).

Given these job titles from a target company, respond with ONLY a JSON array of indices to DROP.
DROP = clearly not related to software, IT, technology, QA, engineering, product, digital, or executive decision-making.
KEEP = anything that COULD be relevant: tech, IT, QA, product, digital, innovation, executive, CIO/DSI/CTO, or ambiguous.

Be CONSERVATIVE. When in doubt, KEEP. Only drop obvious non-fits like:
- HR, recruiting, talent acquisition
- Marketing, brand, social media, communications
- Graphic design, creative direction (NOT UX/product design)
- Freelancers, independent consultants (no internal role)
- Pure finance, accounting, legal (NOT IT audit, NOT fintech roles)

KEEP all of these even if they seem broad:
- Product owners, product managers (even non-technical)
- Any C-level, VP, Director, Head of (they make decisions)
- Anything with: IT, digital, tech, software, QA, test, data, cloud, DevOps, innovation, DSI, CTO, CIO
- Ambiguous titles — when in doubt, KEEP

TITLES:
{titles_list}

Respond with ONLY a JSON array of 0-based indices to drop. Example: [2, 5, 8]
If none should be dropped, respond: []"""


async def _ai_filter_titles(results: list, api_key: str) -> tuple:
    """Use Gemini to batch-classify titles. Returns (kept, filtered_out) lists."""
    titles_list = "\n".join(
        f"{i}. {r.first_name} {r.last_name} — {r.job_title or r.headline}"
        for i, r in enumerate(results)
    )
    prompt = _TITLE_FILTER_PROMPT.replace("{titles_list}", titles_list)

    try:
        from fore_ai_scorer import _get_gemini_client
        from google.genai import types
        import json

        client = _get_gemini_client(api_key)
        if client is None:
            raise RuntimeError("Gemini client unavailable")

        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )
        text = response.text.strip()

        # Parse JSON array from response (handle markdown wrapping)
        json_match = re.search(r'\[.*\]', text, re.DOTALL)
        if not json_match:
            logger.warning("AI title filter returned no JSON array, keeping all leads")
            return results, []

        drop_indices = set(json.loads(json_match.group()))

        kept = [r for i, r in enumerate(results) if i not in drop_indices]
        filtered_out = [r for i, r in enumerate(results) if i in drop_indices]
        return kept, filtered_out

    except Exception as e:
        logger.warning("AI title filter failed (%s), keeping all leads", e)
        return results, []


def _normalize_name(first: str, last: str) -> str:
    """Strip accents, lowercase, and sort name parts for fuzzy matching."""
    raw = f"{first} {last}".strip()
    if not raw:
        return ""
    # Decompose unicode, strip combining marks (accents)
    nfkd = unicodedata.normalize("NFKD", raw)
    ascii_name = "".join(c for c in nfkd if not unicodedata.combining(c))
    return ascii_name.lower().strip()


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
    from datetime import datetime
    run = PipelineRun(
        run_id=run_id, status="running", request=request,
        created_at=datetime.utcnow().isoformat(),
    )
    cost = CostBreakdown()
    run.cost = cost
    _runs[run_id] = run
    _event_queues[run_id] = asyncio.Queue()

    try:
        # Save vertical for each domain if provided
        if request.vertical:
            for domain in request.company_domain:
                upsert_account_vertical(domain, request.vertical)

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
        cost.leads_finder = len(leads) * LEADS_FINDER_COST_PER_LEAD + LEADS_FINDER_ACTOR_RUN_FEE

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

        # ── Step 1.5b: AI-powered title filter ──
        original_count = len(results)
        from backend.config import GOOGLE_API_KEY as _filter_api_key

        await _emit(run_id, PipelineEvent(
            step="filter", status="running",
            total=original_count,
            message=f"Filtering {original_count} leads by title relevance...",
            cost=cost,
        ))

        if _filter_api_key:
            results, filtered_out = await _ai_filter_titles(results, _filter_api_key)
        else:
            filtered_out = []
            logger.warning("No GOOGLE_API_KEY — skipping AI title filter")

        if filtered_out:
            cost.scoring += TITLE_FILTER_COST_PER_CALL
            logger.info(
                "AI title filter: removed %d/%d leads",
                len(filtered_out), original_count,
            )
            for r in filtered_out:
                logger.info("  Filtered: %s %s — %s", r.first_name, r.last_name, r.job_title or r.headline)

        await _emit(run_id, PipelineEvent(
            step="filter", status="complete",
            total=original_count,
            progress=len(results),
            message=f"Kept {len(results)}/{original_count} leads (filtered {len(filtered_out)} non-relevant titles)",
            cost=cost,
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

            # Build lookups by URL and by normalized name
            enrichment_by_url = {}
            enrichment_by_name = {}
            for profile in enriched_profiles:
                mapped = map_linkedin_profile(profile)
                url = unquote((profile.get("linkedinUrl") or "")).rstrip("/").lower()
                if url:
                    enrichment_by_url[url] = mapped
                # Name-based fallback key: strip accents, lowercase
                fn = mapped.get("first_name") or ""
                ln = mapped.get("last_name") or ""
                name_key = _normalize_name(fn, ln)
                if name_key:
                    enrichment_by_name[name_key] = mapped

            # Merge enrichment into results
            enriched_count = 0
            name_fallback_count = 0
            for result in results:
                # Try URL match first
                url_key = unquote(result.linkedin_url).rstrip("/").lower()
                enrichment = enrichment_by_url.get(url_key)
                matched_by = "url" if enrichment else None

                # Fallback: match by normalized name
                if not enrichment:
                    name_key = _normalize_name(result.first_name, result.last_name)
                    enrichment = enrichment_by_name.get(name_key)
                    if enrichment:
                        matched_by = "name"
                        name_fallback_count += 1
                        logger.info(
                            "Name fallback match: %s %s (lead URL: %s → scraper URL: %s)",
                            result.first_name, result.last_name,
                            result.linkedin_url,
                            enrichment.get("linkedin_url", ""),
                        )

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

            # Log enrichment diagnostics
            logger.info(
                "Enrichment: sent=%d, scraper_returned=%d, matched=%d (url=%d, name_fallback=%d)",
                len(linkedin_urls), len(enriched_profiles),
                enriched_count, enriched_count - name_fallback_count, name_fallback_count,
            )
            not_enriched = [
                f"{r.first_name} {r.last_name} ({r.linkedin_url})"
                for r in results if not r.enriched
            ]
            if not_enriched:
                logger.warning("Still not enriched (%d):", len(not_enriched))
                for entry in not_enriched:
                    logger.warning("  %s", entry)

            # Store diagnostics on the run for API access
            run.enrichment_diagnostics = {
                "urls_sent": len(linkedin_urls),
                "scraper_returned": len(enriched_profiles),
                "matched": enriched_count,
                "by_url": enriched_count - name_fallback_count,
                "by_name_fallback": name_fallback_count,
                "not_enriched": not_enriched,
            }

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

            # Concurrent scoring with semaphore
            scoring_semaphore = asyncio.Semaphore(5)
            scored_count = 0

            async def score_one(idx, result):
                nonlocal scored_count
                name = f"{result.first_name} {result.last_name}".strip()

                # Build scorer-compatible dict
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

                async with scoring_semaphore:
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
                result.method = score_result.get("method") or ""
                result.red_flags = score_result.get("red_flags_detail") or ""
                result.special_flags = score_result.get("special_flags") or ""
                result.ai_input = score_result.get("ai_input") or ""
                result.ai_output = score_result.get("ai_output") or ""

                scored_count += 1
                await _emit(run_id, PipelineEvent(
                    step="score", status="running",
                    progress=scored_count, total=len(results),
                    current=name,
                ))

            await asyncio.gather(*[score_one(i, r) for i, r in enumerate(results)])

            # Calculate scoring cost
            ai_scored_count = sum(1 for r in results if r.method == "AI")
            cost.scoring = ai_scored_count * SCORING_COST_PER_AI_CALL

            await _emit(run_id, PipelineEvent(
                step="score", status="complete",
                total=len(results),
                message=f"Scored {len(results)} leads ({ai_scored_count} by AI)",
                cost=cost,
            ))

            # Sort by score when scoring is enabled
            results.sort(key=lambda r: r.score, reverse=True)

        # ── Step 4: Done ──
        run.results = results
        run.status = "complete"
        cost.total = cost.leads_finder + cost.linkedin_enrichment + cost.scoring
        run.cost = cost

        tier_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        if request.enable_scoring:
            for r in results:
                tier_counts[r.tier] = tier_counts.get(r.tier, 0) + 1

        # Persist to SQLite
        save_pipeline_run(run)

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
        cost.total = cost.leads_finder + cost.linkedin_enrichment + cost.scoring
        save_pipeline_run(run)
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
