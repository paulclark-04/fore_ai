#!/usr/bin/env python3
"""V2: Fixed API tests based on v1 findings."""

import httpx
import json
import os

APOLLO_API_KEY = "JcHpTvh-7XyGbWXIGxQLQQ"
RAPIDAPI_KEY = "49253a9437msh5923291956fd2bcp1c9bddjsnc33e2cd9ff0d"

RESPONSES_DIR = os.path.join(os.path.dirname(__file__), "responses")
os.makedirs(RESPONSES_DIR, exist_ok=True)


def save_response(name, data):
    path = os.path.join(RESPONSES_DIR, f"{name}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved to {path}")


def test_apollo_search_broad():
    """Test Apollo with broader params — try different domains."""
    print("\n" + "=" * 60)
    print("TEST 1: Apollo People Search (broader)")
    print("=" * 60)

    url = "https://api.apollo.io/api/v1/mixed_people/api_search"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": APOLLO_API_KEY,
    }

    # Try multiple domains
    for domain in ["ca-cib.com", "credit-agricole.com", "groupe-bpce.com", "airbus.com"]:
        payload = {
            "q_organization_domains_list": [domain],
            "person_seniorities": ["vp", "director", "c_suite"],
            "per_page": 5,
            "page": 1,
        }
        resp = httpx.post(url, headers=headers, json=payload, timeout=30)
        data = resp.json()
        count = data.get("total_entries", 0)
        people = data.get("people", [])
        print(f"  {domain}: {count} total, {len(people)} returned")
        if people:
            save_response(f"apollo_search_{domain.split('.')[0]}", data)
            for p in people[:2]:
                name = f"{p.get('first_name', '?')} {p.get('last_name', p.get('last_name_obfuscated', '?'))}"
                print(f"    - {name} | {p.get('title', '?')}")
                print(f"      LinkedIn: {p.get('linkedin_url', 'N/A')}")
                print(f"      Email: {p.get('email', 'N/A')}")


def test_linkedin_fresh_scraper():
    """Test Fresh LinkedIn Scraper API with correct params."""
    print("\n" + "=" * 60)
    print("TEST 2: LinkedIn Fresh Scraper - Profile by username")
    print("=" * 60)

    # The API needs 'username' not 'linkedin_url'
    url = "https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/user/profile"
    headers = {
        "x-rapidapi-host": "fresh-linkedin-scraper-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }

    # Try with username (extracted from LinkedIn URL)
    for username in ["guillaumetronche", "sophie-planchais"]:
        print(f"\n  Testing username: {username}")
        params = {"username": username}
        resp = httpx.get(url, headers=headers, params=params, timeout=30)
        print(f"  Status: {resp.status_code}")

        if resp.status_code == 200:
            data = resp.json()
            save_response(f"linkedin_profile_{username}", data)

            if isinstance(data, dict):
                success = data.get("success", False)
                print(f"  Success: {success}")
                profile = data.get("data", data)
                if isinstance(profile, dict):
                    print(f"  Keys: {list(profile.keys())[:15]}")
                    print(f"  Name: {profile.get('name', profile.get('full_name', '?'))}")
                    print(f"  Headline: {profile.get('headline', '?')}")
                    about = str(profile.get('about', profile.get('summary', '')))
                    print(f"  About: {about[:100]}{'...' if len(about) > 100 else ''}")

                    exps = profile.get("experiences", profile.get("experience", []))
                    if isinstance(exps, list):
                        print(f"  Experiences ({len(exps)}):")
                        for i, exp in enumerate(exps[:3]):
                            if isinstance(exp, dict):
                                print(f"    [{i}] {exp.get('title', exp.get('position', '?'))} @ {exp.get('company', exp.get('company_name', '?'))}")
                                desc = str(exp.get('description', ''))
                                print(f"        Desc: {desc[:80]}{'...' if len(desc) > 80 else '' if desc else '(none)'}")
                                print(f"        Keys: {list(exp.keys())}")

                    edu = profile.get("education", profile.get("educations", []))
                    if isinstance(edu, list) and edu:
                        print(f"  Education ({len(edu)}):")
                        for e in edu[:2]:
                            if isinstance(e, dict):
                                print(f"    - {e.get('school', e.get('school_name', '?'))}: {e.get('degree', '?')}")
                                print(f"      Keys: {list(e.keys())}")
        else:
            data = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else resp.text
            print(f"  ERROR: {str(data)[:300]}")


def test_linkedin_search_by_name():
    """Test Fresh LinkedIn Scraper - Search endpoint."""
    print("\n" + "=" * 60)
    print("TEST 3: LinkedIn Fresh Scraper - Search people")
    print("=" * 60)

    url = "https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/search/people"
    headers = {
        "x-rapidapi-host": "fresh-linkedin-scraper-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }

    # Try name-based search (no company ID, just keyword)
    params = {
        "keyword": "Guillaume Tronche Credit Agricole",
    }

    resp = httpx.get(url, headers=headers, params=params, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("linkedin_search_v2", data)
        if isinstance(data, dict):
            print(f"  Keys: {list(data.keys())}")
            items = data.get("data", data.get("results", []))
            if isinstance(items, list):
                print(f"  Found {len(items)} results")
                for r in items[:3]:
                    if isinstance(r, dict):
                        print(f"    - {r.get('name', '?')}")
                        print(f"      Headline: {r.get('headline', '?')}")
                        print(f"      URL: {r.get('url', r.get('linkedin_url', r.get('profile_url', '?')))}")
                        print(f"      Keys: {list(r.keys())}")
    elif resp.status_code == 202:
        data = resp.json()
        print(f"  202 Accepted (async?): {json.dumps(data, indent=2)[:300]}")
    else:
        print(f"  ERROR ({resp.status_code}): {resp.text[:300]}")


if __name__ == "__main__":
    print("API Tests v2 — Fixed parameters")
    print("=" * 60)

    test_apollo_search_broad()
    test_linkedin_fresh_scraper()
    test_linkedin_search_by_name()

    print("\n" + "=" * 60)
    print("Done. Check api_tests/responses/")
