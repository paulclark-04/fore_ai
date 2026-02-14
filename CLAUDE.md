# Fore AI Lead Scoring Agent

## Project Overview

This is a **lead scoring system** for Paul, an SDR at **Fore AI** — a company selling autonomous QA agents for enterprise web application testing, focused on the **French market**.

The system takes LinkedIn profile data (enriched via Apify API) and scores each lead (0-100) with a tier (A/B/C/D) and 1-3 sentence reasoning on persona fit. Companies are **already manually vetted** — scoring is purely about **persona fit within pre-qualified companies**. Only A+B tier leads get outreach.

### Core Architecture: Hybrid Scoring

The script uses a **hybrid approach**:
1. **Deterministic rules** run on ALL leads (instant, free)
2. Leads scoring 35-82 ("borderline") get sent to **Claude API** for deeper inference
3. Confident A (>=83) and confident D (<35) skip AI — saving cost
4. Without an API key, the script runs in rules-only mode

## Key Files

```
fore_ai_scorer.py          # Main script (~1260 lines). THE deliverable.
test_leads.csv             # 7 calibrated training examples in exact CSV format
scored_leads_demo.xlsx     # Demo output showing scored results
Fore AI Context Guide.pdf  # 10-page product/market/buyer intelligence doc (reference)
Persona example cheat sheet - Sheet1.csv  # 4 detailed training examples with analysis
```

## How to Run

```bash
# Rules-only (fast, no API cost)
python fore_ai_scorer.py leads.csv

# Hybrid with explicit API key
python fore_ai_scorer.py leads.csv --api-key sk-ant-xxx

# Hybrid using environment variable
export ANTHROPIC_API_KEY=sk-ant-xxx
python fore_ai_scorer.py leads.csv --hybrid

# Custom output file and model
python fore_ai_scorer.py leads.csv -o scored.xlsx --api-key sk-ant-xxx --model claude-haiku-4-5-20251001
```

### Dependencies

```
pandas, openpyxl, anthropic (only for hybrid mode)
```

## Input CSV Format (from Apify LinkedIn enrichment)

```
firstName, lastName, linkedinUrl, about, headline,
education/0/schoolName, education/0/degree, education/0/description,
currentPosition/0/companyName,
experience/0/description, experience/0/duration, experience/0/location,
experience/0/companyName, experience/0/position, Experience 0 - Skills,
experience/1/companyName, experience/1/description, experience/1/duration,
experience/1/location, experience/1/position, Experience 1 - Skills,
experience/2/companyName, experience/2/description, experience/2/location,
experience/2/position, experience 2 - Skills
```

Note the inconsistent casing on skills columns — `Experience 0 - Skills` vs `experience 2 - Skills`. The `get_col()` function handles this by trying multiple column name variants.

## Output

Formatted XLSX with:
- Lead Scores sheet: color-coded tiers, auto-filtered, Method column (Rules vs AI)
- Summary sheet: tier counts, actionable lead total, scoring method stats

---

## CRITICAL DOMAIN CONTEXT — Read This First

### What Fore AI Sells

Autonomous QA agents for enterprise web application testing. Multi-agent AI system (Planning Agent, Coding Agent, Verification Agent) that tests complex user journeys end-to-end. Self-healing tests that adapt when UI changes. 94% accuracy, 10x faster than manual QA, 60-80% test coverage achievable.

### The French Market Nuance (MOST IMPORTANT)

**In France, people overseeing QA often do NOT have "QA" in their title.** The system must INFER and REASON about whether a person has influence over software QA decisions. This is the entire reason AI inference exists in this system.

The core question for every lead: **"Would I bet $1000 this person would be interested in discussing Fore AI's QA agents?"**

### Target Personas

| Priority | Persona | Example Titles |
|----------|---------|---------------|
| Primary | QA/Test Leadership | Head of QA, Test Manager, Release Manager, Responsable Recette |
| Secondary | Tech Leadership | CTO, VP Engineering, DSI, Head of Platform |
| Growing | Digital/Product Leadership | Head of Digital, Product Owner (web apps), Head of e-Banking |
| Niche | Transformation/Delivery | Digital Factory Lead, PMO Director (IT), Head of Delivery |
| Special | Innovation/Startup Scouts | With budget + mandate to pilot new tech |
| Special | C-Level Executive Sponsors | DG Technologies, DSI — pitch transformation not features |

### Anti-Personas (Disqualify)

- **Non-software QA**: Manufacturing quality, supply chain, call center QA, document control
- **Cybersecurity/Fraud/CSIRT**: Security operations, not software quality
- **AML/KYC Compliance**: Regulatory compliance, not software testing
- **Hardware/Physical Engineering**: Airframes, wings, plant operations, mechanical engineering
- **Consultants at ESN firms**: Capgemini, Sopra Steria, Atos, etc. with no budget authority
- **Junior individual contributors**: No decision-making power

### Target Verticals

Financial Services, Insurance, E-commerce, Travel, Media. But companies are already pre-vetted so the script does not check verticals.

### Company Size

