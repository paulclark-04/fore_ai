#!/usr/bin/env python3
"""
Apify LinkedIn Profile Scraper — Enrich leads with full LinkedIn profile data.
Calls the harvestapi~linkedin-profile-scraper Apify actor.

Usage:
    python enrich_profiles.py --input search_results.json --env-file /path/to/.env
    python enrich_profiles.py --urls "https://linkedin.com/in/person1,https://linkedin.com/in/person2"

Output: JSON with enriched profiles merged into original lead data. Stdout.
"""

import argparse
import json
import os
import sys
import time
import unicodedata
from urllib.parse import unquote

try:
    import httpx
except ImportError:
    print("ERROR: httpx not installed. Run: pip install httpx --break-system-packages", file=sys.stderr)
    sys.exit(1)


APIFY_BASE = "https://api.apify.com/v2"
ACTOR_ID = "harvestapi~linkedin-profile-scraper"
COST_PER_PROFILE = 0.004


def load_env(env_file: str) -> str:
    """Load APIFY_API_TOKEN from .env file or environment."""
    token = os.environ.get("APIFY_API_TOKEN")
    if token:
        return token

    if env_file and os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("APIFY_API_TOKEN="):
                    token = line.split("=", 1)[1].strip().strip('"').strip("'")
                    return token

    print("ERROR: APIFY_API_TOKEN not found in environment or .env file", file=sys.stderr)
    sys.exit(1)


def normalize_name(first: str, last: str) -> str:
    """Strip accents, lowercase, and normalize for fuzzy matching."""
    raw = f"{first} {last}".strip()
    if not raw:
        return ""
    nfkd = unicodedata.normalize("NFKD", raw)
    ascii_name = "".join(c for c in nfkd if not unicodedata.combining(c))
    return ascii_name.lower().strip()


def enrich_profiles(token: str, linkedin_urls: list[str]) -> list[dict]:
    """Call Apify LinkedIn Profile Scraper and return enriched profiles."""
    if not linkedin_urls:
        return []

    payload = {
        "profileScraperMode": "Profile details no email ($4 per 1k)",
        "urls": linkedin_urls,
    }

    url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"
    params = {"token": token}

    print(f"Enriching {len(linkedin_urls)} LinkedIn profiles...", file=sys.stderr)
    start = time.time()

    with httpx.Client(timeout=600) as client:
        resp = client.post(url, params=params, json=payload, headers={"Content-Type": "application/json"})
        if resp.status_code != 200:
            print(f"ERROR: Apify returned {resp.status_code}: {resp.text[:500]}", file=sys.stderr)
            resp.raise_for_status()
        results = resp.json()

    elapsed = time.time() - start
    cost = len(results) * COST_PER_PROFILE
    print(f"Enriched {len(results)} profiles in {elapsed:.1f}s. Cost: ${cost:.3f}", file=sys.stderr)

    return results


def map_linkedin_profile(profile: dict) -> dict:
    """Extract key fields from LinkedIn scraper response."""
    experience = []
    for exp in (profile.get("experience") or []):
        experience.append({
            "position": exp.get("position") or exp.get("title") or "",
            "companyName": exp.get("companyName") or exp.get("company") or "",
            "description": exp.get("description") or "",
            "duration": exp.get("duration") or "",
            "location": exp.get("location") or "",
            "startEndDate": exp.get("startEndDate") or exp.get("date") or "",
            "employmentType": exp.get("employmentType") or "",
        })

    education = []
    for edu in (profile.get("education") or []):
        education.append({
            "schoolName": edu.get("schoolName") or edu.get("school") or "",
            "degree": edu.get("degree") or edu.get("degreeName") or "",
            "fieldOfStudy": edu.get("fieldOfStudy") or "",
            "startEndDate": edu.get("startEndDate") or edu.get("date") or "",
        })

    skills = []
    for skill in (profile.get("skills") or []):
        if isinstance(skill, dict):
            skills.append(skill.get("name") or skill.get("skill") or str(skill))
        else:
            skills.append(str(skill))

    languages = []
    for lang in (profile.get("languages") or []):
        if isinstance(lang, dict):
            languages.append(lang.get("name") or lang.get("language") or str(lang))
        else:
            languages.append(str(lang))

    certifications = []
    for cert in (profile.get("certifications") or []):
        if isinstance(cert, dict):
            certifications.append(cert.get("name") or cert.get("certification") or str(cert))
        else:
            certifications.append(str(cert))

    return {
        "linkedinUrl": profile.get("linkedinUrl") or profile.get("url") or "",
        "firstName": profile.get("firstName") or profile.get("first_name") or "",
        "lastName": profile.get("lastName") or profile.get("last_name") or "",
        "headline": profile.get("headline") or "",
        "about": profile.get("about") or profile.get("summary") or "",
        "experience": experience,
        "education": education,
        "skills": skills,
        "languages": languages,
        "certifications": certifications,
        "connectionsCount": profile.get("connectionsCount") or profile.get("connections") or 0,
    }


