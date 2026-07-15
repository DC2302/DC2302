"""Write the outputs: leads.xlsx (Excel / Google Sheets), leads.csv,
and call_sheet.md (a readable who-to-call list with talking points)."""

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


LEAD_COLUMNS = [
    ("Rank", 6), ("Company", 38), ("Score", 7),
    ("Drilling permits", 15), ("SWD permits", 12),
    ("Counties", 28), ("States", 8), ("Latest activity", 14),
    ("What to pitch", 90),
    ("Phone", 16), ("Contact name", 22), ("Call notes / status", 40),
]


def write_leads_xlsx(leads: list, permits: list, path: Path):
    """Excel workbook: a formatted 'Leads' tab (with empty phone/notes
    columns to fill in as you call) plus a 'Raw permits' tab.
    Opens directly in Excel and imports cleanly into Google Sheets."""
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    wb = Workbook()
    ws = wb.active
    ws.title = "Leads"

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="1F4E79")
    for col, (title, width) in enumerate(LEAD_COLUMNS, 1):
        cell = ws.cell(row=1, column=col, value=title)
        cell.font = header_font
        cell.fill = header_fill
        ws.column_dimensions[get_column_letter(col)].width = width

    swd_fill = PatternFill("solid", fgColor="FFF2CC")  # highlight SWD leads
    for i, lead in enumerate(leads, 2):
        row = [
            i - 1,
            lead["operator"],
            lead["score"],
            lead["drilling_permits"],
            lead["swd_permits"],
            ", ".join(lead["counties"]),
            "/".join(lead["states"]),
            lead["latest_activity"],
            lead["pitch"],
            "", "", "",  # phone / contact / notes -- fill in while calling
        ]
        for col, value in enumerate(row, 1):
            cell = ws.cell(row=i, column=col, value=value)
            cell.alignment = Alignment(vertical="top", wrap_text=(col == 9))
        if lead["swd_permits"]:
            for col in range(1, len(row) + 1):
                ws.cell(row=i, column=col).fill = swd_fill
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(LEAD_COLUMNS))}{len(leads) + 1}"

    raw = wb.create_sheet("Raw permits")
    raw_cols = ["signal", "state", "operator", "county", "district",
                "date", "purpose", "lease", "permit_no"]
    for col, title in enumerate(raw_cols, 1):
        cell = raw.cell(row=1, column=col, value=title.replace("_", " ").title())
        cell.font = header_font
        cell.fill = header_fill
        raw.column_dimensions[get_column_letter(col)].width = 22
    for r, permit in enumerate(permits, 2):
        for col, key in enumerate(raw_cols, 1):
            raw.cell(row=r, column=col, value=permit.get(key, ""))
    raw.freeze_panes = "A2"

    wb.save(path)


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
