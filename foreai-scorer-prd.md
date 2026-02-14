# PRD: Fore AI Lead Scoring & Sourcing Agent

## 1. TL;DR

A web-based lead qualification agent that automates account research for Fore AI's sales team. Sales reps input company domains and filters, and the system returns scored and ranked personas with contact details, AI-generated relevance reasoning, and tier classifications (A/B/C/D) — specifically calibrated for Fore AI's autonomous QA agent offering in the French enterprise market. The system combines Apify's Leads Finder actor for sourcing with a hybrid rules + AI scoring engine that understands French job title conventions, ESN (consulting firm) filtering, and domain-specific anti-patterns.

## 2. Goals

### Business Goals

* Reduce per-account research time from 30-45 minutes to under 5 minutes (85%+ time savings)
* Eliminate manual LinkedIn profile review by automating persona identification and qualification
* Lower tooling costs by leveraging Apify Leads Finder (~$1.5/1k leads) instead of paid Apollo seats, Lusha, or LinkedIn Sales Navigator
* Enable consistent, repeatable lead quality across the sales team regardless of individual market knowledge
* Build a scoring engine that encodes institutional knowledge about the French QA buyer landscape

### User Goals

* Instantly identify decision-makers and influencers at pre-vetted target accounts
* Understand *why* each persona is relevant to Fore AI's value proposition before outreach, with specific reasoning
* Know immediately which leads to contact (A+B tiers) vs. skip (C+D), without manual judgment calls
* Access email addresses and contact details for actionable leads in one consolidated view
* Export scored results to XLSX for CRM import or team sharing

### Non-Goals

* Building a full CRM or deal management system
* Generating outreach messages or email copy (focused on sourcing and qualification only)
* Company-level vetting or industry validation — target accounts are already manually vetted before entering the system
* Real-time enrichment of existing CRM records (focused on net-new account research)
* Multi-touch sequence automation or engagement tracking
* LinkedIn profile enrichment is planned as a separate future integration

## 3. User Stories

**Paul, SDR at Fore AI (primary user):**
When I receive a pre-vetted target account (e.g., Credit Agricole, BPCE, Airbus), I need to quickly find the 10-25 people most likely to care about autonomous QA agents — not just obvious "QA Manager" titles, but also DevOps leads who own CI/CD pipelines, digital transformation heads, and innovation scouts with budget for new tech. In France, QA decision-makers rarely have "QA" in their title. I need the system to understand that a "Responsable Recette" is a primary buyer, that a "DSI" is an executive sponsor, and that a consultant at Capgemini embedded at my target account has zero budget authority.

**Sales Team Lead:**
When I review the team's weekly sourcing output, I need confidence that lead quality is consistent — that we're not wasting outreach on cybersecurity people, manufacturing quality managers, or IT consultants. The scoring tiers (A/B/C/D) should be reliable enough that I can trust "only contact A+B" as a rule without spot-checking every lead.

## 4. Domain Context: The French Market

This is the most important context for understanding the system's value and complexity.

### Why AI Scoring Matters

In the French enterprise market, people overseeing software QA often do NOT have "QA" in their title. The system must **infer** whether a person influences QA decisions by analyzing their full profile — title, headline, experience descriptions, seniority, and company context. This is why simple title matching fails and AI reasoning is essential.

### Target Personas

| Priority | Persona | Example Titles |
|----------|---------|---------------|
| Primary | QA/Test Leadership | Head of QA, Test Manager, Release Manager, Responsable Recette |
| Secondary | Tech Leadership | CTO, VP Engineering, DSI, Head of Platform |
| Growing | Digital/Product Leadership | Head of Digital, Product Owner (web apps), Head of e-Banking |
| Niche | Transformation/Delivery | Digital Factory Lead, PMO Director (IT), Head of Delivery |
| Special | Innovation/Startup Scouts | With budget + mandate to pilot new tech |
| Special | C-Level Executive Sponsors | DG Technologies, DSI — pitch transformation not features |

### Anti-Personas (Must Disqualify)

