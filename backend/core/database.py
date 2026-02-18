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
                cost_scoring             REAL DEFAULT 0.0,
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
                special_flags TEXT DEFAULT '',
                ai_input     TEXT DEFAULT '',
                ai_output    TEXT DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_leads_run_id ON leads(run_id);
            CREATE INDEX IF NOT EXISTS idx_leads_tier ON leads(tier);
            CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company);

            CREATE TABLE IF NOT EXISTS accounts (
                domain   TEXT PRIMARY KEY,
                vertical TEXT
            );
        """)
        # Migration: add columns if missing (for existing DBs)
        for col, col_type in [("ai_input", "TEXT DEFAULT ''"), ("ai_output", "TEXT DEFAULT ''")]:
            try:
                conn.execute(f"ALTER TABLE leads ADD COLUMN {col} {col_type}")
            except Exception:
                pass  # Column already exists
        # Migration: add cost_scoring column to pipeline_runs
        try:
            conn.execute("ALTER TABLE pipeline_runs ADD COLUMN cost_scoring REAL DEFAULT 0.0")
        except Exception:
            pass  # Column already exists
        conn.commit()
    finally:
        conn.close()


def upsert_account_vertical(domain: str, vertical: Optional[str]) -> None:
    """Insert or update the vertical for a domain in the accounts table."""
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO accounts (domain, vertical) VALUES (?, ?) "
            "ON CONFLICT(domain) DO UPDATE SET vertical = excluded.vertical",
            (domain.lower().strip(), vertical),
        )
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
             cost_leads_finder, cost_linkedin_enrichment, cost_scoring, cost_total,
             leads_found, profiles_enriched,
             tier_a, tier_b, tier_c, tier_d, total_results,
             error, enrichment_diagnostics_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            run.run_id,
            run.status,
            run.created_at,
            datetime.utcnow().isoformat(),
            json.dumps(run.request.dict()) if run.request else None,
            cost.leads_finder if cost else 0.0,
            cost.linkedin_enrichment if cost else 0.0,
            cost.scoring if cost else 0.0,
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
                 method, red_flags, special_flags, ai_input, ai_output)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                lead.method,
                lead.red_flags,
                lead.special_flags,
                lead.ai_input,
                lead.ai_output,
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
                "method": row["method"],
                "red_flags": row["red_flags"],
                "ai_input": row["ai_input"] if "ai_input" in row.keys() else "",
                "ai_output": row["ai_output"] if "ai_output" in row.keys() else "",
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
                COALESCE(SUM(cost_scoring), 0) as cost_scoring,
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
                "scoring": round(totals["cost_scoring"], 2),
            },
            "tier_breakdown": {
                "A": totals["tier_a"],
                "B": totals["tier_b"],
                "C": totals["tier_c"],
                "D": totals["tier_d"],
            },
            "unique_domains": sorted(domains),
            "unique_domains_count": len(domains),
            "recent_runs": recent_runs,
            "persona_stats": persona_stats,
        }
    finally:
        conn.close()


def get_all_accounts() -> List[Dict[str, Any]]:
    """Return all unique domains with aggregated lead stats."""
    conn = _connect()
    try:
        # Get all runs with their request_json to extract domains
        run_rows = conn.execute("""
            SELECT run_id, request_json, created_at
            FROM pipeline_runs
            WHERE request_json IS NOT NULL
            ORDER BY created_at DESC
        """).fetchall()

        # Build domain -> stats mapping
        domain_stats = {}  # type: Dict[str, Dict[str, Any]]
        for row in run_rows:
            req = json.loads(row["request_json"])
            domains = req.get("company_domain", [])
            for domain in domains:
                domain_lower = domain.lower().strip()
                if domain_lower not in domain_stats:
                    domain_stats[domain_lower] = {
                        "domain": domain_lower,
                        "total_leads": 0,
                        "total_runs": 0,
                        "tier_a": 0,
                        "tier_b": 0,
                        "tier_c": 0,
                        "tier_d": 0,
                        "last_run_date": None,
                        "run_ids": [],
                    }
                stats = domain_stats[domain_lower]
                stats["total_runs"] += 1
                stats["run_ids"].append(row["run_id"])
                if stats["last_run_date"] is None or row["created_at"] > stats["last_run_date"]:
                    stats["last_run_date"] = row["created_at"]

        # Count actual leads per domain from the leads table
        for domain, stats in domain_stats.items():
            if not stats["run_ids"]:
                continue
            placeholders = ",".join("?" * len(stats["run_ids"]))
            lead_counts = conn.execute(f"""
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN tier = 'A' THEN 1 ELSE 0 END) as tier_a,
                    SUM(CASE WHEN tier = 'B' THEN 1 ELSE 0 END) as tier_b,
                    SUM(CASE WHEN tier = 'C' THEN 1 ELSE 0 END) as tier_c,
                    SUM(CASE WHEN tier = 'D' THEN 1 ELSE 0 END) as tier_d
                FROM leads
                WHERE run_id IN ({placeholders})
            """, stats["run_ids"]).fetchone()
            stats["total_leads"] = lead_counts["total"] or 0
            stats["tier_a"] = lead_counts["tier_a"] or 0
            stats["tier_b"] = lead_counts["tier_b"] or 0
            stats["tier_c"] = lead_counts["tier_c"] or 0
            stats["tier_d"] = lead_counts["tier_d"] or 0

        # Merge verticals from accounts table
        acct_rows = conn.execute("SELECT domain, vertical FROM accounts").fetchall()
        vertical_map = {row["domain"]: row["vertical"] for row in acct_rows}
        for stats in domain_stats.values():
            stats["vertical"] = vertical_map.get(stats["domain"])

        # Remove internal run_ids from output and return sorted by domain
        results = []
        for stats in domain_stats.values():
            out = {k: v for k, v in stats.items() if k != "run_ids"}
            results.append(out)
        results.sort(key=lambda x: x["domain"])
        return results
    finally:
        conn.close()


def get_leads_by_domain(
    domain: str,
    tier: Optional[str] = None,
    min_score: Optional[int] = None,
    max_score: Optional[int] = None,
    enriched: Optional[bool] = None,
) -> List[Dict[str, Any]]:
    """Return leads for a specific domain with optional filters."""
    conn = _connect()
    try:
        # Find all run_ids that included this domain
        run_rows = conn.execute(
            "SELECT run_id, request_json FROM pipeline_runs WHERE request_json IS NOT NULL"
        ).fetchall()
        run_ids = []
        for row in run_rows:
            req = json.loads(row["request_json"])
            domains = [d.lower().strip() for d in req.get("company_domain", [])]
            if domain.lower().strip() in domains:
                run_ids.append(row["run_id"])

        if not run_ids:
            return []

        # Build filtered query
        placeholders = ",".join("?" * len(run_ids))
        query = f"SELECT * FROM leads WHERE run_id IN ({placeholders})"
        params = list(run_ids)  # type: List[Any]

        if tier:
            query += " AND tier = ?"
            params.append(tier.upper())
        if min_score is not None:
            query += " AND score >= ?"
            params.append(min_score)
        if max_score is not None:
            query += " AND score <= ?"
            params.append(max_score)
        if enriched is not None:
            query += " AND enriched = ?"
            params.append(1 if enriched else 0)

        query += " ORDER BY score DESC"

        lead_rows = conn.execute(query, params).fetchall()
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
                "score": row["score"],
                "tier": row["tier"],
                "category": row["category"],
                "persona_label": row["persona_label"],
                "reasoning": row["reasoning"],
                "enriched": bool(row["enriched"]),
                "run_id": row["run_id"],
                "seniority_level": row["seniority_level"],
                "country": row["country"],
                "about": row["about"],
                "experience": json.loads(row["experience_json"]) if row["experience_json"] else [],
                "education": json.loads(row["education_json"]) if row["education_json"] else [],
                "skills": json.loads(row["skills_json"]) if row["skills_json"] else [],
                "method": row["method"],
                "red_flags": row["red_flags"],
                "outreach_angle": row["outreach_angle"] if "outreach_angle" in row.keys() else "",
            })
        return leads
    finally:
        conn.close()
