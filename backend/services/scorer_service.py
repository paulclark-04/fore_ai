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
    ai_score_lead_full,
    write_output_xlsx,
)
from backend.config import GOOGLE_API_KEY, SCORING_MODEL, SCORING_PROVIDER

logger = logging.getLogger(__name__)

def _load_prompt():
    """Load the scoring prompt from scoring_prompt.txt. Always reads fresh so
    updates made via /fore-ai-rlhf take effect without server restart."""
    prompt_path = os.path.join(PROJECT_ROOT, "scoring_prompt.txt")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    # Fall back to the embedded prompt in fore_ai_scorer
    from fore_ai_scorer import AI_SCORING_PROMPT
    return AI_SCORING_PROMPT


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
    """Score a lead using full-AI mode, async wrapper."""
    name = f"{lead.get('firstName', '')} {lead.get('lastName', '')}".strip()

    try:
        ai_result = await asyncio.wait_for(
            asyncio.to_thread(score_lead_ai_sync, lead),
            timeout=60,
        )
    except asyncio.TimeoutError:
        logger.warning("AI scoring timed out for %s", name)
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
            "method": "AI",
            "ai_input": ai_result.get("_profile_text", ""),
            "ai_output": ai_result.get("_raw_response", ""),
        }

    return {
        "score": 0,
        "tier": "D",
        "category": "",
        "persona_label": "",
        "reasoning": "AI scoring failed",
        "method": "Error",
        "ai_input": "",
        "ai_output": "",
    }


async def generate_xlsx(results: list[dict], output_path: str):
    """Generate XLSX file from scored results."""
    await asyncio.to_thread(write_output_xlsx, results, output_path)