* **Non-software QA**: Manufacturing quality, supply chain, call center QA, document control
* **Cybersecurity/Fraud/CSIRT**: Security operations, not software quality — "Digital Fraud" != Digital Transformation
* **Compliance/Audit**: AML/KYC regulatory, not software testing
* **Hardware/Physical Engineering**: Airframes, wings, plant operations (the "CTO trap" at Airbus — CTO means physical product tech, not software)
* **ESN Consultants**: Employees of Capgemini, Sopra Steria, Atos, Accenture, etc. — no budget authority even if embedded at target accounts. Only current employer is checked; past ESN employment is fine.
* **Junior individual contributors**: No decision-making power

### The ESN Filter

ESN (Entreprise de Services du Numerique) are French IT consulting firms. Their consultants have LinkedIn titles like "Project Manager at [Bank Name]" but work for the ESN, not the bank. ~50 firms are tracked including Big 4 consulting and staffing agencies. Only the **current** employer is checked — a person who left Capgemini 5 years ago and now works at Credit Agricole is a valid lead.

## 5. System Architecture

### Pipeline Flow

```
Company Domain + Filters Input
    │
    ├─ Step 1: Apify Leads Finder Search (~$1.5/1k leads)
    │   └─ Find people at domain(s) with title/seniority/location filters
    │   └─ Returns: first_name, last_name, email, personal_email,
    │       mobile_number, job_title, headline, linkedin,
    │       seniority_level, functional_level, country, company_name
    │   └─ LinkedIn URL is key output — enables future profile enrichment
    │   └─ Free plan: max 100 leads per run
    │
    ├─ Step 2: AI Scoring (Hybrid)
    │   └─ Deterministic rules run on ALL leads (instant, free)
    │   └─ Borderline leads (score 35-82) get AI inference via Gemini
    │   └─ Confident A (≥83) and confident D (<35) skip AI — saves cost
    │   └─ Returns: score (0-100), tier (A/B/C/D), reasoning, persona label
    │
    └─ Results
        └─ Sorted by score, with tier color coding
        └─ Emails and contact details included directly from search
        └─ XLSX export with formatted output
```

### Scoring Engine (0-100)

```
Final = Persona (0-40) + Seniority (0-20) + Software DNA (0-30)
        + Buying Signals (0-20) + Education (0-4) - Red Flag Penalties
```

**Persona Detection** uses a 10-layer cascade (first match wins):
1. Direct QA/Test title (35-40 pts)
2. DevOps/CI-CD pipeline owner (24-36 pts)
3. VP + Product Owner combo (25-30 pts)
4. C-Level with Tech/Ops scope (5-30 pts)
5. Innovation/Startup scout (12-32 pts)
6. Technical Product Owner (8-25 pts)
7. Digital Transformation (10-22 pts)
8. Engineering/Architecture (0-22 pts)
9. Project/Delivery management (5-15 pts)
10. Fallback — any software DNA (0-5 pts)

**Red Flags** (penalties):
* Non-software QA: -30
* Cybersecurity/Fraud (headline + title only): -30
* Compliance/Audit: -25
* Hardware engineering: -20 to -30
* Current employer is ESN: -15
* Zero software DNA: -20
* Moved away from relevant role: -10

### Tier Classification

* **A (80-100)**: Direct buyer or strong influence over QA decisions. Contact immediately.
* **B (60-79)**: Relevant persona, likely interested. Contact.
* **C (40-59)**: Unclear fit, some signals but ambiguous. Skip or nurture.
* **D (0-39)**: Wrong persona, wrong domain, or clear red flag. Do not contact.

### Tech Stack

* **Backend**: FastAPI (Python), async pipeline with SSE for real-time progress
* **Frontend**: React 19 + Vite + Tailwind CSS v4
* **AI Provider**: Gemini 2.5 Flash (fast, cheap) with rules-only fallback
* **Data Source**: Apify Leads Finder actor (~$1.5/1k leads)
* **Scoring Engine**: `fore_ai_scorer.py` — 1600+ line deterministic + AI hybrid scorer
* **Output**: XLSX with color-coded tiers, summary sheet, auto-filters

## 6. Functional Requirements

### P0 — Core (Already Built)

