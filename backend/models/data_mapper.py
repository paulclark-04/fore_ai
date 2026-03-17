"""Map API outputs to the formats expected by the pipeline.

Two mappers:
1. map_apify_lead() — Leads Finder flat output → LeadResult-compatible dict
2. map_linkedin_profile() — LinkedIn Profile Scraper rich output → enrichment fields
3. merge_enrichment() — merge enrichment data into an existing LeadResult
"""

from __future__ import annotations

from typing import Optional


def map_apify_lead(lead: dict) -> dict:
    """Map an Apify Leads Finder result to a flat dict for LeadResult.

    Apify returns flat fields like first_name, last_name, job_title,
    headline, linkedin, company_name, seniority_level, etc.
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
        "firstName": first_name,
        "lastName": last_name,
        "linkedinUrl": linkedin,
        "headline": headline,
        "about": "",
        "currentPosition/0/companyName": company,
        "experience/0/companyName": company,
        "experience/0/position": job_title,
        "experience/0/description": "",
        "experience/0/location": f"{city}, {country}".strip(", "),
        "experience/0/duration": "",
        "Experience 0 - Skills": "",
        "email": lead.get("email") or "",
        "personal_email": lead.get("personal_email") or "",
        "mobile_number": lead.get("mobile_number") or "",
        "phone_number": lead.get("company_phone") or "",
        "website": lead.get("company_website") or "",
        "seniority_level": lead.get("seniority_level") or "",
        "functional_level": lead.get("functional_level") or "",
        "country": country,
        "company_domain": lead.get("company_domain") or "",
    }


def map_linkedin_profile(profile: dict) -> dict:
    """Map a LinkedIn Profile Scraper result to enrichment fields.

    Returns a dict with the rich fields to merge into a LeadResult:
    about, experience[], education[], skills[], languages[],
    certifications[], connections_count.
    """
    # Experience — keep full history with key fields
    experience = []
    for exp in (profile.get("experience") or []):
        entry = {
            "position": exp.get("position") or "",
            "companyName": exp.get("companyName") or "",
            "description": exp.get("description") or "",
            "duration": exp.get("duration") or "",
            "location": exp.get("location") or "",
            "employmentType": exp.get("employmentType") or "",
        }
        # Start/end dates
        start = exp.get("startDate")
        if start:
            entry["startDate"] = start.get("text") or ""
        end = exp.get("endDate")
        if end:
            entry["endDate"] = end.get("text") or ""
        # Skills per role
        role_skills = exp.get("skills")
        if role_skills:
            entry["skills"] = role_skills
        experience.append(entry)

    # Education
    education = []
    for edu in (profile.get("education") or []):
        education.append({
            "schoolName": edu.get("schoolName") or "",
            "degree": edu.get("degree") or "",
            "fieldOfStudy": edu.get("fieldOfStudy") or "",
            "period": edu.get("period") or "",
        })

    # Skills — flat list of skill names
    skills = []
    for skill in (profile.get("skills") or []):
        name = skill.get("name") if isinstance(skill, dict) else str(skill)
        if name:
            skills.append(name)

    # Languages
    languages = []
    for lang in (profile.get("languages") or []):
        name = lang.get("name") if isinstance(lang, dict) else str(lang)
        if name:
            languages.append(name)

    # Certifications
    certifications = []
    for cert in (profile.get("certifications") or []):
        title = cert.get("title") if isinstance(cert, dict) else str(cert)
        if title:
            certifications.append(title)

    return {
        "about": profile.get("about") or "",
        "headline": profile.get("headline") or "",
        "experience": experience,
        "education": education,
        "skills": skills,
        "languages": languages,
        "certifications": certifications,
        "connections_count": profile.get("connectionsCount") or 0,
        "linkedin_url": profile.get("linkedinUrl") or "",
        "first_name": profile.get("firstName") or "",
        "last_name": profile.get("lastName") or "",
    }


def build_enriched_lead_dict(lead_result_dict: dict, enrichment: dict) -> dict:
    """Build a flat scorer-compatible dict from LeadResult + enrichment data.

    This produces the format that fore_ai_scorer.py expects, with full
    experience history from LinkedIn enrichment.
    """
    flat = {
        "firstName": lead_result_dict.get("first_name") or enrichment.get("first_name") or "",
        "lastName": lead_result_dict.get("last_name") or enrichment.get("last_name") or "",
        "linkedinUrl": lead_result_dict.get("linkedin_url") or enrichment.get("linkedin_url") or "",
        "headline": enrichment.get("headline") or lead_result_dict.get("headline") or "",
        "about": enrichment.get("about") or "",
    }

    # Map experience history into the flat format the scorer expects
    experience = enrichment.get("experience") or []
    for i, exp in enumerate(experience[:3]):  # Scorer handles up to 3
        prefix = f"experience/{i}"
        flat[f"{prefix}/companyName"] = exp.get("companyName") or ""
        flat[f"{prefix}/position"] = exp.get("position") or ""
        flat[f"{prefix}/description"] = exp.get("description") or ""
        flat[f"{prefix}/duration"] = exp.get("duration") or ""
        flat[f"{prefix}/location"] = exp.get("location") or ""
        skills_key = f"Experience {i} - Skills" if i < 2 else f"experience {i} - Skills"
        flat[skills_key] = ", ".join(exp.get("skills") or [])

    if experience:
        flat["currentPosition/0/companyName"] = experience[0].get("companyName") or ""

    # Education
    edu = enrichment.get("education") or []
    if edu:
        flat["education/0/schoolName"] = edu[0].get("schoolName") or ""
        flat["education/0/degree"] = edu[0].get("degree") or ""
        flat["education/0/description"] = edu[0].get("fieldOfStudy") or ""

    # Pass through contact info from lead result
    flat["email"] = lead_result_dict.get("email") or ""
    flat["personal_email"] = lead_result_dict.get("personal_email") or ""
    flat["mobile_number"] = lead_result_dict.get("mobile_number") or ""
    flat["phone_number"] = lead_result_dict.get("phone_number") or ""
    flat["website"] = lead_result_dict.get("website") or ""
    flat["seniority_level"] = lead_result_dict.get("seniority_level") or ""
    flat["functional_level"] = lead_result_dict.get("functional_level") or ""
    flat["country"] = lead_result_dict.get("country") or ""

    return flat
