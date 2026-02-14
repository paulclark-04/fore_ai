#!/usr/bin/env python3
"""Test all 3 APIs to verify response shapes before building the web app."""

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


def test_apollo_search():
    """Test Apollo People Search API (FREE)."""
    print("\n" + "=" * 60)
    print("TEST 1: Apollo People Search")
    print("=" * 60)

    url = "https://api.apollo.io/api/v1/mixed_people/api_search"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": APOLLO_API_KEY,
    }
    payload = {
        "q_organization_domains_list": ["credit-agricole.com"],
        "person_titles": ["Head of QA", "VP Engineering", "CTO", "Head of DevOps"],
        "person_seniorities": ["vp", "director", "manager"],
        "per_page": 5,
        "page": 1,
    }

    resp = httpx.post(url, headers=headers, json=payload, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("apollo_search", data)

        people = data.get("people", [])
        print(f"  Found {len(people)} people")
        for p in people[:3]:
            print(f"    - {p.get('first_name', '?')} {p.get('last_name', p.get('last_name_obfuscated', '?'))}")
            print(f"      Title: {p.get('title', '?')}")
            print(f"      Org: {p.get('organization', {}).get('name', '?')}")
            print(f"      ID: {p.get('id', '?')}")
            print(f"      LinkedIn: {p.get('linkedin_url', 'N/A')}")
    else:
        print(f"  ERROR: {resp.text[:500]}")


def test_linkedin_search():
    """Test Fresh LinkedIn Profile Data - Search endpoint."""
    print("\n" + "=" * 60)
    print("TEST 2: LinkedIn Search (Fresh API)")
    print("=" * 60)

    url = "https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/search/people"
    headers = {
        "x-rapidapi-host": "fresh-linkedin-scraper-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {
        "keyword": "Guillaume Tronche",
        "current_company": "Credit Agricole",
    }

    resp = httpx.get(url, headers=headers, params=params, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("linkedin_search", data)
        print(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else 'list'}")
        if isinstance(data, dict):
            results = data.get("data", data.get("results", data.get("people", [])))
            if isinstance(results, list):
                print(f"  Found {len(results)} results")
                for r in results[:3]:
                    if isinstance(r, dict):
                        print(f"    - {r.get('name', r.get('full_name', '?'))}")
                        print(f"      Headline: {r.get('headline', '?')}")
                        print(f"      URL: {r.get('linkedin_url', r.get('profile_url', r.get('url', '?')))}")
        elif isinstance(data, list):
            print(f"  Found {len(data)} results")
            for r in data[:3]:
                if isinstance(r, dict):
                    print(f"    - {r.get('name', '?')}: {r.get('headline', '?')}")
    else:
        print(f"  ERROR: {resp.text[:500]}")


def test_linkedin_profile():
    """Test Fresh LinkedIn Profile Data - Profile endpoint."""
    print("\n" + "=" * 60)
    print("TEST 3: LinkedIn Profile Enrichment (Fresh API)")
    print("=" * 60)

    # Try with a known LinkedIn URL
    url = "https://fresh-linkedin-scraper-api.p.rapidapi.com/api/v1/user/profile"
    headers = {
        "x-rapidapi-host": "fresh-linkedin-scraper-api.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {
        "linkedin_url": "https://www.linkedin.com/in/guillaumetronche/",
    }

    resp = httpx.get(url, headers=headers, params=params, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("linkedin_profile", data)

        # Explore the response shape
        if isinstance(data, dict):
            print(f"  Top-level keys: {list(data.keys())}")
            # Check for nested data
            profile = data.get("data", data)
            if isinstance(profile, dict):
                print(f"  Profile keys: {list(profile.keys())[:20]}")
                print(f"  Name: {profile.get('name', profile.get('full_name', '?'))}")
                print(f"  Headline: {profile.get('headline', '?')}")
                print(f"  About: {str(profile.get('about', profile.get('summary', '?')))[:100]}")

                # Check experiences
                exps = profile.get("experiences", profile.get("experience", profile.get("positions", [])))
                if isinstance(exps, list):
                    print(f"  Experiences: {len(exps)}")
                    for i, exp in enumerate(exps[:3]):
                        if isinstance(exp, dict):
                            print(f"    [{i}] Keys: {list(exp.keys())}")
                            print(f"        Company: {exp.get('company', exp.get('companyName', '?'))}")
                            print(f"        Title: {exp.get('title', exp.get('position', '?'))}")
                            desc = exp.get("description", exp.get("desc", ""))
                            print(f"        Description: {str(desc)[:80]}{'...' if desc and len(str(desc)) > 80 else ''}")

                # Check education
                edu = profile.get("education", profile.get("educations", []))
                if isinstance(edu, list):
                    print(f"  Education: {len(edu)}")
                    for e in edu[:2]:
                        if isinstance(e, dict):
                            print(f"    - {e.get('school', e.get('schoolName', '?'))}: {e.get('degree', '?')}")

                # Check skills
                skills = profile.get("skills", [])
                if isinstance(skills, list):
                    print(f"  Skills: {skills[:5]}")
    else:
        print(f"  ERROR: {resp.text[:500]}")


def test_linkedin_profile_alt_api():
    """Test Fresh LinkedIn Profile Data API (different endpoint/host)."""
    print("\n" + "=" * 60)
    print("TEST 3b: LinkedIn Profile (fresh-linkedin-profile-data)")
    print("=" * 60)

    url = "https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile"
    headers = {
        "x-rapidapi-host": "fresh-linkedin-profile-data.p.rapidapi.com",
        "x-rapidapi-key": RAPIDAPI_KEY,
    }
    params = {
        "linkedin_url": "https://www.linkedin.com/in/guillaumetronche/",
    }

    resp = httpx.get(url, headers=headers, params=params, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("linkedin_profile_alt", data)

        if isinstance(data, dict):
            print(f"  Top-level keys: {list(data.keys())}")
            profile = data.get("data", data)
            if isinstance(profile, dict):
                print(f"  Profile keys: {list(profile.keys())[:20]}")
                print(f"  Name: {profile.get('full_name', profile.get('name', '?'))}")
                print(f"  Headline: {profile.get('headline', '?')}")
                about = profile.get('about', profile.get('summary', ''))
                print(f"  About: {str(about)[:100]}")

                exps = profile.get("experiences", profile.get("experience", []))
                if isinstance(exps, list):
                    print(f"  Experiences: {len(exps)}")
                    for i, exp in enumerate(exps[:3]):
                        if isinstance(exp, dict):
                            print(f"    [{i}] Keys: {list(exp.keys())}")
                            print(f"        Company: {exp.get('company', exp.get('company_name', '?'))}")
                            print(f"        Title: {exp.get('title', exp.get('position', '?'))}")
                            desc = exp.get('description', '')
                            print(f"        Description: {str(desc)[:80]}{'...' if desc and len(str(desc)) > 80 else ''}")

                edu = profile.get("educations", profile.get("education", []))
                if isinstance(edu, list):
                    print(f"  Education: {len(edu)}")
                    for e in edu[:2]:
                        if isinstance(e, dict):
                            print(f"    Keys: {list(e.keys())}")
                            print(f"    - {e.get('school', e.get('school_name', '?'))}: {e.get('degree', '?')}")

                skills = profile.get("skills", [])
                if isinstance(skills, list):
                    print(f"  Skills ({len(skills)}): {skills[:5]}")
    else:
        print(f"  ERROR ({resp.status_code}): {resp.text[:500]}")


def test_apollo_email_reveal():
    """Test Apollo Email Reveal API (FREE)."""
    print("\n" + "=" * 60)
    print("TEST 4: Apollo Email Reveal")
    print("=" * 60)

    url = "https://api.apollo.io/api/v1/people/match"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": APOLLO_API_KEY,
    }
    payload = {
        "first_name": "Guillaume",
        "last_name": "Tronche",
        "organization_name": "Credit Agricole",
    }

    resp = httpx.post(url, headers=headers, json=payload, timeout=30)
    print(f"  Status: {resp.status_code}")

    if resp.status_code == 200:
        data = resp.json()
        save_response("apollo_email_reveal", data)

        person = data.get("person", data)
        if isinstance(person, dict):
            print(f"  Keys: {list(person.keys())[:15]}")
            print(f"  Name: {person.get('first_name', '?')} {person.get('last_name', '?')}")
            print(f"  Email: {person.get('email', '?')}")
            print(f"  Title: {person.get('title', '?')}")
            print(f"  LinkedIn: {person.get('linkedin_url', '?')}")
    else:
        print(f"  ERROR: {resp.text[:500]}")


if __name__ == "__main__":
    print("Testing all APIs for Fore AI Lead Scorer Web App")
    print("=" * 60)

    test_apollo_search()
    test_linkedin_search()
    test_linkedin_profile()
    test_linkedin_profile_alt_api()
    test_apollo_email_reveal()

    print("\n" + "=" * 60)
    print("All tests complete. Check api_tests/responses/ for raw JSON.")
    print("=" * 60)
