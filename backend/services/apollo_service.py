"""Apollo API service — search and email reveal."""

from __future__ import annotations

import httpx
from backend.config import APOLLO_API_KEY

APOLLO_BASE = "https://api.apollo.io/api/v1"


async def search_people(
    domain: str,
    titles: list[str] | None = None,
    seniorities: list[str] | None = None,
    per_page: int = 25,
    page: int = 1,
) -> list[dict]:
    """Search Apollo for people at a company domain.

    Returns list of person dicts with first_name, last_name_obfuscated,
    title, organization.name, id.
    """
    payload = {
        "q_organization_domains_list": [domain],
        "per_page": min(per_page, 100),
        "page": page,
    }
    if titles:
        payload["person_titles"] = titles
    if seniorities:
        payload["person_seniorities"] = seniorities

    headers = {
        "Content-Type": "application/json",
        "x-api-key": APOLLO_API_KEY,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{APOLLO_BASE}/mixed_people/api_search",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("people", [])


async def reveal_email(
    first_name: str,
    last_name: str,
    organization_name: str,
    linkedin_url: str = "",
) -> dict | None:
    """Reveal email and enrich data via Apollo match.

    Returns full person dict with email, headline, employment_history, etc.
    """
    payload = {
        "first_name": first_name,
        "last_name": last_name,
        "organization_name": organization_name,
    }
    if linkedin_url:
        payload["linkedin_url"] = linkedin_url

    headers = {
        "Content-Type": "application/json",
        "x-api-key": APOLLO_API_KEY,
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{APOLLO_BASE}/people/match",
            headers=headers,
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("person")