def merge_enrichment(leads: list[dict], profiles: list[dict]) -> list[dict]:
    """Merge enriched profile data into search results by URL or name match."""
    # Build lookups
    by_url = {}
    by_name = {}
    for profile in profiles:
        mapped = map_linkedin_profile(profile)
        url = unquote(mapped.get("linkedinUrl") or "").rstrip("/").lower()
        if url:
            by_url[url] = mapped
        name_key = normalize_name(mapped.get("firstName", ""), mapped.get("lastName", ""))
        if name_key:
            by_name[name_key] = mapped

    enriched_count = 0
    for lead in leads:
        # Try URL match first
        url_key = unquote(lead.get("linkedinUrl") or "").rstrip("/").lower()
        enrichment = by_url.get(url_key)

        # Fallback: name match
        if not enrichment:
            name_key = normalize_name(lead.get("firstName", ""), lead.get("lastName", ""))
            enrichment = by_name.get(name_key)

        if enrichment:
            lead["about"] = enrichment.get("about") or ""
            lead["headline"] = enrichment.get("headline") or lead.get("headline", "")
            lead["experience"] = enrichment.get("experience") or []
            lead["education"] = enrichment.get("education") or []
            lead["skills"] = enrichment.get("skills") or []
            lead["languages"] = enrichment.get("languages") or []
            lead["certifications"] = enrichment.get("certifications") or []
            lead["connectionsCount"] = enrichment.get("connectionsCount") or 0
            lead["enriched"] = True
            enriched_count += 1
            # Update name if enrichment has better data
            if enrichment.get("firstName"):
                lead["firstName"] = enrichment["firstName"]
            if enrichment.get("lastName"):
                lead["lastName"] = enrichment["lastName"]
        else:
            lead["enriched"] = False

    print(f"Merged: {enriched_count}/{len(leads)} leads matched to enriched profiles", file=sys.stderr)
    return leads


def main():
    parser = argparse.ArgumentParser(description="Enrich leads with LinkedIn profile data")
    parser.add_argument("--input", help="Path to search_results.json from search_leads.py")
    parser.add_argument("--urls", help="Comma-separated LinkedIn URLs (alternative to --input)")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    parser.add_argument("--raw", action="store_true", help="Output raw Apify response (don't merge)")
    args = parser.parse_args()

    token = load_env(args.env_file)

    if args.input:
        with open(args.input) as f:
            leads = json.load(f)
        linkedin_urls = [l["linkedinUrl"] for l in leads if l.get("linkedinUrl")]
    elif args.urls:
        linkedin_urls = [u.strip() for u in args.urls.split(",")]
        leads = None
    else:
        print("ERROR: Provide --input (JSON from search) or --urls (comma-separated LinkedIn URLs)", file=sys.stderr)
        sys.exit(1)

    if not linkedin_urls:
        print("WARNING: No LinkedIn URLs to enrich", file=sys.stderr)
        json.dump(leads or [], sys.stdout, indent=2, ensure_ascii=False)
        return

    profiles = enrich_profiles(token, linkedin_urls)

    if args.raw or leads is None:
        output = [map_linkedin_profile(p) for p in profiles]
    else:
        output = merge_enrichment(leads, profiles)

    json.dump(output, sys.stdout, indent=2, ensure_ascii=False)
    print(file=sys.stderr)


if __name__ == "__main__":
    main()
