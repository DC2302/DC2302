"""New Mexico OCD (Oil Conservation Division) permit source -- the
Delaware Basin side of the Permian (Lea & Eddy counties).

Why this matters for Lobos: Lea and Eddy are two of the busiest
oil-and-gas counties in the country. An approved C-101 (Application
for Permit to Drill) means surface facilities are coming.

Data source: the OCD's Weekly Activity Reports,
    https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Reporting/Activity/WeeklyActivity.aspx

(The old Data/Permits.aspx query page was removed in an EMNRD site
reorganization.) Each weekly "Well Activity" report opens with an
INTENTIONS TO DRILL section -- operator, well name, county, and APD
date -- which is exactly the C-101 signal we want. The report itself
is plain HTML at WeeklyActivityReport.aspx?StartDate=<week-ending>,
and the listing page carries the available week-ending dates. If the
pages defeat automation, the tool prints the URL so the reports can
be read manually, and the rest of the pipeline still runs on the
Texas data.
"""

import math
import re

from ..counties import PERMIAN_NM_COUNTIES
from ..http import PoliteSession, make_soup
from ..tables import extract_rows, pick

WEEKLY_URL = (
    "https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/"
    "Reporting/Activity/WeeklyActivity.aspx"
)
REPORT_URL = (
    "https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/"
    "Reporting/Activity/WeeklyActivityReport.aspx"
)
MAX_WEEKS = 12


def fetch(days_back: int = 30, counties=None, verbose=True) -> list:
    counties = [c.upper() for c in (counties or PERMIAN_NM_COUNTIES)]
    session = PoliteSession()
    weeks = min(max(1, math.ceil(days_back / 7)), MAX_WEEKS)

    if verbose:
        print(f"[nm-ocd] listing weekly activity reports: {WEEKLY_URL}")
    listing = session.get(WEEKLY_URL)
    dates = _report_dates(listing.text)[:weeks]
    if not dates:
        print(
            "[nm-ocd] WARNING: no weekly reports found on the listing "
            f"page. Read them manually in a browser: {WEEKLY_URL}"
        )
        return []

    permits = []
    for when in dates:
        if verbose:
            print(f"[nm-ocd] reading week ending {when}")
        try:
            permits.extend(_fetch_week(session, when, counties))
        except Exception as err:  # noqa: BLE001 - keep pipeline alive
            print(
                f"[nm-ocd] WARNING: week {when} failed ({err}). Read it "
                f"manually: {REPORT_URL}?StartDate={when} (INTENTIONS TO "
                f"DRILL section, counties {', '.join(counties)})."
            )

    if verbose:
        print(f"[nm-ocd] found {len(permits)} permits")
    return permits


def _report_dates(html: str) -> list:
    """Week-ending dates of the available Well Activity reports,
    newest first, as they appear in the listing page's link
    attributes (e.g. '7/12/2026')."""
    soup = make_soup(html)
    dates = []
    for a in soup.find_all("a"):
        if "hplWellActivity" in (a.get("id") or "") and a.get("date"):
            if re.match(r"\d{1,2}/\d{1,2}/\d{4}$", a["date"]):
                dates.append(a["date"])
    return dates


def _fetch_week(session: PoliteSession, week_ending: str, counties) -> list:
    page = session.get(REPORT_URL, params={"StartDate": week_ending})

    results = []
    # The first operator/county table on the report is the
    # INTENTIONS TO DRILL section (APDs); later sections (deepenings,
    # cancelled APDs, plugged wells) are separate tables.
    for row in extract_rows(page.text, required_headers=["operator", "county"]):
        operator = pick(row, "operator")
        county = pick(row, "county").upper()
        api = pick(row, "api")
        if not operator or county not in counties or not api:
            continue
        results.append(
            {
                "signal": "drilling_permit",
                "state": "NM",
                "operator": operator,
                "county": county,
                "district": "NM-OCD",
                "date": pick(row, "apd", "date") or pick(row, "date"),
                "purpose": "APD / intention to drill (C-101)",
                "lease": pick(row, "well", "name") or pick(row, "name"),
                "permit_no": api,
            }
        )
    return results
