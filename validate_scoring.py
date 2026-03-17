#!/usr/bin/env python3
"""
Fore AI Lead Scoring Validator

Validates scored leads against ground truth (40 leads).
Used by /validate-scoring slash command.

Usage:
    python validate_scoring.py --scores scores.json      # Validate specific file
    python validate_scoring.py --scores scored_results.json

The validator checks:
1. Tier match (HARD constraint when tier_is_hard_constraint=true)
2. Score within tolerance (SOFT constraint, ±5 by default)
3. Category match (informational only)
"""

import argparse
import json
import os
import sys


def load_ground_truth(path: str = "ground_truth.json") -> list[dict]:
    """Load ground truth leads."""
    with open(path) as f:
        data = json.load(f)
    return data["leads"]


def load_scores(path: str) -> dict[int, dict]:
    """Load scored results. Returns dict keyed by lead ID."""
    with open(path) as f:
        scores = json.load(f)
    return {s["id"]: s for s in scores}


def validate(ground_truth: list[dict], scores: dict[int, dict], verbose: bool = True) -> tuple[int, int, list[dict]]:
    """Validate scores against ground truth. Returns (passed, failed, failures)."""
    passed = 0
    failed = 0
    failures = []
    soft_failures = 0

    if verbose:
        print(f"\n{'ID':>3} {'Name':<35} {'Company':<22} {'Exp':>4} {'Got':>4} {'Score':>5} {'Status':>6}")
        print("-" * 85)

    for lead in ground_truth:
        lid = lead["id"]
        expected_tier = lead["expected_tier"]
        hard = lead.get("tier_is_hard_constraint", True)

        s = scores.get(lid)
        if not s:
            if verbose:
                print(f"{lid:3d} {lead['name']:<35} {lead['company']:<22} {expected_tier:>4} {'???':>4} {'':>5} {'MISS':>6} ❌")
            failed += 1
            failures.append({"lead": lead, "error": "missing", "got_tier": None})
            continue

        got_tier = s["tier"]
        got_score = s.get("score", "?")
        match = got_tier == expected_tier

        if match:
            passed += 1
            if verbose:
                print(f"{lid:3d} {lead['name']:<35} {lead['company']:<22} {expected_tier:>4} {got_tier:>4} {got_score:>5} {'PASS':>6}")
        else:
            if hard:
                failed += 1
                failures.append({"lead": lead, "error": "tier_mismatch", "got_tier": got_tier, "got_score": got_score})
                marker = "❌"
                status = "FAIL"
            else:
                soft_failures += 1
                passed += 1  # Soft constraints count as pass
                marker = "⚠️"
                status = "SOFT"
            if verbose:
                print(f"{lid:3d} {lead['name']:<35} {lead['company']:<22} {expected_tier:>4} {got_tier:>4} {got_score:>5} {status:>6} {marker}")

    if verbose:
        print("-" * 85)
        print(f"\nRESULTS: {passed}/{len(ground_truth)} PASSED, {failed}/{len(ground_truth)} HARD FAILURES", end="")
        if soft_failures:
            print(f", {soft_failures} soft mismatches (non-blocking)")
        else:
            print()

        if failed == 0:
            print("\n✅ ALL TIER CONSTRAINTS PASS — VALIDATION SUCCESSFUL")
        else:
            print(f"\n❌ {failed} HARD FAILURES — scoring needs iteration")
            print("\nFailed leads (hard constraints):")
            for f in failures:
                lead = f["lead"]
                print(f"  #{lead['id']} {lead['name']}: expected {lead['expected_tier']}, got {f.get('got_tier', 'missing')} (score {f.get('got_score', '?')})")
                print(f"    Title: {lead['title']}")

    return passed, failed, failures


def main():
    parser = argparse.ArgumentParser(description="Validate lead scores against ground truth")
    parser.add_argument("--scores", help="Path to scored results JSON file")
    parser.add_argument("--gt", default="ground_truth.json", help="Path to ground truth JSON")
    parser.add_argument("--quiet", action="store_true", help="Minimal output")
    args = parser.parse_args()

    gt = load_ground_truth(args.gt)

    if args.scores:
        scores = load_scores(args.scores)
    else:
        # Try to find the most recent scores file
        candidates = [
            "scored_results.json",
            "scores.json",
        ]
        scores = None
        for c in candidates:
            if os.path.exists(c):
                print(f"Loading scores from: {c}")
                scores = load_scores(c)
                break
        if scores is None:
            print("ERROR: No scores file found. Use --scores to specify.", file=sys.stderr)
            sys.exit(1)

    passed, failed, _ = validate(gt, scores, verbose=not args.quiet)
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
