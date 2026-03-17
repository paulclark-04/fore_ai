# Fore AI Lead Scoring Pipeline

## Project Overview

**Claude Code-native lead scoring pipeline** for Paul, an SDR at **Fore AI**. The pipeline automates lead sourcing, enrichment, scoring, and export — all orchestrated by Claude Code slash commands with API scripts.

**Claude IS the scoring engine.** No external AI API needed for scoring. Claude reads the knowledge base and reasons through each profile directly.

### What Fore AI Sells

Autonomous QA agents for enterprise web application testing. Multi-agent AI system (Planning Agent, Coding Agent, Verification Agent) that tests complex user journeys end-to-end on web apps. Self-healing tests that adapt when UI changes. 94% accuracy, 10x faster than manual QA, 60-80% test coverage achievable.

### Target Market

French enterprises (1000+ FTE), mid-market (500-999). Financial services, insurance, e-commerce, travel, media.

### The French Market Nuance (CRITICAL)

**In France, people overseeing QA often do NOT have "QA" in their title.** The system must INFER and REASON about whether a person has influence over software QA decisions. This is the entire reason Claude exists in this system — keyword matching alone fails for 40% of leads.

The core question for every lead: **"Would I bet $1000 this person would be interested in discussing Fore AI's QA agents?"**

---

## Pipeline Architecture

```
/scrape-leads         ← Apify Leads Finder: search for people at target domains
      │
      ▼
/enrich-profiles      ← Apify LinkedIn Profile Scraper: full career history
      │
      ▼
/score-leads          ← Claude IS the scorer (reads knowledge/, no external API)
      │
      ▼
/export-to-sheets     ← Results written to Google Sheets with Score, Tier, Reasoning
      │
      ▼
/push-to-hubspot      ← A-tier leads → HubSpot contacts + sequences
      │
      ▼
/review-scores        ← Paul corrects scores → knowledge base updates (RLHF)
```

Or run everything at once: `/run-pipeline airbus.com`

---

## File Structure

```
fore-ai-scorer/
│
├── CLAUDE.md                          # This file — project context
│
├── .claude/commands/                  # Slash commands
│   ├── run-pipeline.md               # /run-pipeline — full end-to-end
│   ├── scrape-leads.md               # /scrape-leads — Apify search
│   ├── enrich-profiles.md            # /enrich-profiles — LinkedIn enrichment
│   ├── score-leads.md                # /score-leads — Claude-native scoring
│   ├── export-to-sheets.md           # /export-to-sheets — Google Sheets output
│   ├── plan-wave.md                  # /plan-wave — 3-week wave planning
│   ├── push-to-hubspot.md            # /push-to-hubspot — CRM integration
│   ├── review-scores.md              # /review-scores — RLHF feedback processing
│   └── validate-scoring.md           # /validate-scoring — ground truth regression test
│
├── knowledge/                         # Scoring knowledge base (Claude reads these)
│   ├── scoring_guide.md              # Complete scoring methodology
│   ├── calibration_examples.md       # 40 ground truth examples
│   ├── anti_personas.md              # Red flags, ESN list, keyword lists
│   ├── scoring_prompt.md             # Adapted scoring prompt for Sonnet 4.6
│   └── patterns/                     # Growing pattern library (RLHF)
│       ├── trap_patterns.md          # Scoring traps discovered through feedback
│       ├── persona_patterns.md       # New persona types
│       └── company_patterns.md       # Company-specific scoring notes
│
├── scripts/                           # API helper scripts
│   ├── search_leads.py               # Apify Leads Finder
│   └── enrich_profiles.py            # Apify LinkedIn Profile Scraper
│
├── ground_truth.json                  # Regression test suite (40 leads)
├── .env                               # API keys (APIFY_API_TOKEN, APOLLO_API_KEY)
│
├── fore_ai_scorer.py                  # Legacy standalone scorer (1961 lines, reference only)
├── scoring_prompt.txt                 # Legacy Gemini prompt (reference only)
└── backend/ & frontend/               # Legacy web app (reference only)
```

---

## Scoring Architecture

### Score Composition (0-100)

```
Final = Persona (0-40) + Seniority (0-20) + Software DNA (0-30)
      + Buying Signals (0-20) + Education (0-4) - Red Flag Penalties
```

### Tiers

| Tier | Range | Meaning | Action |
|------|-------|---------|--------|
| A | 80-100 | Direct buyer or strong influence over QA decisions | Outreach immediately |
| B | 60-79 | Relevant persona, likely interested but not direct buyer | Outreach |
| C | 40-59 | Unclear fit, some signals but ambiguous | Skip or nurture |
| D | 0-39 | Wrong persona, wrong domain, or clear red flag | Do not contact |

