"""Write the outputs: leads.csv (for a spreadsheet) and
call_sheet.md (a readable who-to-call list with talking points)."""

import csv
from datetime import date
from pathlib import Path

CONTACT_HELP = """\
## How to get a phone number for these companies

1. **Texas operators:** look the company up in the RRC's organization
   (P-5) query -- it lists the registered address and phone number for
   every active operator in Texas:
   https://webapps2.rrc.texas.gov/EWA/organizationQueryAction.do
2. **New Mexico operators:** search the OGRID in OCD's operator lookup:
   https://wwwapps.emnrd.nm.gov/ocd/ocdpermitting/Data/Operators.aspx
3. LinkedIn: search the company name plus "facilities engineer",
   "construction superintendent", or "completions/production
   superintendent" -- those are the people who hire facility
   constructors like Lobos.
4. Ask for: the **facilities engineering** or **construction** group,
   not the drilling department.
"""


def write_leads_csv(leads: list, path: Path):
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "rank", "operator", "score", "drilling_permits",
                "swd_permits", "counties", "states", "latest_activity",
                "pitch",
            ]
        )
        for i, lead in enumerate(leads, 1):
            writer.writerow(
                [
                    i,
                    lead["operator"],
                    lead["score"],
                    lead["drilling_permits"],
                    lead["swd_permits"],
                    "; ".join(lead["counties"]),
                    "; ".join(lead["states"]),
                    lead["latest_activity"],
                    lead["pitch"],
                ]
            )


def write_permits_csv(permits: list, path: Path):
    if not permits:
        return
    cols = ["signal", "state", "operator", "county", "district",
            "date", "purpose", "lease", "permit_no"]
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(permits)


def write_call_sheet(leads: list, path: Path, top_n: int = 25,
                     demo: bool = False):
    lines = [
        f"# Lobos lead call sheet -- {date.today():%B %d, %Y}",
        "",
    ]
    if demo:
        lines += [
            "> **DEMO DATA** -- this sheet was generated from bundled",
            "> sample data so you can see the format. Run without",
            "> `--demo` to pull live permit data.",
            "",
        ]
    lines += [
        f"Top {min(top_n, len(leads))} of {len(leads)} companies with "
        "recent Permian Basin permit activity, ranked by how much "
        "facility-construction work their permits imply.",
        "",
    ]
    for i, lead in enumerate(leads[:top_n], 1):
        lines += [
            f"## {i}. {lead['operator']}  (score {lead['score']})",
            "",
            f"- **Activity:** {lead['drilling_permits']} drilling "
            f"permit(s), {lead['swd_permits']} SWD permit(s)",
            f"- **Where:** {', '.join(lead['counties'])} "
            f"({'/'.join(lead['states'])})",
            f"- **Most recent:** {lead['latest_activity'] or 'n/a'}",
            f"- **Talking point:** {lead['pitch']}",
            "",
        ]
    lines += [CONTACT_HELP]
    path.write_text("\n".join(lines), encoding="utf-8")