* **Company domain input**: Search form accepts company domain(s), title keywords, seniority level, location, email status, and fetch count
* **Apify Leads Finder search**: Single-step search returns full names, emails, job titles, headlines, LinkedIn URLs, and company info
* **Hybrid scoring**: Rules-only for confident leads, AI for borderline cases
* **Tier classification**: A/B/C/D with per-lead reasoning and persona labels
* **Real-time progress**: SSE streaming shows pipeline progress (Searching → Scoring → Done)
* **Results table**: Sortable by score/tier/name, expandable detail rows with full scoring breakdown
* **XLSX export**: Formatted output with color coding and summary sheet
* **ESN/consultant filtering**: Current employer checked against ~50 French IT consulting firms
* **Anti-persona detection**: Red flags for cybersecurity, hardware, compliance, non-software QA
* **LinkedIn URLs**: Every lead includes a LinkedIn profile URL for future enrichment or manual review

### P1 — Improvements Needed

* **Persistent storage**: Pipeline runs are currently in-memory (lost on restart) — add SQLite or similar
* **Batch processing**: Support queuing multiple company domains for sequential processing
* **LinkedIn profile enrichment**: Use LinkedIn URLs from Apify to fetch full experience history for deeper scoring
* **End-to-end validation**: Validate AI scoring against the 7 calibrated training examples with live API
* **Error recovery**: Resume failed pipeline runs instead of starting over

### P2 — Future Enhancements

* **Duplicate detection**: Flag if same person was scored in a previous search
* **Search history**: Browse and re-export past runs
* **Feedback loop**: Thumbs up/down on individual lead scores to improve calibration
* **CSV import mode**: Upload a pre-existing lead list for scoring without Apify search
* **Multi-company batch**: Upload a list of 10+ domains and process overnight

### Out of Scope

* Chrome extension
* Org chart visualization
* CRM integration or Salesforce sync
* Outreach message generation
* LinkedIn activity monitoring
* Industry/vertical validation (accounts are pre-vetted)

## 7. User Experience

### Primary User Journey

1. User opens the web app and enters company domain(s) (e.g., `creditagricole.com`) plus optional title keywords, seniority level, location, and fetch count
2. User clicks "Search" to start the pipeline
3. Real-time progress indicator shows each step: Searching → Scoring → Done
4. Results appear as a sortable table with tier color coding (A=green, B=yellow, C=orange, D=red)
5. User expands individual rows to see full scoring breakdown: persona label, seniority, reasoning, red flags
6. Summary cards show tier distribution (e.g., "3 A-tier, 5 B-tier, 8 C-tier, 9 D-tier")
7. User clicks "Export XLSX" to download formatted results for CRM import or sharing

### Edge Cases

* **Few results**: Apify may return fewer people than expected for smaller companies or niche titles — display what's available, no minimum threshold
* **Free plan cap**: Apify free plan limits to 100 leads per run — display a warning if the cap is reached and suggest reducing filters or upgrading
* **Missing email**: Some leads may not have email addresses — show in results with empty email field, still include scoring
* **Missing mobile number**: Mobile numbers are only available on paid Apify plans — handle gracefully on free tier
* **AI scoring failure**: If Gemini API fails, fall back to rules-only scoring automatically (already implemented)
* **No experience history**: Apify Leads Finder only returns current role data (job_title, headline, company_name) — scoring relies on title/headline analysis without full career context. LinkedIn profile enrichment will be added later to provide deeper experience data
* **LinkedIn URL missing**: Rare but possible — flag these leads for manual lookup

## 8. Narrative

It's Monday morning and Paul has just received his weekly target account list — 10 pre-vetted French enterprise companies across banking, insurance, and e-commerce. In the past, this meant hours of manual research: opening LinkedIn Sales Navigator, guessing at seniority filters, scanning dozens of titles to figure out who might own QA decisions (remembering that in France, the person running QA is probably called "Responsable Recette" or "Head of Delivery" — not "QA Manager"), clicking through to LinkedIn to read experience descriptions, checking if someone is actually a Capgemini consultant embedded at the bank, copying contact details into a spreadsheet. Repeat for each company.

