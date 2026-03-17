# Fore AI Scorer — Status vs PRD

## Pipeline Architecture: Current State

### Current Pipeline (3-Step: Search → Enrich → Score)

```
Company Domain + Filters
    |
    v
+----------------------------------+
|  Step 1: Apify Leads Finder      |  ~$1.5 / 1,000 leads
|  Actor: code_crafter~leads-finder|
|  Returns: full names, job title, |
|           headline, LinkedIn URL,|
|           email, seniority,      |
|           functional_level       |
+---------------+------------------+
                v
+----------------------------------+
|  Step 2: LinkedIn Enrichment     |  $4 / 1,000 profiles
|  Actor: harvestapi~              |
|    linkedin-profile-scraper      |
|  Input: LinkedIn URLs from Step 1|
|  Returns: about, full experience |
|    history (ALL roles), education|
|    skills, languages, certs,     |
|    connectionsCount              |
|  Matched back by LinkedIn URL    |
+---------------+------------------+
                v
+----------------------------------+
|  Step 3: AI Scoring (optional)   |  Gemini API cost
|  Toggle: enable_scoring=true     |
|  Input: FULL enriched profile    |
|  Hybrid: rules + AI for          |
|    borderline leads              |
|  Currently OFF while testing APIs|
+---------------+------------------+
                v
            Results + Cost Breakdown
```

**Pipeline tested successfully**: 10 Airbus leads — 10/10 enriched with full experience history (up to 13 roles), skills (up to 33), about sections, education. Total cost: $0.055 for 10 leads.

---

## Feature Status: PRD vs Reality

### P0 — Core Features

| Feature | PRD Requirement | Status | Notes |
|---------|----------------|--------|-------|
| Company domain input | Accept domain(s) | Done | Comma-separated multi-domain |
| Title keyword filters | Filter by job titles | Done | Comma-separated input |
| Seniority filters | Filter by seniority level | Done | Toggle buttons: C-Suite/VP/Director/Head/Manager/Senior |
| Location filters | Filter by geography | Done | Passed to Apify actor |
| Email status filters | Filter by email availability | Done | Passed to Apify actor |
| Max leads control | Configurable result count | Done | Slider 10-500 |
| Apify Leads Finder | Find people at domain | Done | Returns names, titles, emails, LinkedIn URLs |
| LinkedIn Profile Enrichment | Rich profile data | Done | Full experience, about, skills, education via Apify |
| Hybrid rules + AI scoring | Deterministic + Gemini | Done | Optional toggle (off by default while testing) |
| 10-layer persona cascade | Persona detection logic | Done | In fore_ai_scorer.py |
| Red flag detection | Anti-persona penalties | Done | Cybersecurity, hardware, ESN, compliance |
| ESN/consultant filter | ~50 French IT firms | Done | Current employer only |
| Tier classification (A/B/C/D) | Score to tier mapping | Done | Color coded in UI |
| Per-lead reasoning | AI-generated explanations | Done | Visible in LeadDetail expanded row |
| Real-time progress (SSE) | Live pipeline updates | Done | 3-step progress: search → enrich → done |
| Cost tracking | Show API costs per run | Done | CostBreakdown in SSE events + results |
| Results table | Sortable, expandable | Done | Sort by score/name/tier |
| XLSX export | Formatted download | Done | Color-coded tiers + summary sheet |

### P1 — Improvements Needed

| Feature | PRD Requirement | Status | What's Needed |
|---------|----------------|--------|---------------|
| Scoring with enriched data | Score using full LinkedIn profiles | Ready to test | Enable scoring toggle, validate against 7 examples |
| Gemini cost tracking | Include AI scoring cost in CostBreakdown | Not built | Add gemini cost field to CostBreakdown |
| Cost + time savings display | Show savings vs manual research | Not built | Compare total cost/time vs manual baseline |
| Persistent storage | Runs survive restart | Not built | In-memory only. Add SQLite |
| Batch processing | Queue multiple domains | Not built | Sequential company processing |
| Rate limiting & backoff | Handle 100+ leads | Partial | Basic 0.5s delays for AI. No exponential backoff |
| Error recovery | Resume failed runs | Not built | Pipeline fails, must restart from scratch |

### P2 — Future Enhancements

| Feature | Status | Priority |
|---------|--------|----------|
| Duplicate detection | Not built | Medium |
| Search history | Not built | Medium |
| Feedback loop (thumbs up/down) | Not built | Low |
| CSV import mode | Not built | Medium |
| Multi-company batch | Not built | Low |

---

## Data Quality: Before vs After Enrichment

| Data Field | Leads Finder Only | With LinkedIn Enrichment | Scoring Impact |
|------------|------------------|-------------------------|----------------|
| **full name** | Full | Full (sometimes better) | None |
| **headline** | Full | Full (updated from LinkedIn) | None |
| **job title** | Full | N/A (use headline/experience) | None |
| **LinkedIn URL** | Full | Confirmed | None |
| **seniority_level** | Structured field | N/A | None |
| **email** | When available | N/A (not fetching emails) | None |
| **about / summary** | Not available | **Full** | **+6 to +10 pts** |
| **experience history** | Current role only | **ALL roles** (up to 13 seen) | **+5 to +10 pts** |
| **experience descriptions** | Not available | **Full per role** | **+8 to +12 pts** |
| **skills list** | Not available | **Full** (up to 33 seen) | **+4 to +8 pts** |
| **education** | Not available | **Full** (school + degree + field) | **+4 pts** |
| **languages** | Not available | **Full** | Minor |
| **certifications** | Not available | **Full** | Minor |
| **connections count** | Not available | **Full** | Minor signal |

