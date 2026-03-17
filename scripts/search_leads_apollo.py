#!/usr/bin/env python3
"""
Apollo People Search + Enrichment — Find ALL leads at a target company.
Step 1: Search (free) → get person IDs + basic info
Step 2: Bulk enrich (1 credit/person) → get full names, LinkedIn URLs, emails
Paginates through ALL results. Deterministic, no AI needed.

Usage:
    python search_leads_apollo.py --domain ca-cib.com
    python search_leads_apollo.py --domain airbus.com --output data/search_airbus.json
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


APOLLO_BASE = "https://api.apollo.io/api/v1"

# ICP title filters — two waves
TITLES_WAVE_1 = [
    "QA", "Quality Assurance", "Test Manager", "Release Manager",
    "DevOps", "Engineering Manager", "Software", "Platform",
    "CI/CD", "Automation", "SDET",
]

TITLES_WAVE_2 = [
    "Digital Transformation", "Innovation", "Product Owner",
    "Delivery Manager", "VP Technology", "VP Engineering",
    "CTO", "Chief Technology", "Chief Digital", "Chief Information",
    "Director IT", "Director Engineering", "Head of IT",
]

SENIORITIES = ["senior", "manager", "director", "vp", "c_suite"]
LOCATIONS = ["France"]


def load_api_key(env_file: str) -> str:
    key = os.environ.get("APOLLO_API_KEY")
    if key:
        return key
    if env_file and os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line.startswith("APOLLO_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    print("ERROR: APOLLO_API_KEY not found", file=sys.stderr)
    sys.exit(1)


def search_apollo(api_key, domain, person_titles, seniorities, locations, max_pages=20, per_page=100):
    """Search Apollo API, paginate, return raw person dicts with IDs."""
    all_results = []
    page = 1
    headers = {"Content-Type": "application/json", "X-Api-Key": api_key}

    while page <= max_pages:
        payload = {
            "q_organization_domains_list": [domain],
            "person_titles": person_titles,
            "person_seniorities": seniorities,
            "person_locations": locations,
            "page": page,
            "per_page": per_page,
        }

        with httpx.Client(timeout=30) as client:
            resp = client.post(f"{APOLLO_BASE}/mixed_people/api_search", headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"  ERROR: Apollo search returned {resp.status_code}: {resp.text[:300]}", file=sys.stderr)
                break
            data = resp.json()

        people = data.get("people") or []
        pagination = data.get("pagination", {})
        total = pagination.get("total_entries", 0)

        all_results.extend(people)

        if page == 1:
            total_pages = pagination.get("total_pages", 1)
            print(f"  Total: {total} leads, {total_pages} pages", file=sys.stderr)

        if len(people) < per_page:
            break
        page += 1
        time.sleep(0.3)

    return all_results


def enrich_batch(api_key, person_details, batch_size=10):
    """Bulk enrich people via Apollo to get LinkedIn URLs, emails, full names.
    Uses people/bulk_match with first_name + domain or ID."""
    headers = {"Content-Type": "application/json", "X-Api-Key": api_key}
    all_enriched = []

    for i in range(0, len(person_details), batch_size):
        batch = person_details[i:i + batch_size]
        batch_num = i // batch_size + 1
        total_batches = (len(person_details) + batch_size - 1) // batch_size

        payload = {
            "details": batch,
            "reveal_personal_emails": False,
        }

        with httpx.Client(timeout=60) as client:
            resp = client.post(f"{APOLLO_BASE}/people/bulk_match", headers=headers, json=payload)
            if resp.status_code != 200:
                print(f"  Batch {batch_num}/{total_batches} ERROR: {resp.status_code}: {resp.text[:200]}", file=sys.stderr)
                continue
            data = resp.json()

        matches = data.get("matches") or []
        enriched_count = sum(1 for m in matches if m is not None)
        all_enriched.extend(matches)
        print(f"  Batch {batch_num}/{total_batches}: {enriched_count}/{len(batch)} enriched", file=sys.stderr)
        time.sleep(0.5)

    return all_enriched


def map_lead(person):
    """Map enriched Apollo person to clean lead format."""
    if person is None:
        return None
    org = person.get("organization") or {}

    # Get phone
    phone = ""
    phones = person.get("phone_numbers") or []
    if phones and isinstance(phones[0], dict):
        phone = phones[0].get("sanitized_number", "")

    return {
        "firstName": person.get("first_name") or "",
        "lastName": person.get("last_name") or "",
        "name": person.get("name") or f"{person.get('first_name','')} {person.get('last_name','')}".strip(),
        "headline": person.get("headline") or "",
        "job_title": person.get("title") or "",
        "linkedinUrl": person.get("linkedin_url") or "",
        "email": person.get("email") or "",
        "phone": phone,
        "company_name": org.get("name") or person.get("organization_name") or "",
        "company_domain": org.get("primary_domain") or "",
        "seniority": person.get("seniority") or "",
        "city": person.get("city") or "",
        "state": person.get("state") or "",
        "country": person.get("country") or "",
        "departments": person.get("departments") or [],
        "apollo_id": person.get("id") or "",
    }


def deduplicate(leads):
    seen_urls = set()
    seen_names = set()
    unique = []
    for lead in leads:
        url = (lead.get("linkedinUrl") or "").rstrip("/").lower()
        name_key = f"{lead.get('firstName','').lower()}_{lead.get('lastName','').lower()}_{lead.get('company_name','').lower()}"
        if url and url in seen_urls:
            continue
        if name_key in seen_names:
            continue
        if url:
            seen_urls.add(url)
        seen_names.add(name_key)
        unique.append(lead)
    return unique


def main():
    parser = argparse.ArgumentParser(description="Search Apollo for leads at target company")
    parser.add_argument("--domain", required=True, help="Company domain (e.g. ca-cib.com)")
    parser.add_argument("--max-pages", type=int, default=20, help="Max pages per wave")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--env-file", default=".env", help="Path to .env file")
    parser.add_argument("--no-wave2", action="store_true", help="Skip indirect personas")
    parser.add_argument("--skip-enrich", action="store_true", help="Skip enrichment (IDs only)")
    args = parser.parse_args()

    api_key = load_api_key(args.env_file)
    start = time.time()

    # --- Step 1: Search (free) ---
    all_raw = []

    print(f"[Wave 1] Direct QA/Engineering personas at {args.domain}...", file=sys.stderr)
    wave1 = search_apollo(api_key, args.domain, TITLES_WAVE_1, SENIORITIES, LOCATIONS, args.max_pages)
    all_raw.extend(wave1)
    print(f"[Wave 1] {len(wave1)} leads found", file=sys.stderr)

    if not args.no_wave2:
        print(f"[Wave 2] Indirect personas (sponsors, connectors)...", file=sys.stderr)
        wave2 = search_apollo(api_key, args.domain, TITLES_WAVE_2, SENIORITIES, LOCATIONS, args.max_pages)
        all_raw.extend(wave2)
        print(f"[Wave 2] {len(wave2)} leads found", file=sys.stderr)

    # Deduplicate by Apollo ID before enrichment
    seen_ids = set()
    unique_raw = []
    for p in all_raw:
        pid = p.get("id", "")
        if pid and pid in seen_ids:
            continue
        if pid:
            seen_ids.add(pid)
        unique_raw.append(p)

    raw_dupes = len(all_raw) - len(unique_raw)
    print(f"\nSearch total: {len(all_raw)} raw, {raw_dupes} duplicates removed, {len(unique_raw)} unique", file=sys.stderr)

    if args.skip_enrich:
        # Output raw search data (no LinkedIn URLs)
        output = unique_raw
    else:
        # --- Step 2: Bulk Enrich (1 credit/person) ---
        print(f"\n[Enrichment] Revealing full profiles for {len(unique_raw)} leads...", file=sys.stderr)

        # Build enrichment requests: use first_name + org domain + title
        enrich_details = []
        for p in unique_raw:
            detail = {}
            if p.get("id"):
                detail["id"] = p["id"]
            else:
                detail["first_name"] = p.get("first_name", "")
                org = p.get("organization") or {}
                detail["domain"] = org.get("primary_domain") or args.domain
                if p.get("title"):
                    detail["organization_name"] = org.get("name", "")
            enrich_details.append(detail)

        enriched_raw = enrich_batch(api_key, enrich_details)

        # Map to clean format
        mapped = []
        for person in enriched_raw:
            lead = map_lead(person)
            if lead:
                mapped.append(lead)

        # Deduplicate
        before = len(mapped)
        unique = deduplicate(mapped)
        dedup_count = before - len(unique)

        # Filter: must have LinkedIn URL
        with_linkedin = [l for l in unique if l.get("linkedinUrl")]
        no_linkedin = len(unique) - len(with_linkedin)

        output = with_linkedin

    elapsed = time.time() - start

    print(f"\n{'='*60}", file=sys.stderr)
    print(f"APOLLO SEARCH + ENRICH COMPLETE: {args.domain}", file=sys.stderr)
    print(f"  Search: {len(unique_raw)} unique leads found", file=sys.stderr)
    if not args.skip_enrich:
        print(f"  Enriched: {len(mapped)} profiles revealed", file=sys.stderr)
        print(f"  Duplicates removed: {dedup_count}", file=sys.stderr)
        print(f"  No LinkedIn URL: {no_linkedin}", file=sys.stderr)
        print(f"  Final leads (with LinkedIn): {len(output)}", file=sys.stderr)
        print(f"  Enrichment cost: ~{len(enriched_raw)} credits", file=sys.stderr)
    print(f"  Time: {elapsed:.1f}s", file=sys.stderr)
    print(f"{'='*60}\n", file=sys.stderr)

    if args.output:
        with open(args.output, "w") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"Saved to {args.output}", file=sys.stderr)
    else:
        json.dump(output, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    main()
