"""LinkedIn profile enrichment via RapidAPI.

This is an optional enrichment step. If the API is not subscribed or fails,
the pipeline continues with Apollo data only.
"""

from __future__ import annotations

import httpx
from backend.config import RAPIDAPI_KEY

RAPIDAPI_HOST = "fresh-linkedin-profile-data.p.rapidapi.com"


async def get_profile(linkedin_url: str) -> dict | None:
    """Fetch full LinkedIn profile by URL.

    Returns profile dict with experiences, education, about, skills,
    or None if the API is not available.
    """
    if not RAPIDAPI_KEY or not linkedin_url:
        return None

    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {"linkedin_url": linkedin_url}

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://{RAPIDAPI_HOST}/get-linkedin-profile",
                headers=headers,
                params=params,
            )
            if resp.status_code == 403:
                # Not subscribed — silently skip
                return None
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and data.get("data"):
                return data["data"]
            return data
    except Exception:
        return None


async def search_person(name: str, company: str) -> str | None:
    """Search LinkedIn for a person by name + company, return profile URL.

    Returns LinkedIn URL or None if not found.
    """
    if not RAPIDAPI_KEY:
        return None

    headers = {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {
        "name": name,
        "company": company,
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"https://{RAPIDAPI_HOST}/search-people",
                headers=headers,
                params=params,
            )
            if resp.status_code == 403:
                return None
            resp.raise_for_status()
            data = resp.json()
            results = data.get("data", [])
            if isinstance(results, list) and results:
                return results[0].get("linkedin_url") or results[0].get("url")
    except Exception:
        pass
    return None