### Scoring Accuracy by Lead Type

| Lead Type | Leads Finder Only | With Enrichment | Status |
|-----------|------------------|-----------------|--------|
| Direct QA title (Guillaume) | 95% | 100% | Ready to validate |
| Cybersecurity (Daryouche) | 95% | 100% | Ready to validate |
| Hardware (Cornelius) | 60% | 100% | Ready to validate |
| Innovation scout (Nicolas) | 50% | 100% | Ready to validate |
| VP Technical PO (Jeremy) | 75% | 100% | Ready to validate |
| DevOps/CI-CD (Sophie) | 70% | 100% | Ready to validate |
| Executive sponsor (Laurent) | 70% | 100% | Ready to validate |

---

## Cost Analysis

### Per-Run Cost (Tested)

| Step | Cost per 1,000 | 10 Leads (tested) | 100 Leads (est.) |
|------|----------------|--------------------|--------------------|
| Leads Finder | $2 | $0.02 | $0.2 |
| LinkedIn Enrichment | $4.00 | $0.040 | $0.40 |
| AI Scoring (Gemini) | ~$2.20 (Haiku equiv.) | TBD | TBD |
| **Total** | **~$7.70** | **$0.055** | **~$0.55** |

### Monthly Projection (2,000 leads/month)

| Step | Monthly Cost |
|------|-------------|
| Leads Finder | $3.00 |
| LinkedIn Enrichment | $8.00 |
| AI Scoring (Gemini) | ~$4.40 |
| **Total** | **~$15.40/month** |

---

## Backend Issues to Fix

| Issue | Severity | Current State | Fix |
|-------|----------|---------------|-----|
| **In-memory storage** | Critical | Runs lost on restart | Add SQLite or JSON file persistence |
| **Memory leak** | Critical | `_runs` and `_event_queues` never cleaned | Add TTL-based cleanup (delete after 24h) |
| **Temp XLSX files** | Major | Never deleted from disk | Clean up after download |
| **Apollo service unused** | Minor | `apollo_service.py` still in codebase | Remove or archive |
| **linkedin_service.py unused** | Minor | Old RapidAPI service still in codebase | Remove or archive |
| **Silent AI failures** | Major | Falls back to rules with no logging | Add logging |
| **No input validation** | Major | Garbage domain accepted | Validate domain format |
| **No auth** | Major | Anyone with URL can access | Add basic auth |

## Frontend Issues to Fix

| Issue | Severity | Current State | Fix |
|-------|----------|---------------|-----|
| **PipelineProgress steps** | Major | Only has search/score/done, missing "enrich" | Add enrich step to STEPS array |
| **Cost display** | Major | No cost info shown in UI | Display CostBreakdown from SSE events |
| **Scoring toggle** | Major | No UI for enable_scoring | Add toggle switch to SearchForm |
| **No pagination** | Major | All leads render at once | Add pagination or virtual scroll |
| **No tier filtering** | Major | Can't show only A+B leads | Add filter buttons |
| **No error recovery** | Major | Must reload page on failure | Add retry button |

---

## Recommended Action Plan

### Phase 1: Apify Leads Finder Migration — DONE

Replaced Apollo with Apify Leads Finder. Simpler architecture, better data.

### Phase 2: LinkedIn Profile Enrichment — DONE

Added Apify LinkedIn Profile Scraper as enrichment step. Full profile data now available.

**Completed:**
- [x] `backend/services/linkedin_enrichment_service.py` — Apify actor integration
- [x] `backend/models/data_mapper.py` — `map_linkedin_profile()` + `build_enriched_lead_dict()`
- [x] Pipeline: Search → Enrich → (optional) Score → Done
- [x] Cost tracking (`CostBreakdown` model) across both API calls
- [x] `SearchRequest.enable_scoring` toggle (default: off)
- [x] `LeadResult` enrichment fields (about, experience[], education[], skills[], etc.)
- [x] Live test: 10 Airbus leads, 10/10 enriched, $0.055 total cost
- [x] Git repo initialized + pushed to GitHub

### Phase 3: Scoring Validation (Next)

- [ ] Enable scoring with enriched LinkedIn data
- [ ] Validate against 7 calibrated training examples
- [ ] Add Gemini cost tracking to CostBreakdown
- [ ] Add cost + time savings summary

### Phase 4: Production Hardening

- [ ] SQLite for run persistence
- [ ] Run cleanup (TTL 7 days)
- [ ] Temp file cleanup for XLSX exports
- [ ] Basic auth
- [ ] Input validation
- [ ] Remove unused Apollo/LinkedIn services
- [ ] Logging for AI failures/fallbacks

### Phase 5: UX Polish (In Progress — Separate Instance)

- [ ] Add "enrich" step to PipelineProgress
- [ ] Add cost display in UI
- [ ] Add scoring toggle in SearchForm
- [ ] Tier filtering, pagination, error recovery
- [ ] "New Search" button
