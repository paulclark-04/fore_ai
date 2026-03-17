# Fore AI Lead Scorer

Lead sourcing, enrichment, and scoring pipeline for **Fore AI** — an autonomous QA testing platform for enterprise web applications.

Built with **FastAPI** (backend) + **React / Vite / Tailwind CSS v4** (frontend). Searches for leads at target companies, enriches them with full LinkedIn profiles, and optionally scores them for persona fit using AI.

## Pipeline

```
Search (Apify Leads Finder)
  → AI Title Filter (Gemini — removes obvious non-fits)
  → LinkedIn Enrichment (Apify Profile Scraper)
  → AI Scoring (optional — Gemini or Claude)
  → Export (Google Sheets, XLSX, HubSpot)
```

**Cost**: ~$6 per 1,000 leads (search + enrichment). Scoring adds ~$0.42 per 1,000.

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- API keys (see below)

### 1. Clone and set up environment

```bash
git clone https://github.com/paulclark-04/fore_ai.git
cd fore_ai
```

```bash
# Backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
```

```bash
# Frontend
cd frontend
npm install
cd ..
```

### 2. Configure API keys

```bash
cp .env.example .env
```

Edit `.env` with your keys:

```env
APIFY_API_TOKEN=apify_api_xxx        # Required — powers lead search + LinkedIn enrichment
APOLLO_API_KEY=xxx                    # Optional — alternative lead search via Apollo
GOOGLE_API_KEY=xxx                    # Optional — enables AI title filtering + scoring (Gemini)
GOOGLE_SHEETS_ID=xxx                  # Optional — enables Google Sheets export
```

**Minimum to run**: You need `APIFY_API_TOKEN` for the core pipeline. Everything else is optional.

### 3. Run

Open two terminals:

```bash
# Terminal 1 — Backend (port 8000)
uvicorn backend.main:app --reload
```

```bash
# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Usage

### Web UI

1. **Pipeline page** — Enter one or more company domains (e.g., `airbus.com`), configure filters (job titles, seniority, location), and run the pipeline.
2. **Results** — Browse leads with enrichment data. If scoring is enabled, leads are ranked by tier (A/B/C/D).
3. **History** — View past pipeline runs.
4. **Accounts** — Manage target accounts and assign verticals.
5. **Personas** — Configure persona presets for different search strategies.
6. **Dashboard** — Overview stats across all runs.

### API

The backend exposes a REST API at `http://localhost:8000`:

- `POST /api/pipeline/start` — Start a pipeline run
- `GET /api/pipeline/{run_id}/events` — SSE stream of pipeline progress
- `GET /api/results/{run_id}` — Get results for a run
- `GET /api/runs` — List all runs
- `GET /api/health` — Health check

### Claude Code Commands

If you use [Claude Code](https://claude.ai/claude-code), this project includes slash commands in `.claude/commands/` (gitignored) for the full workflow:

- `/run-pipeline` — End-to-end pipeline execution
- `/scrape-leads` — Search for leads at target companies
- `/enrich-profiles` — LinkedIn profile enrichment
- `/score-leads` — AI scoring with knowledge base
- `/export-to-sheets` — Write results to Google Sheets
- `/push-to-hubspot` — Push A-tier leads to HubSpot
- `/review-scores` — RLHF feedback loop
- `/validate-scoring` — Regression test against ground truth

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Environment config
│   ├── core/
│   │   ├── database.py          # SQLite persistence
│   │   └── pipeline.py          # Pipeline orchestrator (search → enrich → score)
│   ├── models/
│   │   ├── schemas.py           # Pydantic models
│   │   └── data_mapper.py       # Apify/LinkedIn data normalization
│   ├── routes/                  # API endpoints
│   │   ├── pipeline.py          # Pipeline start + SSE events
│   │   ├── results.py           # Lead results
│   │   ├── runs.py              # Run history
│   │   ├── accounts.py          # Account management
│   │   ├── personas.py          # Persona presets
│   │   ├── dashboard.py         # Stats
│   │   ├── waves.py             # Wave planning
│   │   ├── export.py            # XLSX/Sheets export
│   │   └── search.py            # Direct search endpoints
│   └── services/
│       ├── apify_service.py     # Apify Leads Finder integration
│       ├── linkedin_enrichment_service.py  # LinkedIn Profile Scraper
│       ├── apollo_service.py    # Apollo API (alternative search)
│       └── scorer_service.py    # AI scoring (Gemini)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Router + layout
│   │   ├── api.js               # Backend API client
│   │   ├── pages/               # Page components
│   │   └── components/          # UI components
│   └── ...
│
├── knowledge/                   # Scoring knowledge base
│   ├── scoring_guide.md         # Scoring methodology
│   ├── calibration_examples.md  # 40 ground truth examples
│   ├── anti_personas.md         # Red flags and exclusion rules
│   ├── scoring_prompt.md        # AI scoring prompt
│   └── patterns/                # Learned patterns (RLHF)
│
├── scripts/                     # Standalone API scripts
│   ├── search_leads.py          # Apify lead search
│   └── enrich_profiles.py       # LinkedIn enrichment
│
├── fore_ai_scorer.py            # Legacy standalone scorer (reference)
├── ground_truth.json            # Regression test suite (40 leads)
└── validate_scoring.py          # Scoring validation script
```

## Scoring

Leads are scored 0-100 across five dimensions:

| Dimension | Points | What it measures |
|-----------|--------|-----------------|
| Persona fit | 0-40 | How closely the role matches QA/test decision-maker |
| Seniority | 0-20 | Decision-making authority |
| Software DNA | 0-30 | Evidence of software/IT context (vs. hardware/retail) |
| Buying signals | 0-20 | Active tool evaluation, hiring, transformation projects |
| Education | 0-4 | Technical education background |

**Tiers**: A (80-100) = direct buyer, B (60-79) = relevant, C (40-59) = ambiguous, D (0-39) = skip.

The `knowledge/` directory contains the full scoring methodology, calibration examples, and pattern library that improves over time through human feedback.

## Tech Stack

- **Backend**: Python 3.9, FastAPI, SQLite, httpx, Pydantic
- **Frontend**: React 19, Vite 7, Tailwind CSS v4
- **APIs**: Apify (lead search + LinkedIn enrichment), Apollo (alternative search), Gemini (AI scoring/filtering)
- **Orchestration**: Claude Code slash commands for CLI-driven workflows
