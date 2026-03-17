#!/usr/bin/env python3
"""
Apify LinkedIn Profile Scraper — Enrich ALL leads with full LinkedIn profiles.
Uses supreme_coder/linkedin-profile-scraper (no cookies, $3/1k profiles).
Deterministic batch API call. No AI needed.

Usage:
    python enrich_profiles_apify.py --input search_results.json
    python enrich_profiles_apify.py --input search_results.json --output enriched.json
    python enrich_profiles_apify.py --urls "https://linkedin.com/in/person1,https://linkedin.com/in/person2"

Reads search_results.json (from search_leads_apollo.py), scrapes all LinkedIn profiles,
merges enrichment data back, outputs enriched JSON.
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
ACTOR_ID = "supreme_coder~linkedin-profile-scraper"
COST_PER_PROFILE = 0.003  # $3/1k profiles


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
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("ERROR: APIFY_API_TOKEN not found", file=sys.stderr)
    sys.exit(1)


def scrape_profiles(token: str, linkedin_urls: list[str], batch_size: int = 50) -> list[dict]:
    """Scrape LinkedIn profiles via Apify. Batches large requests."""
    if not linkedin_urls:
        return []

    all_profiles = []

    # Batch to avoid timeout for large sets
    for i in range(0, len(linkedin_urls), batch_size):
        batch = linkedin_urls[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(linkedin_urls) + batch_size - 1) // batch_size

        print(f"  Batch {batch_num}/{total_batches}: scraping {len(batch)} profiles...", file=sys.stderr)

        payload = {
            "urls": batch,
        }

        url = f"{APIFY_BASE}/acts/{ACTOR_ID}/run-sync-get-dataset-items"
        params = {"token": token}

        with httpx.Client(timeout=600) as client:
            resp = client.post(url, params=params, json=payload, headers={"Content-Type": "application/json"})
            if resp.status_code != 200:
                print(f"  ERROR: Apify batch {batch_num} returned {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
                continue
            results = resp.json()
            all_profiles.extend(results)
            print(f"  Batch {batch_num}: got {len(results)} profiles", file=sys.stderr)

    return all_profiles


def map_profile(raw: dict) -> dict:
    """Map raw Apify profile to clean scorer-compatible format."""
    # Handle positions/experience (varies by scraper)
    positions = []
    for exp in (raw.get("positions") or raw.get("experience") or []):
        pos = {
            "title": exp.get("title") or exp.get("position") or "",
            "company": exp.get("companyName") or exp.get("company") or "",
            "description": exp.get("description") or "",
            "duration": exp.get("duration") or "",
            "location": exp.get("location") or "",
        }
        # Start/end dates
        start = exp.get("start") or {}
        end = exp.get("end")
        if isinstance(start, dict):
            pos["start_year"] = start.get("year")
            pos["start_month"] = start.get("month")
        if isinstance(end, dict):
            pos["end_year"] = end.get("year")
            pos["end_month"] = end.get("month")
        elif end is None:
            pos["end_year"] = None  # Current role
        # startEndDate fallback
        if not pos.get("start_year") and exp.get("startEndDate"):
            pos["date_range"] = exp["startEndDate"]
        positions.append(pos)

    # Handle education
    education = []
    for edu in (raw.get("education") or []):
        education.append({
            "school": edu.get("schoolName") or edu.get("school") or "",
            "degree": edu.get("degree") or edu.get("degreeName") or "",
            "field": edu.get("fieldOfStudy") or edu.get("field") or "",
        })

    # Handle skills
    skills = []
    for skill in (raw.get("skills") or []):
        if isinstance(skill, dict):
            name = skill.get("name") or skill.get("skill") or ""
            if name:
                skills.append(name)
        elif isinstance(skill, str):
            skills.append(skill)
    # Deduplicate skills
    skills = list(dict.fromkeys(skills))

    # Languages
    languages = []
    for lang in (raw.get("languages") or []):
        if isinstance(lang, dict):
            name = lang.get("name") or lang.get("language") or ""
            if name:
                languages.append(name)
        elif isinstance(lang, str):
            languages.append(lang)

    # Certifications
    certifications = []
    for cert in (raw.get("certifications") or []):
        if isinstance(cert, dict):
            name = cert.get("name") or ""
            if name:
                certifications.append(name)
        elif isinstance(cert, str):
            certifications.append(cert)

    return {
        "name": f"{raw.get('firstName', '')} {raw.get('lastName', '')}".strip() or raw.get("name", ""),
        "headline": raw.get("headline") or "",
        "summary": raw.get("about") or raw.get("summary") or "",
        "location": raw.get("location") or raw.get("geo", {}).get("full", "") if isinstance(raw.get("geo"), dict) else raw.get("location", ""),
        "country": raw.get("country") or "",
        "linkedin_url": raw.get("linkedinUrl") or raw.get("url") or raw.get("linkedin_url") or "",
        "positions": positions,
        "education": education,
        "skills": skills,
        "languages": languages,
        "certifications": certifications,
    }


def normalize_url(url: str) -> str:
    """Normalize LinkedIn URL for matching."""
    return unquote(url).rstrip("/").lower().replace("https://www.", "https://").replace("http://", "https://")


def merge_enrichment(leads: list[dict], profiles: list[dict]) -> list[dict]:
    """Merge scraped LinkedIn data back into Apollo leads."""
    # Build lookup by URL
    profile_by_url = {}
    for raw in profiles:
        mapped = map_profile(raw)
        url = normalize_url(mapped.get("linkedin_url") or "")
        if url:
            profile_by_url[url] = mapped

    enriched = []
    match_count = 0
    for lead in leads:
        url = normalize_url(lead.get("linkedinUrl") or "")
        profile = profile_by_url.get(url)

        if profile:
            # Merge: profile data overrides Apollo data (more accurate)
            lead["enriched"] = True
            lead["linkedin_headline"] = profile["headline"]
            lead["linkedin_summary"] = profile["summary"]
            lead["linkedin_location"] = profile["location"]
            lead["positions"] = profile["positions"]
            lead["education"] = profile["education"]
            lead["skills"] = profile["skills"]
            lead["languages"] = profile["languages"]
            lead["certifications"] = profile["certifications"]
            match_count += 1
        else:
            lead["enriched"] = False

        enriched.append(lead)

    print(f"Merged: {match_count}/{len(leads)} leads matched to LinkedIn profiles", file=sys.stderr)
    return enriched


def main():
    parser = argparse.ArgumentParser(description="Enrich leads with LinkedIn profiles via Apify")
    parser.add_argument("--input", "-i", help="Path to search_results.json from Apollo search")
    parser.add_argument("--urls", help="Comma-separated LinkedIn URLs (standalone mode)")
    parser.add_argument("--output", "-o", help="Output file path (default: stdout)")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    parser.add_argument("--batch-size", type=int, default=50, help="Profiles per Apify batch (default: 50)")
    parser.add_argument("--profiles-only", action="store_true", help="Output only mapped profiles (no merge)")
    args = parser.parse_args()

    token = load_env(args.env_file)
    start = time.time()

    if args.input:
        with open(args.input) as f:
            leads = json.load(f)
        linkedin_urls = [l["linkedinUrl"] for l in leads if l.get("linkedinUrl")]
    elif args.urls:
        linkedin_urls = [u.strip() for u in args.urls.split(",")]
        leads = None
    else:
        print("ERROR: Provide --input or --urls", file=sys.stderr)
        sys.exit(1)

    if not linkedin_urls:
        print("WARNING: No LinkedIn URLs to enrich", file=sys.stderr)
        json.dump(leads or [], sys.stdout, indent=2, ensure_ascii=False)
        return

    print(f"Enriching {len(linkedin_urls)} LinkedIn profiles...", file=sys.stderr)
    raw_profiles = scrape_profiles(token, linkedin_urls, args.batch_size)

    if args.profiles_only or leads is None:
        output = [map_profile(p) for p in raw_profiles]
    else:
        output = merge_enrichment(leads, raw_profiles)

    elapsed = time.time() - start
    cost = len(raw_profiles) * COST_PER_PROFILE

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"APIFY ENRICHMENT COMPLETE", file=sys.stderr)
    print(f"  Profiles scraped: {len(raw_profiles)}/{len(linkedin_urls)}", file=sys.stderr)
    print(f"  Time: {elapsed:.1f}s", file=sys.stderr)
    print(f"  Cost: ${cost:.2f}", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"Saved to {args.output}", file=sys.stderr)
    else:
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
