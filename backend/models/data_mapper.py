"""Map Apify Leads Finder output to the flat dict format expected by fore_ai_scorer.py.

The scorer expects keys like:
  firstName, lastName, linkedinUrl, about, headline,
  education/0/schoolName, education/0/degree, education/0/description,
  currentPosition/0/companyName,
  experience/0/companyName, experience/0/position, experience/0/description,
  experience/0/duration, experience/0/location, Experience 0 - Skills, ...
"""

from __future__ import annotations


def map_apify_lead(lead: dict) -> dict:
    """Map an Apify Leads Finder result to the scorer flat dict format.

    Apify returns flat fields like first_name, last_name, job_title,
    headline, linkedin, company_name, seniority_level, etc.

    Since this actor only returns the current role (no experience history),
    we map it as experience/0. LinkedIn enrichment will fill the rest later.
    """
    first_name = lead.get("first_name") or ""
    last_name = lead.get("last_name") or ""
    job_title = lead.get("job_title") or ""
    headline = lead.get("headline") or ""
    company = lead.get("company_name") or ""
    linkedin = lead.get("linkedin") or ""
    country = lead.get("country") or ""
    city = lead.get("city") or ""

    return {
        # Identity
        "firstName": first_name,
        "lastName": last_name,
        "linkedinUrl": linkedin,
        # Current role
        "headline": headline,
        "about": "",  # Not available from Leads Finder
        # Map current role as experience/0
        "currentPosition/0/companyName": company,
        "experience/0/companyName": company,
        "experience/0/position": job_title,
        "experience/0/description": "",  # Not available
        "experience/0/location": f"{city}, {country}".strip(", "),
        "experience/0/duration": "",  # Not available
        "Experience 0 - Skills": "",  # Not available
        # Contact info (passed through, not used by scorer)
        "email": lead.get("email") or "",
        "personal_email": lead.get("personal_email") or "",
        "mobile_number": lead.get("mobile_number") or "",
        # Metadata from Apify
        "seniority_level": lead.get("seniority_level") or "",
        "functional_level": lead.get("functional_level") or "",
        "country": country,
        "company_domain": lead.get("company_domain") or "",
    }
