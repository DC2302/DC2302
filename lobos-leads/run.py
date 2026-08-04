#!/usr/bin/env python3
"""Lobos Permian Basin lead finder.

Pulls recent drilling-permit and saltwater-disposal-permit activity in
the Permian Basin from public state records, then ranks the operators
into a call list for pitching facility construction services.

Quick start (see README.md for the full guide):

    pip install -r requirements.txt
    python run.py --demo          # see the output format with sample data
    python run.py                 # pull live data (takes a few minutes)
    python run.py --days 14 --counties MIDLAND MARTIN REEVES LOVING
"""

import argparse
import csv
import sys
from pathlib import Path

from lobos_leads.counties import PERMIAN_NM_COUNTIES, tx_county_names
from lobos_leads.leads import build_leads
from lobos_leads.report import (
    write_call_sheet,
    write_leads_csv,
    write_leads_xlsx,
    write_permits_csv,
)

HERE = Path(__file__).parent
DEMO_CSV = HERE / "sample_data" / "demo_permits.csv"


def load_demo() -> list:
    with DEMO_CSV.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find Permian Basin facility-construction leads "
        "from public permit data."
    )
    parser.add_argument(
        "--demo", action="store_true",
        help="use bundled sample data instead of hitting state websites "
        "(good for a first run, or when offline)",
    )
    parser.add_argument(
        "--days", type=int, default=30,
        help="how many days back to search drilling permits (default 30)",
    )
    parser.add_argument(
        "--swd-days", type=int, default=90,
        help="how many days back to search SWD permits (default 90; "
        "SWD applications are rarer, so look further back)",
    )
    parser.add_argument(
        "--counties", nargs="*", metavar="COUNTY",
        help="limit the Texas search to these counties "
        f"(default: all {len(tx_county_names())} Permian counties)",
    )
    parser.add_argument(
        "--skip", nargs="*", default=[],
        choices=["rrc-drilling", "rrc-swd", "nm-ocd", "rrc-pipeline",
                 "tdlr-datacenters"],
        help="skip a data source",
    )
    parser.add_argument(
        "--out", default=str(HERE / "output"),
        help="output folder (default: ./output)",
    )
    parser.add_argument(
        "--top", type=int, default=25,
        help="how many leads on the call sheet (default 25)",
    )
    parser.add_argument(
        "--email", action="store_true",
        help="after the run, email leads.xlsx + the call sheet to everyone "
        "listed in email_config.json (see README 'Email setup')",
    )
    args = parser.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    permits = []
    if args.demo:
        print("Running in DEMO mode with bundled sample data.\n")
        permits = load_demo()
    else:
        # Imported lazily so --demo works without network access.
        from lobos_leads.sources import (
            nm_ocd,
            rrc_drilling,
            rrc_pipeline,
            rrc_swd,
            tdlr_datacenters,
        )

        sources = [
            ("rrc-drilling", lambda: rrc_drilling.fetch(
                days_back=args.days, counties=args.counties)),
            ("rrc-swd", lambda: rrc_swd.fetch(
                days_back=args.swd_days, counties=args.counties)),
            ("rrc-pipeline", lambda: rrc_pipeline.fetch(
                days_back=args.swd_days, counties=args.counties)),
            ("nm-ocd", lambda: nm_ocd.fetch(
                days_back=args.days,
                counties=None if args.counties is None else [
                    c for c in args.counties
                    if c.upper() in PERMIAN_NM_COUNTIES
                ] or None)),
            ("tdlr-datacenters", lambda: tdlr_datacenters.fetch()),
        ]
        for name, fetcher in sources:
            if name in args.skip:
                print(f"[{name}] skipped")
                continue
            try:
                permits.extend(fetcher())
            except Exception as err:  # noqa: BLE001
                print(
                    f"[{name}] FAILED: {err}\n"
                    f"          Continuing with the other sources. See the "
                    f"README's Troubleshooting section.",
                    file=sys.stderr,
                )

    if not permits:
        print(
            "\nNo permit records were collected. Try --demo to check the "
            "pipeline, or see the README's Troubleshooting section.",
            file=sys.stderr,
        )
        return 1

    leads = build_leads(permits)

    leads_csv = out_dir / "leads.csv"
    leads_xlsx = out_dir / "leads.xlsx"
    permits_csv = out_dir / "permits_raw.csv"
    call_sheet = out_dir / "call_sheet.md"
    write_leads_csv(leads, leads_csv)
    write_permits_csv(permits, permits_csv)
    write_call_sheet(leads, call_sheet, top_n=args.top, demo=args.demo)
    try:
        write_leads_xlsx(leads, permits, leads_xlsx)
    except ImportError:
        print(
            "(Excel output skipped -- run 'pip install openpyxl' to get "
            "leads.xlsx too)",
            file=sys.stderr,
        )
        leads_xlsx = None

    print(f"\n{len(permits)} permit records -> {len(leads)} companies\n")
    print("Top 10 leads:")
    for i, lead in enumerate(leads[:10], 1):
        tag = "DC " if lead["category"] == "datacenter" else "O&G"
        print(
            f"  {i:2}. [{tag}] {lead['operator']:<36} score {lead['score']:>3}  "
            f"({lead['drilling_permits']} drill / {lead['swd_permits']} SWD / "
            f"{lead['pipeline_permits']} pipe / "
            f"{lead['datacenter_projects']} DC)  "
            f"{', '.join(lead['counties'][:3])}"
        )
    print("\nWrote:")
    if leads_xlsx:
        print(f"  {leads_xlsx}   (Excel -- also imports into Google Sheets)")
    print(
        f"  {leads_csv}   (same list as plain CSV)\n"
        f"  {call_sheet}   (who to call + talking points)\n"
        f"  {permits_csv}   (every raw permit record)"
    )

    if args.email:
        from lobos_leads.emailer import email_results

        try:
            recipients = email_results(HERE, out_dir, leads, demo=args.demo)
            print(f"\nEmailed results to: {', '.join(recipients)}")
        except Exception as err:  # noqa: BLE001
            print(
                f"\nEMAIL FAILED: {err}\n"
                "The lead files above were still written -- only the "
                "emailing step failed. See README 'Email setup'.",
                file=sys.stderr,
            )
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
