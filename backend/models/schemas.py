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
    enable_scoring: bool = False
    vertical: Optional[str] = None


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
    phone_number: str = ""
    website: str = ""
    seniority_level: str = ""
    functional_level: str = ""
    country: str = ""
    # LinkedIn enrichment fields
    about: str = ""
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    certifications: Optional[List[str]] = None
    connections_count: int = 0
    enriched: bool = False
    # Scoring fields
    score: int = 0
    tier: str = ""
    category: str = ""
    persona_label: str = ""
    reasoning: str = ""
    method: str = ""
    red_flags: str = ""
    special_flags: str = ""
    # AI debug fields
    ai_input: str = ""
    ai_output: str = ""


class CostBreakdown(BaseModel):
    leads_finder: float = 0.0
    linkedin_enrichment: float = 0.0
    scoring: float = 0.0
    total: float = 0.0
    leads_found: int = 0
    profiles_enriched: int = 0


class PipelineEvent(BaseModel):
    step: str
    status: str
    progress: int = 0
    total: int = 0
    current: str = ""
    message: str = ""
    summary: Optional[Dict[str, int]] = None
    cost: Optional[CostBreakdown] = None


class PipelineRun(BaseModel):
    run_id: str
    status: str = "pending"
    created_at: str = ""
    request: Optional[SearchRequest] = None
    results: List[LeadResult] = []
    error: Optional[str] = None
    cost: Optional[CostBreakdown] = None
    enrichment_diagnostics: Optional[Dict[str, Any]] = None
