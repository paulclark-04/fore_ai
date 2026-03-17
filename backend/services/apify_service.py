"""Apify Leads Finder service — search for leads via Apify actor."""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

import httpx
from backend.config import APIFY_API_TOKEN

logger = logging.getLogger(__name__)

APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "code_crafter~leads-finder"


async def run_leads_finder(
    company_domains: list[str],
    job_titles: Optional[list[str]] = None,
    seniority_levels: Optional[list[str]] = None,
    location: Optional[list[str]] = None,
    email_status: Optional[list[str]] = None,
    fetch_count: int = 100,
    file_name: str = "Leads",
) -> list[dict]:
    """Run the Apify Leads Finder actor and return dataset items.

    Uses the synchronous run-sync-get-dataset-items endpoint which
    waits for completion and returns results directly.

    Returns list of lead dicts with fields like:
      first_name, last_name, email, personal_email, mobile_number,
      job_title, headline, linkedin, seniority_level, functional_level,
      company_name, country, etc.
    """
    payload = {
        "company_domain": company_domains,
        "fetch_count": fetch_count,
        "file_name": file_name,
    }

    if job_titles:
        payload["contact_job_title"] = job_titles
    if seniority_levels:
        payload["seniority_level"] = seniority_levels
    if location:
        # Apify requires lowercase location values (e.g. "united kingdom" not "United Kingdom")
        payload["contact_location"] = [l.lower() for l in location]
    if email_status:
        payload["email_status"] = email_status

    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"
    # Apify sync timeout (seconds) — must be ≤ 300. Pass it as a query param so
    # the server waits long enough before returning 400 (TIMED-OUT).
    params = {"token": APIFY_API_TOKEN, "timeout": 300}

    logger.info("Leads Finder payload: %s", payload)
    async with httpx.AsyncClient(timeout=360) as client:
        resp = await client.post(
            url,
            params=params,
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        if resp.status_code != 200:
            logger.error("Leads Finder error %d: %s", resp.status_code, resp.text[:500])
        resp.raise_for_status()
        return resp.json()


async def run_leads_finder_async(
    company_domains: list[str],
    job_titles: Optional[list[str]] = None,
    seniority_levels: Optional[list[str]] = None,
    location: Optional[list[str]] = None,
    email_status: Optional[list[str]] = None,
    fetch_count: int = 100,
    file_name: str = "Leads",
) -> str:
    """Start the Apify Leads Finder actor asynchronously.

    Returns the run ID for polling.
    """
    payload = {
        "company_domain": company_domains,
        "fetch_count": fetch_count,
        "file_name": file_name,
    }

    if job_titles:
        payload["contact_job_title"] = job_titles
    if seniority_levels:
        payload["seniority_level"] = seniority_levels
    if location:
        payload["contact_location"] = [l.lower() for l in location]
    if email_status:
        payload["email_status"] = email_status

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


async def poll_run(run_id: str, poll_interval: float = 2.0) -> dict:
    """Poll an Apify run until it finishes. Returns the run object."""
    url = f"{APIFY_BASE}/actor-runs/{run_id}"
    params = {"token": APIFY_API_TOKEN}

    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            run_data = resp.json()["data"]

            status = run_data.get("status")
            if status in ("SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"):
                return run_data

            await asyncio.sleep(poll_interval)


async def get_dataset_items(dataset_id: str) -> list[dict]:
    """Fetch all items from an Apify dataset."""
    url = f"{APIFY_BASE}/datasets/{dataset_id}/items"
    params = {"token": APIFY_API_TOKEN}

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        return resp.json()
