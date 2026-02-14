# Fore AI Scorer — Status vs PRD

## Pipeline Architecture: Current State

### Current Pipeline (Apify Leads Finder)

```
Company Domain + Filters
    |
    v
+----------------------------------+
|  Apify Leads Finder              |  PAID (~$1.5 / 1,000 leads)
|  Actor: code_crafter~leads-finder|
|  Returns: full names             |
|           job title, headline    |
|           LinkedIn URL           |
|           seniority_level        |
|           functional_level       |
|           company, country       |
|           email (when available) |
|           NO experience history  |
|           NO about / summary     |
|           NO skills              |
|           NO education           |
+---------------+------------------+
                v
+----------------------------------+
|  AI Scoring (Gemini)             |
|  Input: title + headline         |
|         + seniority/functional   |
|         metadata                 |
|  Missing: experience history,    |
|  about, skills, education        |  <-- SCORING AT ~70% EFFECTIVENESS
+---------------+------------------+
                v
            Results
```

**What changed**: Replaced the 4-step Apollo pipeline (Search -> Match -> Score -> Email Reveal) with a simpler 2-step flow. Apify Leads Finder provides full names and LinkedIn URLs directly (Apollo required a separate match step for these and still obfuscated last names). Email is included when available from the Leads Finder data.

**Tradeoff**: Costs ~$1.5 per 1,000 leads (Apollo was free), but provides cleaner data with full names, reliable LinkedIn URLs, and structured seniority/functional metadata that Apollo lacked.

---

### Future Enhancement: LinkedIn Profile Enrichment

A separate LinkedIn enrichment step (using Apify profile scraping) is planned as a future enhancement, being worked on separately. This would add the missing profile depth:

```
Apify Leads Finder results
    |
    v
+----------------------------------+
|  Apify LinkedIn Profile Scraper  |  PAID (Apify credits)
|  Input: LinkedIn URLs from       |
|         Leads Finder results     |
|  Returns: FULL profiles          |
|    + about / summary             |
|    + experience descriptions     |
|    + skills (full list)          |
|    + education (school + degree) |
|    + recommendations             |
|  THIS IS WHAT THE SCORER         |
|  WAS DESIGNED FOR                |
+----------------------------------+
```

**Why it matters**: The scorer was originally designed for rich LinkedIn profiles (via Apify CSV export). Adding profile scraping would bring scoring from ~70% to ~100% effectiveness, especially for borderline leads where descriptions, skills, and about sections provide critical context.

---

## Feature Status: PRD vs Reality

### P0 — Core Features

| Feature | PRD Requirement | Status | Notes |
|---------|----------------|--------|-------|
| Company domain input | Accept domain + name | Done | SearchForm has both fields |
| Title keyword filters | Filter by job titles | Done | Comma-separated input |
| Seniority filters | Filter by seniority level | Done | Toggle buttons: C-Suite/VP/Director/Head/Manager/Senior |
| Location filters | Filter by geography | Done | Passed to Apify actor |
| Email status filters | Filter by email availability | Done | Passed to Apify actor |
| Max leads control | Configurable result count | Done | Slider 5-100 |
| Apify Leads Finder | Find people at domain | Done | Replaced Apollo search + match |
| ~~Apollo people search~~ | ~~Find people at domain~~ | Replaced | Replaced by Apify Leads Finder |
| ~~Apollo match enrich~~ | ~~Get full names + emails~~ | Replaced | No longer needed — Apify returns full names + emails |
| ~~Apollo email reveal~~ | ~~Get emails for A+B~~ | Replaced | No longer needed — emails come from Leads Finder |
| Hybrid rules + AI scoring | Deterministic + Gemini | Done | Rules for confident, AI for borderline |
| 10-layer persona cascade | Persona detection logic | Done | In fore_ai_scorer.py |
| Red flag detection | Anti-persona penalties | Done | Cybersecurity, hardware, ESN, compliance |
| ESN/consultant filter | ~50 French IT firms | Done | Current employer only |
| Tier classification (A/B/C/D) | Score to tier mapping | Done | Color coded in UI |
| Per-lead reasoning | AI-generated explanations | Done | Visible in LeadDetail expanded row |
| Real-time progress (SSE) | Live pipeline updates | Done | 2-step progress tracker (search + score) |
| Results table | Sortable, expandable | Done | Sort by score/name/tier |
| XLSX export | Formatted download | Done | Color-coded tiers + summary sheet |

### P1 — Improvements Needed

| Feature | PRD Requirement | Status | What's Needed |
|---------|----------------|--------|---------------|
| LinkedIn profile enrichment | Rich profile data for scorer | Not built | Apify Profile Scraper — being worked on separately |
| Persistent storage | Runs survive restart | Not built | In-memory only. Add SQLite |
| Batch processing | Queue multiple domains | Not built | Sequential company processing |
| Rate limiting & backoff | Handle 100+ leads | Partial | Basic 0.5s delays exist. No exponential backoff |
| End-to-end validation | Test with live API | Partial | Rules validated against 7 examples. AI not validated live |
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

## Data Quality Gap

The scorer was designed for **rich LinkedIn profiles**. Apify Leads Finder provides **structured metadata** but **limited profile depth**.

