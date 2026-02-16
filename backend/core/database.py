"""SQLite persistence for pipeline runs and leads."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from backend.models.schemas import PipelineRun

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "runs.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    """Create tables if they don't exist."""
    conn = _connect()
    try:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS pipeline_runs (
                run_id       TEXT PRIMARY KEY,
                status       TEXT NOT NULL DEFAULT 'pending',
                created_at   TEXT NOT NULL,
                completed_at TEXT,
                request_json TEXT,
                cost_leads_finder        REAL DEFAULT 0.0,
                cost_linkedin_enrichment REAL DEFAULT 0.0,
                cost_total               REAL DEFAULT 0.0,
                leads_found              INTEGER DEFAULT 0,
                profiles_enriched        INTEGER DEFAULT 0,
                tier_a       INTEGER DEFAULT 0,
                tier_b       INTEGER DEFAULT 0,
                tier_c       INTEGER DEFAULT 0,
                tier_d       INTEGER DEFAULT 0,
                total_results INTEGER DEFAULT 0,
                error        TEXT,
                enrichment_diagnostics_json TEXT
            );

            CREATE TABLE IF NOT EXISTS leads (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id       TEXT NOT NULL REFERENCES pipeline_runs(run_id),
                first_name   TEXT DEFAULT '',
                last_name    TEXT DEFAULT '',
                headline     TEXT DEFAULT '',
                job_title    TEXT DEFAULT '',
                company      TEXT DEFAULT '',
                linkedin_url TEXT DEFAULT '',
                email        TEXT DEFAULT '',
                personal_email TEXT DEFAULT '',
                mobile_number TEXT DEFAULT '',
                seniority_level TEXT DEFAULT '',
                functional_level TEXT DEFAULT '',
                country      TEXT DEFAULT '',
                about        TEXT DEFAULT '',
                experience_json TEXT,
                education_json TEXT,
                skills_json  TEXT,
                languages_json TEXT,
                certifications_json TEXT,
                connections_count INTEGER DEFAULT 0,
                enriched     INTEGER DEFAULT 0,
                score        INTEGER DEFAULT 0,
                tier         TEXT DEFAULT '',
                category     TEXT DEFAULT '',
                persona_label TEXT DEFAULT '',
                reasoning    TEXT DEFAULT '',
                outreach_angle TEXT DEFAULT '',
                method       TEXT DEFAULT '',
                red_flags    TEXT DEFAULT '',
                special_flags TEXT DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_leads_run_id ON leads(run_id);
            CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
            CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);
        """)
        conn.commit()
    finally:
        conn.close()


def save_pipeline_run(run: PipelineRun) -> None:
    """Persist a pipeline run and all its leads to SQLite."""
    conn = _connect()
    try:
        # Compute tier counts
        tier_counts = {"A": 0, "B": 0, "C": 0, "D": 0}
        for lead in run.results:
            if lead.tier in tier_counts:
                tier_counts[lead.tier] += 1

        cost = run.cost
        conn.execute("""
            INSERT OR REPLACE INTO pipeline_runs
            (run_id, status, created_at, completed_at, request_json,
             cost_leads_finder, cost_linkedin_enrichment, cost_total,
             leads_found, profiles_enriched,
             tier_a, tier_b, tier_c, tier_d, total_results,
             error, enrichment_diagnostics_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run.run_id,
            run.status,
            run.created_at,
            datetime.utcnow().isoformat(),
            json.dumps(run.request.dict()) if run.request else None,
            cost.leads_finder if cost else 0.0,
            cost.linkedin_enrichment if cost else 0.0,
            cost.total if cost else 0.0,
            cost.leads_found if cost else 0,
            cost.profiles_enriched if cost else 0,
            tier_counts["A"],
            tier_counts["B"],
            tier_counts["C"],
            tier_counts["D"],
            len(run.results),
            run.error,
            json.dumps(run.enrichment_diagnostics) if run.enrichment_diagnostics else None,
        ))

        # Delete old leads for this run (in case of re-save)
        conn.execute("DELETE FROM leads WHERE run_id = ?", (run.run_id,))

        # Insert leads
        for lead in run.results:
            conn.execute("""
                INSERT INTO leads
                (run_id, first_name, last_name, headline, job_title, company,
                 linkedin_url, email, personal_email, mobile_number,
                 seniority_level, functional_level, country,
                 about, experience_json, education_json, skills_json,
                 languages_json, certifications_json, connections_count, enriched,
                 score, tier, category, persona_label, reasoning,
                 outreach_angle, method, red_flags, special_flags)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                run.run_id,
                lead.first_name,
                lead.last_name,
                lead.headline,
                lead.job_title,
                lead.company,
                lead.linkedin_url,
                lead.email,
                lead.personal_email,
                lead.mobile_number,
                lead.seniority_level,
                lead.functional_level,
                lead.country,
                lead.about,
                json.dumps(lead.experience) if lead.experience else None,
                json.dumps(lead.education) if lead.education else None,
                json.dumps(lead.skills) if lead.skills else None,
                json.dumps(lead.languages) if lead.languages else None,
                json.dumps(lead.certifications) if lead.certifications else None,
                lead.connections_count,
                1 if lead.enriched else 0,
                lead.score,
                lead.tier,
                lead.category,
                lead.persona_label,
                lead.reasoning,
                lead.outreach_angle,
                lead.method,
                lead.red_flags,
                lead.special_flags,
            ))

        conn.commit()
    finally:
        conn.close()


def get_all_runs_summary() -> List[Dict[str, Any]]:
    """Return lightweight list of all runs for the History page."""
    conn = _connect()
    try:
        rows = conn.execute("""
            SELECT run_id, status, created_at, completed_at, request_json,
                   cost_total, leads_found, profiles_enriched, total_results,
                   tier_a, tier_b, tier_c, tier_d, error
            FROM pipeline_runs
            ORDER BY created_at DESC
        """).fetchall()
        results = []
        for row in rows:
            request = json.loads(row["request_json"]) if row["request_json"] else {}
            results.append({
                "run_id": row["run_id"],
                "status": row["status"],
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
                "domains": request.get("company_domain", []),
                "cost_total": row["cost_total"],
                "leads_found": row["leads_found"],
                "total_results": row["total_results"],
                "tier_a": row["tier_a"],
                "tier_b": row["tier_b"],
                "tier_c": row["tier_c"],
                "tier_d": row["tier_d"],
                "error": row["error"],
            })
        return results
    finally:
        conn.close()


def get_run_with_leads(run_id: str) -> Optional[Dict[str, Any]]:
    """Return full run with all leads from SQLite."""
    conn = _connect()
    try:
        run_row = conn.execute(
            "SELECT * FROM pipeline_runs WHERE run_id = ?", (run_id,)
        ).fetchone()
        if not run_row:
            return None

        lead_rows = conn.execute(
            "SELECT * FROM leads WHERE run_id = ? ORDER BY score DESC", (run_id,)
        ).fetchall()

        leads = []
        for row in lead_rows:
            leads.append({
                "first_name": row["first_name"],
                "last_name": row["last_name"],
                "headline": row["headline"],
                "job_title": row["job_title"],
                "company": row["company"],
                "linkedin_url": row["linkedin_url"],
                "email": row["email"],
                "seniority_level": row["seniority_level"],
                "country": row["country"],
                "about": row["about"],
                "experience": json.loads(row["experience_json"]) if row["experience_json"] else [],
                "education": json.loads(row["education_json"]) if row["education_json"] else [],
                "skills": json.loads(row["skills_json"]) if row["skills_json"] else [],
                "enriched": bool(row["enriched"]),
                "score": row["score"],
                "tier": row["tier"],
                "category": row["category"],
                "persona_label": row["persona_label"],
                "reasoning": row["reasoning"],
                "outreach_angle": row["outreach_angle"],
                "method": row["method"],
                "red_flags": row["red_flags"],
            })

        request = json.loads(run_row["request_json"]) if run_row["request_json"] else {}
        return {
            "run_id": run_row["run_id"],
            "status": run_row["status"],
            "created_at": run_row["created_at"],
            "domains": request.get("company_domain", []),
            "cost_total": run_row["cost_total"],
            "total_results": run_row["total_results"],
            "tier_a": run_row["tier_a"],
            "tier_b": run_row["tier_b"],
            "tier_c": run_row["tier_c"],
            "tier_d": run_row["tier_d"],
            "results": leads,
        }
    finally:
        conn.close()


def get_dashboard_stats() -> Dict[str, Any]:
    """Aggregate metrics across all runs for the Dashboard page."""
    conn = _connect()
    try:
        # Totals
        totals = conn.execute("""
            SELECT
                COUNT(*) as total_runs,
                COALESCE(SUM(total_results), 0) as total_leads,
                COALESCE(SUM(cost_total), 0) as total_cost,
                COALESCE(SUM(cost_leads_finder), 0) as cost_leads_finder,
                COALESCE(SUM(cost_linkedin_enrichment), 0) as cost_linkedin_enrichment,
                COALESCE(SUM(tier_a), 0) as tier_a,
                COALESCE(SUM(tier_b), 0) as tier_b,
                COALESCE(SUM(tier_c), 0) as tier_c,
                COALESCE(SUM(tier_d), 0) as tier_d
            FROM pipeline_runs
            WHERE status = 'complete'
        """).fetchone()

        # Unique domains
        rows = conn.execute(
            "SELECT DISTINCT request_json FROM pipeline_runs WHERE request_json IS NOT NULL"
        ).fetchall()
        domains = set()
        for row in rows:
            req = json.loads(row["request_json"])
            for d in req.get("company_domain", []):
                domains.add(d)

        # Recent runs (last 10)
        recent = conn.execute("""
            SELECT run_id, status, created_at, request_json,
                   cost_total, total_results, tier_a, tier_b, tier_c, tier_d
            FROM pipeline_runs
            ORDER BY created_at DESC
            LIMIT 10
        """).fetchall()
        recent_runs = []
        for row in recent:
            req = json.loads(row["request_json"]) if row["request_json"] else {}
            recent_runs.append({
                "run_id": row["run_id"],
                "status": row["status"],
                "created_at": row["created_at"],
                "domains": req.get("company_domain", []),
                "cost_total": row["cost_total"],
                "total_results": row["total_results"],
                "tier_a": row["tier_a"],
                "tier_b": row["tier_b"],
                "tier_c": row["tier_c"],
                "tier_d": row["tier_d"],
            })

        # Top personas (by lead count)
        persona_rows = conn.execute("""
            SELECT persona_label, COUNT(*) as count, AVG(score) as avg_score
            FROM leads
            WHERE persona_label != ''
            GROUP BY persona_label
            ORDER BY count DESC
            LIMIT 10
        """).fetchall()
        persona_stats = [
            {"label": row["persona_label"], "count": row["count"], "avg_score": round(row["avg_score"], 1)}
            for row in persona_rows
        ]

        return {
            "total_runs": totals["total_runs"],
            "total_leads": totals["total_leads"],
            "total_cost": round(totals["total_cost"], 2),
            "cost_breakdown": {
                "leads_finder": round(totals["cost_leads_finder"], 2),
                "linkedin_enrichment": round(totals["cost_linkedin_enrichment"], 2),
            },
            "tier_breakdown": {
                "A": totals["tier_a"],
                "B": totals["tier_b"],
                "C": totals["tier_c"],
                "D": totals["tier_d"],
            },
            "unique_domains": sorted(domains),
            "recent_runs": recent_runs,
            "persona_stats": persona_stats,
        }
    finally:
        conn.close()
