#!/usr/bin/env python3
"""
Apify Leads Finder — Search for contacts at target companies.
Calls the code_crafter~leads-finder Apify actor.

Usage:
    python search_leads.py --domains "veepee.fr" --fetch-count 50 --env-file /path/to/.env
    python search_leads.py --domains "airbus.com,bnpparibas.com" --fetch-count 100
    python search_leads.py --domains "veepee.fr" --titles "QA,DevOps,CTO" --seniority "Director,VP,C-Suite"

Output: JSON array of leads to stdout. Pipe to file: > search_results.json
"""

import argparse
import json
import os
import sys
import time

try:
    import httpx
except ImportError:
    print("ERROR: httpx not installed. Run: pip install httpx --break-system-packages", file=sys.stderr)
    sys.exit(1)


APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "code_crafter~leads-finder"
COST_PER_LEAD = 0.002
ACTOR_RUN_FEE = 0.02


def load_env(env_file: str) -> str:
    """Load APIFY_API_TOKEN from .env file or environment."""
    # Check environment first
    token = os.environ.get("APIFY_API_TOKEN")
    if token:
        return token

    # Try .env file
    if env_file and os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("APIFY_API_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return token

    print("ERROR: APIFY_API_TOKEN not found in environment or .env file", file=sys.stderr)
    sys.exit(1)


def search_leads(
    token: str,
    domains: list[str],
    fetch_count: int = 50,
    job_titles: list[str] | None = None,
    seniority_levels: list[str] | None = None,
    location: list[str] | None = None,
    email_status: list[str] | None = None,
) -> list[dict]:
    """Call Apify Leads Finder and return results."""
    payload = {
        "company_domain": domains,
        "fetch_count": fetch_count,
        "file_name": "Leads",
    }
    if job_titles:
        payload["contact_job_title"] = job_titles
    if seniority_levels:
        payload["seniority_level"] = seniority_levels
    if location:
        payload["contact_location"] = location
    if email_status:
        payload["email_status"] = email_status

    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"
    params = {"token": token}

    print(f"Searching for leads at: {', '.join(domains)} (fetch_count={fetch_count})...", file=sys.stderr)
    start = time.time()

    with httpx.Client(timeout=300) as client:
        resp = client.post(url, params=params, json=payload, headers={"Content-Type": "application/json"})
        if resp.status_code != 200:
            print(f"ERROR: Apify returned {resp.status_code}: {resp.text[:500]}", file=sys.stderr)
            resp.raise_for_status()
        results = resp.json()

    elapsed = time.time() - start
    cost = len(results) * COST_PER_LEAD + ACTOR_RUN_FEE
    print(f"Found {len(results)} leads in {elapsed:.1f}s. Estimated cost: ${cost:.3f}", file=sys.stderr)

    return results


def map_lead(raw: dict) -> dict:
    """Map Apify lead output to a clean format for enrichment + scoring."""
    return {
        "firstName": raw.get("first_name") or "",
        "lastName": raw.get("last_name") or "",
        "headline": raw.get("headline") or "",
        "job_title": raw.get("job_title") or "",
        "linkedinUrl": raw.get("linkedin") or "",
        "email": raw.get("email") or raw.get("personal_email") or "",
        "personal_email": raw.get("personal_email") or "",
        "mobile_number": raw.get("mobile_number") or "",
        "phone_number": raw.get("phone_number") or "",
        "website": raw.get("website") or "",
        "company_name": raw.get("company_name") or "",
        "seniority_level": raw.get("seniority_level") or "",
        "functional_level": raw.get("functional_level") or "",
        "country": raw.get("country") or "",
    }


def main():
    parser = argparse.ArgumentParser(description="Search for leads via Apify Leads Finder")
    parser.add_argument("--domains", required=True, help="Comma-separated company domains")
    parser.add_argument("--fetch-count", type=int, default=50, help="Max leads to fetch (default: 50)")
    parser.add_argument("--titles", help="Comma-separated job title filters")
    parser.add_argument("--seniority", help="Comma-separated seniority filters")
    parser.add_argument("--location", help="Comma-separated location filters")
    parser.add_argument("--email-status", help="Comma-separated email status filters")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    parser.add_argument("--raw", action="store_true", help="Output raw Apify response (don't map)")
    args = parser.parse_args()

    token = load_env(args.env_file)
    domains = [d.strip() for d in args.domains.split(",")]
    titles = [t.strip() for t in args.titles.split(",")] if args.titles else None
    seniority = [s.strip() for s in args.seniority.split(",")] if args.seniority else None
    location = [l.strip() for l in args.location.split(",")] if args.location else None
    email_status = [e.strip() for e in args.email_status.split(",")] if args.email_status else None

    results = search_leads(token, domains, args.fetch_count, titles, seniority, location, email_status)

    if args.raw:
        output = results
    else:
        output = [map_lead(r) for r in results]

    json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
    print(file=sys.stderr)  # newline after JSON


if __name__ == "__main__":
    main()