| Data Field | Scorer Uses It For | Apify LinkedIn CSV | Apify Leads Finder | Impact |
|------------|-------------------|--------------------|--------------------|--------|
| **full name** | Identity, output | Full | Full | None |
| **headline** | Persona detection, title matching | Full | Full | None |
| **job title** | Persona cascade, seniority | Full | Full | None |
| **LinkedIn URL** | Output, future enrichment | Full | Full (always present) | None |
| **seniority_level** | Structured seniority signal | Not available | Structured field | Apify Leads Finder advantage |
| **functional_level** | Functional area signal | Not available | Structured field | Apify Leads Finder advantage |
| **email** | Contact | Not in LinkedIn | When available | Included by Leads Finder |
| **about / summary** | Software DNA, buying signals | Full | Not available | **-6 to -10 pts** |
| **experience descriptions** | Context validation, red flags | Full | Not available | **-8 to -12 pts** |
| **skills list** | QA tools detection | Full (10+) | Not available | **-4 to -8 pts** |
| **education** | Elite school bonus | Full | Not available | **-4 pts** |
| **experience history** | Past roles, ESN detection | Full (all roles) | Current role only | **-5 to -10 pts** |
| **country / location** | Geographic context | Full | Full | None |

### Scoring Impact by Lead Type

| Lead Type | Title Alone Sufficient? | Leads Finder Accuracy | With LinkedIn Enrichment |
|-----------|------------------------|----------------------|-------------------------|
| Direct QA title (Guillaume) | Yes — "Head of QA" is clear | 95% | 100% |
| Cybersecurity (Daryouche) | Yes — "Cybersecurity" in title | 95% | 100% |
| Hardware (Cornelius) | No — need descriptions | 60% | 100% |
| Innovation scout (Nicolas) | No — need description for budget/mandate context | 50% | 100% |
| VP Technical PO (Jeremy) | Partial — title helps, descriptions confirm | 75% | 100% |
| DevOps/CI-CD (Sophie) | Partial — need to check if about is stale | 70% | 100% |
| Executive sponsor (Laurent) | Partial — title + school bonus matter | 70% | 100% |

**Bottom line**: Apify Leads Finder is better than Apollo for clear-cut leads (full names, LinkedIn URLs, structured seniority) but still **struggles with borderline cases** where descriptions, skills, and about sections provide the decisive signals. LinkedIn profile enrichment is the path to 100% scoring effectiveness.

---

## Backend Issues to Fix

| Issue | Severity | Current State | Fix |
|-------|----------|---------------|-----|
| **In-memory storage** | Critical | Runs lost on restart | Add SQLite or JSON file persistence |
| **Memory leak** | Critical | `_runs` and `_event_queues` never cleaned | Add TTL-based cleanup (delete after 24h) |
| **Temp XLSX files** | Major | Never deleted from disk | Clean up after download |
| **Apollo service unused** | Minor | `apollo_service.py` still in codebase | Remove or archive — no longer part of pipeline |
| **Silent AI failures** | Major | Falls back to rules with no logging | Add logging + surface method in UI |
| **No input validation** | Major | Garbage domain accepted | Validate domain format |
| **outreach_angle empty** | Minor | Field exists, never populated | Populate from AI response or remove |
| **No auth** | Major | Anyone with URL can access | Add basic auth |
| **.env in repo** | Critical | API keys exposed | Add to .gitignore |

## Frontend Issues to Fix

| Issue | Severity | Current State | Fix |
|-------|----------|---------------|-----|
| **No pagination** | Major | All 100+ leads render at once | Add pagination or virtual scroll |
| **No tier filtering** | Major | Can't show only A+B leads | Add filter buttons above table |
| **No error recovery** | Major | Must reload page on failure | Add retry button |
| **No score breakdown** | Minor | Only total score shown | Show component scores in LeadDetail |
| **No domain validation** | Minor | Form accepts any string | Add regex check |
| **No search within results** | Minor | Must scroll to find person | Add text search filter |
| **CSS vars unused** | Minor | Tier colors hardcoded | Use CSS variables |
| **No clear results** | Minor | Can't reset without reload | Add "New Search" button |

---

## Recommended Action Plan

### Phase 1: Apify Leads Finder Migration — DONE

Replaced the Apollo pipeline with Apify Leads Finder. Simpler architecture, better data quality for basic fields.

```
BEFORE (Apollo):   Apollo Search -> Apollo Match -> Score (sparse) -> Email Reveal
AFTER  (Apify):    Apify Leads Finder -> Score -> Results
```

**Completed work:**
- [x] Added Apify service (`backend/services/apify_service.py`)
- [x] Updated pipeline.py to use Apify Leads Finder (2-step flow)
- [x] Updated data_mapper.py — maps Apify Leads Finder output to scorer format
- [x] Added APIFY_API_TOKEN to config
- [x] Removed Apollo dependency from pipeline (search, match, email reveal all replaced)

### Phase 2: LinkedIn Profile Enrichment (Next — In Progress Separately)

Add Apify LinkedIn Profile Scraper as an optional enrichment step after Leads Finder. This provides the full profile data the scorer was originally designed for.

- [ ] Add LinkedIn Profile Scraper actor integration to `apify_service.py`
- [ ] Update pipeline to optionally run profile scraping on Leads Finder results (using LinkedIn URLs)
- [ ] Update data_mapper.py to merge Leads Finder + Profile Scraper data
- [ ] Re-validate against 7 training examples with enriched data
- [ ] Cost analysis: Leads Finder + Profile Scraper combined cost per 1,000 leads

### Phase 3: Production Hardening

- [ ] Add SQLite for run persistence
- [ ] Add run cleanup (TTL 7 days)
- [ ] Add temp file cleanup for XLSX exports
- [ ] Add basic auth
- [ ] Add .env to .gitignore
- [ ] Add domain validation in SearchForm
- [ ] Remove unused Apollo service code
- [ ] Add logging for AI failures/fallbacks

### Phase 4: UX Polish

- [ ] Add tier filtering to ResultsTable
- [ ] Add pagination (25 leads per page)
- [ ] Add error recovery / retry button
- [ ] Add "New Search" button to clear results
- [ ] Add score breakdown to LeadDetail
- [ ] Add search/filter within results
