#!/usr/bin/env python3
"""
2025 Donruss Base Rated Rookie evidence + strict-production-gate validator.

Reads data/football/2025/_staging/donruss-base-rated-rookie-evidence.json (the live
provenance-aware evidence table) and reports, programmatically (never hand-counted):
  - total records / source-count-based verificationStatus distribution
  - source-quality-tier distribution (_evidenceQualityStatus)
  - strict-production-gate pass/fail counts and the exact record lists
  - marketplace-only / marketplace-corroborated counts
  - records carrying a documented conflict/history (e.g. #345)
  - featured-seven gate table

This is the audit source of truth: the Markdown report's counts must be generated from this
script's output, not hand-edited, so counts cannot silently drift from the underlying data again.

Usage:
    python3 data/checklists/football/2025/validate_donruss_evidence.py
    python3 data/checklists/football/2025/validate_donruss_evidence.py --featured-seven
    python3 data/checklists/football/2025/validate_donruss_evidence.py --json
"""
import json
import os
import sys
import argparse
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
EVIDENCE_PATH = os.path.join(
    REPO_ROOT, "data/football/2025/_staging/donruss-base-rated-rookie-evidence.json"
)

FEATURED_SEVEN = [
    ("Travis Hunter", 301),
    ("Ashton Jeanty", 305),
    ("Matthew Golden", 311),
    ("Tetairoa McMillan", 314),
    ("Cam Ward", 350),
    ("Emeka Egbuka", 375),
    ("Jaxson Dart", 400),
]

QUALITY_ORDER = [
    "CHECKLIST_CROSS_VERIFIED",
    "CHECKLIST_PLUS_DATABASE",
    "DATABASE_CROSS_VERIFIED",
    "MARKETPLACE_CORROBORATED",
    "SINGLE_STRONG_SOURCE",
    "SINGLE_MARKETPLACE_SOURCE",
    "REVIEW_REQUIRED",
]


def load_records():
    with open(EVIDENCE_PATH) as f:
        data = json.load(f)
    return data["records"]


def build_report(records):
    total = len(records)

    verification_counts = Counter(r.get("verificationStatus") for r in records)
    quality_counts = Counter(r.get("_evidenceQualityStatus") for r in records)

    gate_pass = [r for r in records if r.get("_passesStrictProductionGate") is True]
    gate_fail = [r for r in records if r.get("_passesStrictProductionGate") is False]

    two_plus_source = [r for r in records if (r.get("sourceCount") or 0) >= 2]

    marketplace_only = [
        r for r in records
        if r.get("_evidenceQualityStatus") in ("SINGLE_MARKETPLACE_SOURCE", "MARKETPLACE_CORROBORATED")
    ]

    # "uses marketplace evidence" = has a non-null marketplaceSearch or amazon field,
    # regardless of whether other, stronger evidence is also present on the same record.
    uses_marketplace_evidence = [
        r for r in records if r.get("marketplaceSearch") is not None or r.get("amazon") is not None
    ]

    conflicts_or_history = [
        r for r in records
        if r.get("freshDCards") is not None or r.get("beckettAutographParallel") is not None
        or "conflict" in (r.get("notes") or "").lower() or "outlier" in (r.get("notes") or "").lower()
    ]

    return {
        "total": total,
        "verification_counts": dict(verification_counts),
        "quality_counts": {k: quality_counts.get(k, 0) for k in QUALITY_ORDER},
        "gate_pass_count": len(gate_pass),
        "gate_fail_count": len(gate_fail),
        "gate_pass_cards": sorted(r["cardNumber"] for r in gate_pass),
        "gate_fail_cards": sorted(r["cardNumber"] for r in gate_fail),
        "two_plus_source_count": len(two_plus_source),
        "marketplace_only_count": len(marketplace_only),
        "uses_marketplace_evidence_count": len(uses_marketplace_evidence),
        "conflicts_or_history_count": len(conflicts_or_history),
        "conflicts_or_history_cards": sorted(r["cardNumber"] for r in conflicts_or_history),
    }


def report_summary(records):
    rep = build_report(records)
    print("=== 2025 Donruss Base Rated Rookie evidence + strict-gate audit ===")
    print(f"total records: {rep['total']}")
    print()
    print("verificationStatus (source-count tier):")
    for status, count in sorted(rep["verification_counts"].items()):
        print(f"  {status}: {count}")
    print()
    print("_evidenceQualityStatus (source-quality tier, strongest to weakest):")
    for status in QUALITY_ORDER:
        print(f"  {status}: {rep['quality_counts'][status]}")
    print()
    print(f"2+ source records (sourceCount >= 2): {rep['two_plus_source_count']}")
    print(f"strict-production-gate PASS: {rep['gate_pass_count']}")
    print(f"strict-production-gate FAIL: {rep['gate_fail_count']}")
    print(f"marketplace-only records (SINGLE_MARKETPLACE_SOURCE + MARKETPLACE_CORROBORATED): {rep['marketplace_only_count']}")
    print(f"records using any marketplace evidence (marketplaceSearch or amazon present): {rep['uses_marketplace_evidence_count']}")
    print(f"records with documented conflict/outlier/parallel history: {rep['conflicts_or_history_count']} -> {rep['conflicts_or_history_cards']}")
    print()
    print(f"gate PASS card numbers: {rep['gate_pass_cards']}")
    print(f"gate FAIL card numbers: {rep['gate_fail_cards']}")


def report_featured_seven(records):
    by_number = {r["cardNumber"]: r for r in records}
    print("=== Featured seven — strict production gate ===")
    print("player | card# | team | tierA | tierB | tierC | verificationStatus | evidenceQualityStatus | STRICT GATE")
    for name, num in FEATURED_SEVEN:
        r = by_number.get(num)
        if not r or r.get("player") != name:
            print(f"{name} | #{num} | NOT FOUND / MISMATCH")
            continue
        st = r.get("_sourceTiers", {})
        gate = "PASS" if r.get("_passesStrictProductionGate") else "FAIL"
        print(
            f"{r['player']} | #{r['cardNumber']} | {r['team']} | "
            f"{st.get('tierA')} | {st.get('tierB')} | {st.get('tierC')} | "
            f"{r['verificationStatus']} | {r['_evidenceQualityStatus']} | {gate}"
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--featured-seven", action="store_true")
    parser.add_argument("--json", action="store_true", help="print the full report as JSON")
    args = parser.parse_args()

    records = load_records()

    if args.featured_seven:
        report_featured_seven(records)
    elif args.json:
        print(json.dumps(build_report(records), indent=1))
    else:
        report_summary(records)


if __name__ == "__main__":
    sys.exit(main())
