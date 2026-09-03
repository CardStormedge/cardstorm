#!/usr/bin/env python3
"""
2025 Donruss staging validator.

Reads data/football/2025/_staging/donruss-source1-normalized.json (and, if present,
data/checklists/football/2025/donruss-source2-reconciliation.csv) and reports the metrics
requested for staging review. Safe to run at any time, including now, while both inputs are
still empty - it will just report zeros rather than erroring.

Usage:
    python3 data/checklists/football/2025/validate_donruss_staging.py
    python3 data/checklists/football/2025/validate_donruss_staging.py --featured-rookies
"""
import json
import csv
import sys
import os
import argparse
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
NORMALIZED_PATH = os.path.join(REPO_ROOT, "data/football/2025/_staging/donruss-source1-normalized.json")
RECONCILIATION_PATH = os.path.join(HERE, "donruss-source2-reconciliation.csv")

FEATURED_ROOKIES = [
    "Cam Ward", "Travis Hunter", "Ashton Jeanty", "Tetairoa McMillan",
    "Emeka Egbuka", "Jaxson Dart", "Matthew Golden",
]


def load_normalized():
    with open(NORMALIZED_PATH) as f:
        data = json.load(f)
    return data.get("records", [])


def load_reconciliation():
    if not os.path.exists(RECONCILIATION_PATH):
        return []
    with open(RECONCILIATION_PATH, newline="") as f:
        return list(csv.DictReader(f))


def report_summary(records, recon_rows):
    print("=== 2025 Donruss staging summary ===")
    print(f"normalized rows: {len(records)}")

    identity_counts = Counter(r.get("identityKey") for r in records)
    duplicates = {k: c for k, c in identity_counts.items() if c > 1}
    print(f"unique card identities: {len(identity_counts)}")
    print(f"duplicate identities: {len(duplicates)}")
    if duplicates:
        for k, c in duplicates.items():
            print(f"  DUPLICATE: {k} appears {c} times")

    rookie_rows = [r for r in records if r.get("rookie") is True]
    print(f"rookie rows: {len(rookie_rows)}")

    missing_player = [r for r in records if not r.get("player")]
    missing_team = [r for r in records if not r.get("team")]
    missing_card_number = [r for r in records if r.get("cardNumber") in (None, "")]
    print(f"missing player: {len(missing_player)}")
    print(f"missing team: {len(missing_team)}")
    print(f"missing card number: {len(missing_card_number)}")

    status_counts = Counter(r.get("verificationStatus", "NOT_READY") for r in records)
    print("source1/verificationStatus counts:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")

    print(f"\nreconciliation rows: {len(recon_rows)}")
    if recon_rows:
        recon_status_counts = Counter(r.get("status", "") for r in recon_rows)
        print("reconciliation status counts:")
        for status, count in sorted(recon_status_counts.items()):
            print(f"  {status}: {count}")
        independence_flags = [r for r in recon_rows if r.get("status") == "INDEPENDENCE_UNCONFIRMED"]
        print(f"independence-unconfirmed rows: {len(independence_flags)}")

    if not records:
        print("\nNo normalized records yet - this is expected until a real source1 file is supplied.")
        print("See data/football/2025/_staging/donruss-source1-raw.md for the accepted input formats.")


def report_featured_rookies(records):
    print("=== Featured rookie coverage (2025 Donruss) ===")
    print("player | team | records found | card numbers | rookie designation | source1 status | source2 status | final verificationStatus")
    for name in FEATURED_ROOKIES:
        matches = [r for r in records if r.get("player") == name]
        if not matches:
            print(f"{name} | - | 0 | - | - | NOT_READY | NOT_READY | NOT_READY")
            continue
        for r in matches:
            print(
                f"{r.get('player')} | {r.get('team','-')} | {len(matches)} | "
                f"{r.get('cardNumber','-')} | {r.get('rookie', False)} | "
                f"{r.get('source1','-')} | {r.get('source2','-')} | "
                f"{r.get('verificationStatus','NOT_READY')}"
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--featured-rookies", action="store_true")
    args = parser.parse_args()

    records = load_normalized()
    recon_rows = load_reconciliation()

    if args.featured_rookies:
        report_featured_rookies(records)
    else:
        report_summary(records, recon_rows)


if __name__ == "__main__":
    sys.exit(main())
