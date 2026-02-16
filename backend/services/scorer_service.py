"""Wraps fore_ai_scorer.py functions for async use in the web app."""

from __future__ import annotations

import asyncio
import logging
import os
import sys

# Add project root to path so we can import fore_ai_scorer
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fore_ai_scorer import (
    score_lead,
    ai_score_lead_full,
    build_profile_text,
    write_output_xlsx,
)
from backend.config import GOOGLE_API_KEY, SCORING_MODEL, SCORING_PROVIDER

logger = logging.getLogger(__name__)

# Load prompt template once at import time
_prompt_template = None


def _load_prompt():
    """Load the scoring prompt from scoring_prompt.txt."""
    global _prompt_template
    if _prompt_template is not None:
        return _prompt_template

    prompt_path = os.path.join(PROJECT_ROOT, "scoring_prompt.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            _prompt_template = f.read()
    else:
        # Fall back to the embedded prompt in fore_ai_scorer
        from fore_ai_scorer import AI_SCORING_PROMPT
        _prompt_template = AI_SCORING_PROMPT
    return _prompt_template


def score_lead_sync(lead: dict) -> dict:
    """Score a lead using deterministic rules. Returns result dict."""
    return score_lead(lead)


def score_lead_ai_sync(lead: dict) -> dict:
    """Score a lead using full-AI mode (Gemini). Returns result dict or None."""
    prompt = _load_prompt()
    return ai_score_lead_full(
        lead,
        api_key=GOOGLE_API_KEY,
        model=SCORING_MODEL,
        prompt_template=prompt,
        provider=SCORING_PROVIDER,
    )


async def score_lead_async(lead: dict) -> dict:
    """Score a lead using full-AI mode, async wrapper.

    Falls back to rules-only if AI fails.
    """
    name = f"{lead.get('firstName', '')} {lead.get('lastName', '')}".strip()

    # Try AI scoring first
    if GOOGLE_API_KEY:
        try:
            ai_result = await asyncio.wait_for(
                asyncio.to_thread(score_lead_ai_sync, lead),
                timeout=30,
            )
        except asyncio.TimeoutError:
            logger.warning("AI scoring timed out for %s, falling back to rules", name)
            ai_result = None
        except Exception as e:
            logger.warning("AI scoring failed for %s: %s", name, e)
            ai_result = None

        if ai_result:
            return {
                "score": ai_result.get("score", 0),
                "tier": ai_result.get("tier", "D"),
                "category": ai_result.get("category", ""),
                "persona_label": ai_result.get("persona_label", ""),
                "reasoning": ai_result.get("reasoning", ""),
                "outreach_angle": ai_result.get("outreach_angle", ""),
                "method": "AI",
            }

    # Fallback to rules
    rules_result = await asyncio.to_thread(score_lead_sync, lead)
    return {
        "score": rules_result.get("score", 0),
        "tier": rules_result.get("tier", "D"),
        "category": rules_result.get("category", ""),
        "persona_label": rules_result.get("persona_label", ""),
        "reasoning": rules_result.get("reasoning", ""),
        "outreach_angle": "",
        "method": "Rules",
        "seniority": rules_result.get("seniority", ""),
        "red_flags_detail": rules_result.get("red_flags_detail", ""),
        "special_flags": rules_result.get("special_flags", ""),
    }


async def generate_xlsx(results: list[dict], output_path: str):
    """Generate XLSX file from scored results."""
    await asyncio.to_thread(write_output_xlsx, results, output_path)