Enterprise (1000+ FTE) primary, Mid-Market (500-999) secondary. Not checked by script (pre-vetted).

---

## Scoring Architecture

### Score Composition (0-100)

```
Final = Persona (0-40) + Seniority (0-20) + Software DNA (0-30) + Buying Signals (0-20) + Education (0-4) - Red Flag Penalties
```

### Tiers

- **A (80-100)**: Direct buyer or strong influence over QA decisions. Outreach immediately.
- **B (60-79)**: Relevant persona, likely interested but not direct buyer. Outreach.
- **C (40-59)**: Unclear fit, some signals but ambiguous. Skip or nurture.
- **D (0-39)**: Wrong persona, wrong domain, or clear red flag. Do not contact.

### Persona Scoring (10-Layer Cascade)

The layers are checked in order; first match wins:

1. **Direct QA/Test title** (35-40 pts) — slam dunk, check it's software QA not manufacturing
2. **DevOps/CI-CD pipeline** (24-36 pts) — they own the pipeline where QA bottlenecks live
3. **VP + Product Owner combo** (25-30 pts) — checked BEFORE C-Level to handle "Vice-President Technical PO"
4. **C-Level with Tech/Ops scope** (5-30 pts) — executive sponsor; CTO trap check for manufacturing
5. **Innovation/Startup scout** (12-32 pts) — budget + software DNA can override vertical mismatch
6. **Technical Product Owner** (8-25 pts) — web/digital app context needed
7. **Digital Transformation** (10-22 pts) — exclude "digital fraud" / "digital security"
8. **Engineering/Architecture** (0-22 pts) — must be software, not hardware
9. **Project/Delivery management** (5-15 pts) — software context needed
10. **Fallback** (0-5 pts) — any software DNA anywhere

### Red Flag Detection

- Non-software QA → -30
- Cybersecurity/Fraud (headline + title only, NOT descriptions) → -30
- Compliance/Audit → -25
- Hardware engineering (title AND descriptions, Cornelius pattern) → -20 to -30
- Current employer is ESN (consultant) → -15
- Zero software DNA anywhere → -20
- Moved away from relevant role → -10

---

## The 7 Calibrated Training Examples

These are the ground truth. ANY change to the scoring logic must be validated against ALL 7.

| Name | Role | Company | Expected Tier | Current Score | Key Reasoning |
|------|------|---------|---------------|---------------|---------------|
| **Guillaume Tronche** | Head of Software QA & Release Manager | Credit Agricole CIB | **A** | 95 | Textbook primary buyer. Direct QA title + banking + 11yr tenure + QA tools |
| **Nicolas Sorre** | Head of Smart Factory | Airbus | **A** | 81 | Innovation scout with budget (6M) + startup mandate + software/IT DNA despite manufacturing title |
| **Jeremy Signoret** | VP Technical PO/PM | Lombard Odier | **A** | 80 | Web app delivery in banking, legacy migration pain, VP seniority, J2EE/Spring |
| **Sophie Planchais** | Head of Cloud & DevOps | Airbus | **B** | 66 | Owns CI/CD pipeline, QA bottlenecks are her problem. Recency trumps SAP legacy in About |
| **Laurent Benatar** | DG Technologies et Operations | Groupe BPCE | **B** | 74 | Executive sponsor at major bank. Pitch transformation, not features. Polytechnique + Telecom Paris |
| **Cornelius Waidelich** | Transformation Leader Airbus CTO | Airbus | **D** | 24 | All hardware engineering (wings, airframes). Zero software context. "CTO trap" |
| **Daryouche Khodai** | Cybersecurity & Digital Fraud | BNP Paribas | **D** | 0 | Security ops, not QA. "Digital Fraud" != Digital Transformation |

---

## Critical Bugs Found & Fixed (Do Not Regress)

### 1. Past Employer ESN False Positive (Guillaume)
**Problem**: Guillaume's employer from 2007-2011 (Acial) was in ESN_FIRMS list. Flagged him as consultant despite 11 years at Credit Agricole.
**Fix**: Consultant detection only checks CURRENT employer (`experience/0/companyName`), not past employers.
**Test**: Guillaume must score A, not get consultant penalty.

### 2. Cybersecurity Keyword False Positive (Nicolas)
**Problem**: Nicolas's Smart Factory description mentioned "cybersecurity kits" as one of many IoT projects. Triggered security red flag.
**Fix**: Security red flag only checks `headline + current position title`, not full descriptions.
**Test**: Nicolas must score A, not get security penalty.

### 3. Hardware Detection Too Narrow (Cornelius)
**Problem**: Title "Transformation Leader Airbus CTO" doesn't contain hardware keywords, but descriptions are full of "airframe engineering", "wing manufacturing".
**Fix**: Hardware check includes both title AND descriptions. Higher penalty when both current and past roles show hardware.
**Test**: Cornelius must score D with hardware penalty.

### 4. VP/Product Owner Layer Ordering (Jeremy)
**Problem**: "Vice-President" triggered C-Level check (Layer 4) before Product Owner check (Layer 5). Got "C-Level (unclear tech scope)" instead of "VP Technical Product Owner".
**Fix**: Inserted Layer 3 specifically for VP + Product Owner combinations, checked before C-Level.
**Test**: Jeremy must match "VP Technical Product Owner" persona, not "C-Level".

