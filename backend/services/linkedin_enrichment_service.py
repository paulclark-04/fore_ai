"""Apify LinkedIn Profile Scraper service — enrich leads with full LinkedIn profile data."""

from __future__ import annotations

from typing import Optional

import httpx
from backend.config import APIFY_API_TOKEN

APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "harvestapi~linkedin-profile-scraper"

# Pricing: $4 per 1,000 profiles (no email mode)
COST_PER_PROFILE = 0.004


async def enrich_profiles(
    linkedin_urls: list[str],
) -> list[dict]:
    """Run the LinkedIn Profile Scraper actor and return enriched profile data.

    Uses the synchronous run-sync-get-dataset-items endpoint.
    Timeout is generous (600s) since scraping many profiles takes time.

    Input: list of LinkedIn profile URLs
    Output: list of enriched profile dicts with full experience, education,
            skills, about section, etc.
    """
    if not linkedin_urls:
        return []

    payload = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "urls": linkedin_urls,
    }

    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"
    params = {"token": APIFY_API_TOKEN}

    async with httpx.AsyncClient(timeout=600) as client:
        resp = await client.post(
            url,
            params=params,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def enrich_profiles_async(
    linkedin_urls: list[str],
) -> str:
    """Start the LinkedIn Profile Scraper asynchronously. Returns run ID."""
    if not linkedin_urls:
        return ""

    payload = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "urls": linkedin_urls,
    }

    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/runs"
    params = {"token": APIFY_API_TOKEN}

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            params=params,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data["data"]["id"]


def estimate_cost(num_profiles: int) -> float:
    """Estimate the cost for enriching N profiles."""
    return num_profiles * COST_PER_PROFILE