### Score Ceiling Rule

90-100 is ONLY for: direct QA/Test/Release titles with clear software context, profiles actively running PoCs for QA tools, or Group-level C-suite with explicit AI/automation mandate. Everything else caps at 88.

### Critical Scoring Rules

1. **Current role trumps past history** — don't score someone on a job they left years ago
2. **Recency trumps About section** — About may reflect old skills/roles
3. **"CTO" trap in manufacturing** — at Airbus, CTO = physical product technology
4. **"Digital" + "Fraud" = NOT digital transformation** — different budget entirely
5. **Past ESN employer is OK** if current employer is end-client with long tenure
6. **Innovation scouts with budget** can override vertical mismatches (Nicolas Sorre pattern)
7. **Executive sponsors** get different outreach — pitch transformation, not features
8. **Verify current employer** — person who LEFT the company = D tier
9. **Empty profiles** = D tier, never invent a persona from company context alone
10. **Content Quality != Software QA** — C tier max despite senior title

---

## Key Calibration Anchors (from 40 ground truth leads)

| Name | Title | Company | Tier | Score | Key Reasoning |
|------|-------|---------|------|-------|---------------|
| Guillaume Tronche | Head of Software QA & Release Manager | Credit Agricole CIB | A | 95 | Textbook primary buyer |
| Rania KALLEL | Lead QA Domain | Veepee | A | 100 | Direct QA + active PoC |
| Nicolas Sorre | Head of Smart Factory | Airbus | A | 81 | Innovation scout + 6M budget + software DNA |
| Flavien Moutawe | Engineering Manager, EngineeringOps | Veepee | B | 78 | QA awareness but delivery manager, cap 78 |
| Sophie Planchais | Head of Cloud & DevOps | Airbus | B | 66 | Owns pipeline, not QA |
| Marion Mélin-Weiss | Head of Group Content Quality | Veepee | C | ~42 | Content quality != software QA |
| Cornelius Waidelich | Transformation Leader Airbus CTO | Airbus | D | 24 | CTO trap — hardware engineering |
| Daryouche Khodai | Cybersecurity & Digital Fraud | BNP Paribas | D | 0 | Digital Fraud trap |

Full 40 examples in `knowledge/calibration_examples.md`. All must pass `/validate-scoring`.

---

## RLHF Architecture (Three-Layer Memory)

**Layer 1 — Static Knowledge** (rarely changes): scoring_guide.md, anti_personas.md, scoring_prompt.md

**Layer 2 — Growing Ground Truth** (changes each RLHF cycle): ground_truth.json, calibration_examples.md

**Layer 3 — Pattern Library** (grows organically): patterns/trap_patterns.md, persona_patterns.md, company_patterns.md

### RLHF Cycle

Score batch → Paul reviews → `/review-scores` processes corrections → Knowledge updated → `/validate-scoring` confirms no regressions → Better scoring next batch

---

## Pipeline Cost

| Step | Cost | Source |
|------|------|--------|
| Lead search | ~$0.002/lead | Apify Leads Finder |
| LinkedIn enrichment | $0.004/profile | Apify LinkedIn Profile Scraper |
| Scoring | $0 | Claude (no external API) |
| **Total per 1,000 leads** | **~$6/1k** | |

---

## Validation Protocol

Before ANY pipeline runs or after ANY knowledge updates:
1. Read all `knowledge/` files
2. Run `/validate-scoring` against all 40 ground truth leads
3. All 40 tiers must match (HARD constraint)
4. Scores within tolerance (soft constraint)
5. No deployment without 40/40 passing

---

## Critical Bugs Fixed (Do Not Regress)

1. **Past ESN False Positive**: Only check CURRENT employer against ESN list
2. **Cybersecurity Keyword False Positive**: Security red flag only checks headline + current title, NOT descriptions
3. **Hardware Detection**: Check both title AND descriptions for hardware keywords
4. **VP/Product Owner Layer Ordering**: VP+PO combo checked BEFORE C-Level
5. **"Digital" + "Fraud" False Positive**: Always D tier, not digital transformation
6. **Substring Matching**: Use word boundaries for short keywords (cto, president)
7. **Seniority VP vs C-Level**: Check VP FIRST, then C-Level
8. **Left target company**: Current employer != searched company → D tier
9. **Revenue PO**: Product Owner + revenue/billing keywords → D tier
10. **"Innovation" in retail**: Require strong signals (startup, POC, partnerships)
11. **"Commerce Digital"**: E-commerce revenue strategy, not software engineering
12. **Content Quality trap**: Content/editorial quality, not software QA → C tier max
