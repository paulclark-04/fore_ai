from __future__ import annotations

from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SearchRequest(BaseModel):
    company_domain: List[str]
    job_titles: Optional[List[str]] = None
    seniority_levels: Optional[List[str]] = None
    location: Optional[List[str]] = None
    email_status: Optional[List[str]] = None
    fetch_count: int = 100


class LeadResult(BaseModel):
    first_name: str = ""
    last_name: str = ""
    headline: str = ""
    job_title: str = ""
    company: str = ""
    linkedin_url: str = ""
    email: str = ""
    personal_email: str = ""
    mobile_number: str = ""
    seniority_level: str = ""
    functional_level: str = ""
    country: str = ""
    score: int = 0
    tier: str = "D"
    category: str = ""
    persona_label: str = ""
    reasoning: str = ""
    outreach_angle: str = ""
    method: str = ""
    red_flags: str = ""
    special_flags: str = ""


class PipelineEvent(BaseModel):
    step: str
    status: str
    progress: int = 0
    total: int = 0
    current: str = ""
    message: str = ""
    summary: Optional[Dict[str, int]] = None


class PipelineRun(BaseModel):
    run_id: str
    status: str = "pending"
    request: Optional[SearchRequest] = None
    results: List[LeadResult] = []
    error: Optional[str] = None