Today, Paul opens the Fore AI Scorer, types `creditagricole.com`, selects VP/Director/Head/Manager seniority filters, and clicks Search. The pipeline runs in real time — Apify Leads Finder pulls matching contacts with full names, emails, and LinkedIn URLs, then the hybrid scoring engine evaluates each lead. Twenty seconds later, he's looking at 20 scored personas. The top result is a Head of Software QA & Release Manager, score 95, tier A — textbook primary buyer. Next is a VP Technical Product Owner in web app delivery, score 80, tier A. Then a Head of Cloud & DevOps who owns CI/CD, score 66, tier B. Below the fold, a "Transformation Leader" at Airbus CTO office scores 24, tier D — the system detected hardware-related keywords and flagged it. A "Cybersecurity & Digital Fraud" lead scores 0, tier D — correctly identified as security ops, not digital transformation.

Paul exports the A+B leads to XLSX, clicks through to a few LinkedIn profiles for quick context, moves to the next account, and by mid-morning has processed all 10 companies with scored, qualified leads ready for personalized outreach. The institutional knowledge that used to live only in his head — which French titles map to QA buyers, which Airbus CTOs are hardware vs. software, which "Directors" are actually ESN consultants — is now encoded in the scoring engine and applied consistently to every search.

## 9. Success Metrics

### Validation (Quality Gate)

The scoring engine is calibrated against 7 ground-truth examples. After any change, ALL must pass:

| Lead | Expected Tier | Expected Score Range |
|------|---------------|---------------------|
| Guillaume Tronche (Head of Software QA, Credit Agricole) | A | 90-100 |
| Nicolas Sorre (Head of Smart Factory, Airbus) | A | 78-85 |
| Jeremy Signoret (VP Technical PO, Lombard Odier) | A | 78-85 |
| Laurent Benatar (DG Technologies, BPCE) | B | 70-80 |
| Sophie Planchais (Head of Cloud & DevOps, Airbus) | B | 60-72 |
| Cornelius Waidelich (Transformation Leader CTO, Airbus) | D | 15-30 |
| Daryouche Khodai (Cybersecurity & Digital Fraud, BNP) | D | 0-5 |

### Operational Metrics

* **Time per account**: Target <2 minutes end-to-end (search to export)
* **Tier accuracy**: A+B leads should be genuinely contactable upon manual spot-check (goal: 90%+)
* **D-tier precision**: Red-flagged leads should be correct disqualifications (goal: 95%+)
* **API cost per search**: ~$1.5/1k leads for Apify Leads Finder + ~$0.001/lead for Gemini Flash scoring
* **Accounts processed per week**: Target 8-12 per rep

### Health Indicators

* **Search completion rate**: Percentage of searches that complete without error
* **AI fallback rate**: How often Gemini fails and rules-only kicks in (should be <5%)
* **Average leads per search**: Track if Apify Leads Finder consistently returns enough results (free plan caps at 100/run)
* **Score distribution**: A+B should be 20-35% of results for pre-vetted accounts (if higher, scoring is too lenient; if lower, too strict)

## 10. Milestones

### Now: Production Hardening

The core pipeline is built and functional. Focus is on reliability and real-world validation:

* Validate scoring accuracy against the 7 calibrated examples with live Gemini API calls
* Add persistent storage for pipeline runs (SQLite) so results survive server restarts
* Integrate LinkedIn profile enrichment using LinkedIn URLs from Apify for deeper experience data
* Add batch processing — queue multiple domains for sequential runs
* Load test with 5-10 real target accounts and review scoring quality
* Fix any edge cases discovered during real-world usage

### Next: Team Rollout

* Deploy to a shared environment accessible by the sales team
* Add search history so past runs can be browsed and re-exported
* Add basic auth so only the sales team can access
* Build a simple feedback mechanism (flag incorrect scores) for ongoing calibration
* Document workflows and train team on usage

### Later: Scale & Intelligence

* CSV import mode — upload pre-existing lead lists for scoring without Apify search
* Multi-company batch processing with overnight queue
* Duplicate detection across searches
* Scoring calibration from feedback data
* LinkedIn profile enrichment pipeline — use stored LinkedIn URLs to fetch full experience history for re-scoring
* Consider switching AI provider (Claude Haiku vs. Gemini Flash) based on accuracy/cost data