### 5. "Digital Fraud" False Positive (Daryouche)
**Problem**: Headline "Cybersecurity & Digital Fraud" triggered Digital Transformation persona match because "digital" is in KW_DIGITAL_TITLE.
**Fix**: If title has digital + fraud/cyber/security, skip digital transformation check.
**Test**: Daryouche must score D (0), not get digital transformation points.

### 6. Substring Matching Bug ('cto' in 'factory', 'president' in 'vice-president')
**Problem**: Python `in` operator matched 'cto' as substring of 'factory' (Nicolas's "Smart Factory"), causing false C-Level detection. Similarly 'president' matched inside 'vice-president'.
**Fix**: Created `has_word()` function using regex word boundaries `(?<![a-zA-Za-y])keyword(?![a-zA-Za-y])` for short ambiguous keywords. Applied to seniority and persona C-Level checks.
**Test**: Nicolas must NOT match C-Level. Jeremy must match VP, not C-Level/President.

### 7. Seniority VP vs C-Level Ordering
**Problem**: "vice-president" contains "president" which is in KW_SENIORITY_CLEVEL. C-Level check fired before VP check.
**Fix**: Reordered seniority function to check VP FIRST, then C-Level.
**Test**: Jeremy must get VP seniority (18 pts), not C-Level (20 pts).

---

## The ESN/Consultant Filter

**Critical context**: In the French market, ESN (Entreprise de Services du Numerique) firms are IT consulting companies. Their consultants are often embedded at client companies and have LinkedIn titles like "Project Manager at [Bank Name]". They look like internal buyers but have **zero budget authority**.

The ESN_FIRMS list includes ~50 firms: Capgemini, Sopra Steria, Atos, CGI, Altran, Alten, Accenture, Devoteam, Aubay, TCS, Infosys, Wipro, Cognizant, and many more including Big 4 consulting (Deloitte, KPMG, EY, PwC) and staffing agencies (Adecco, Hays, Michael Page, Randstad, Manpower).

**Rule**: Only the CURRENT employer is checked against ESN_FIRMS. A past ESN employer is fine if the person now works at an end-client with long tenure (e.g., Guillaume worked at Acial 2007-2011 but has been at Credit Agricole since 2014).

---

## Key Scoring Rules for the AI Prompt

These rules are encoded in `AI_SCORING_PROMPT` and should be maintained if the prompt is updated:

1. **Current role trumps past history** — don't target people based on a job they left years ago
2. **Recency trumps About section** — About may reflect old skills/roles (Sophie's SAP specialties vs current DevOps role)
3. **"CTO" trap in manufacturing** — at Airbus, CTO means physical product technology, not software
4. **"Digital" + "Fraud" = NOT digital transformation** — cybersecurity/fraud is a completely different budget
5. **Past ESN employer is OK** if current employer is end-client with long tenure
6. **Innovation/startup scouts with budget** can override vertical mismatches (Nicolas pattern)
7. **Executive sponsors** (C-Level at target accounts) get different outreach — pitch transformation/efficiency, not features

---

## Cost Optimization

For the hybrid AI mode:
- **Haiku 4.5** (`claude-haiku-4-5-20251001`): ~$2.20/month at 2,000 leads/month. Best cost/performance ratio for this structured task.
- **Sonnet 4.5** (`claude-sonnet-4-5-20250929`): ~$8.30/month. Better for edge cases.
- **Opus 4.5**: ~$41.30/month. Overkill for this task.

The prompt is highly structured with 7 training examples and explicit criteria, making Haiku a strong choice. Test on the 7 training examples to validate before committing.

---

## Validation Protocol

After ANY change to scoring logic:

```bash
python fore_ai_scorer.py test_leads.csv -o test_output.xlsx
```

Expected results:
```
Guillaume Tronche     95  A
Nicolas Sorre         81  A
Jeremy Signoret       80  A
Laurent Benatar       74  B
Sophie Planchais      66  B
Cornelius Waidelich   24  D
Daryouche Khodai       0  D
```

All 7 must match their expected tiers. Scores can shift slightly but tier assignments are the hard constraint.

---

## Known Limitations & Future Work

1. **Scores are calibrated on only 7 examples** — may need recalibration as more real-world leads are processed
2. **Only 3 experience slots** from Apify data — misses career depth for people with 10+ roles
3. **No company-level signals** — companies are pre-vetted, but integrating company size/vertical could improve scoring
4. **French/English bilingual only** — keyword lists cover both but may miss other languages
5. **Skills columns are unreliable** — Apify doesn't always populate them; some leads have empty skills
6. **AI inference not yet tested end-to-end with real API key** — the hybrid routing logic is complete and tested with mocks, but needs a live API test
7. **Batch processing with `--hybrid` on 200+ leads** — may need rate limiting adjustments (currently 0.5s delay between AI calls)
8. **No deduplication** — if the same person appears in multiple CSV files, they'll be scored twice
