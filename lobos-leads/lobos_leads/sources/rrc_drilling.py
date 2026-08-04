"""Texas RRC drilling-permit (Form W-1) source.

Why this matters for Lobos: every approved drilling permit means a
well that will need surface facilities within months -- tank battery,
flowlines, separation equipment, and often gathering/pipeline tie-ins.
The operator on a fresh W-1 in a Permian county is a warm prospect.

Data source: the RRC's public Drilling Permit (W-1) query.
    https://webapps.rrc.texas.gov/DP/initializePublicQueryAction.do
(There is also a newer mirror at webapps2.rrc.texas.gov/EWA/.)

The form's field names are discovered from the live page at run time
(see lobos_leads.http.parse_form), so minor site changes don't break
us. If the RRC redesigns the page entirely, run with --demo to keep
working from a downloaded CSV instead, and see the README's
troubleshooting section.
"""

import re
from datetime import date, timedelta
from urllib.parse import urljoin

from ..counties import PERMIAN_TX_COUNTIES
from ..http import PoliteSession, find_field, parse_form
from ..tables import extract_rows, pick

QUERY_URL = "https://webapps.rrc.texas.gov/DP/initializePublicQueryAction.do"
MAX_PAGES = 40


def fetch(days_back: int = 30, counties=None, verbose=True) -> list:
    """Return permit dicts: operator, county, district, date, purpose,
    lease, permit_no, signal ('drilling_permit')."""
    counties = counties or sorted(PERMIAN_TX_COUNTIES)
    since = date.today() - timedelta(days=days_back)
    session = PoliteSession()

    if verbose:
        print(f"[rrc-drilling] loading query form: {QUERY_URL}")
    resp = session.get(QUERY_URL)
    action, fields = parse_form(resp.text, form_hint="Query")

    date_from = (
        find_field(fields, "approved", "from")
        or find_field(fields, "approved", "start")
        or find_field(fields, "submitted", "from")
        or find_field(fields, "submit", "start")
    )
    date_to = (
        find_field(fields, "approved", "to")
        or find_field(fields, "approved", "end")
        or find_field(fields, "submitted", "to")
        or find_field(fields, "submit", "end")
    )
    # Prefer the county multi-select (countyNames) over the free-text
    # single-code box (countyCode) the form also carries.
    county_field = find_field(fields, "county", "names") or find_field(
        fields, "county"
    )
    if not (date_from and date_to and county_field):
        raise RuntimeError(
            "Could not locate the date/county fields on the RRC drilling "
            "permit query form. The site layout may have changed -- see "
            "the Troubleshooting section of the README."
        )

    # End the range at yesterday: the RRC server runs on Central time,
    # so "today" here (UTC) can be rejected as a future date.
    fields[date_from] = since.strftime("%m/%d/%Y")
    fields[date_to] = (date.today() - timedelta(days=1)).strftime("%m/%d/%Y")

    county_codes = [
        PERMIAN_TX_COUNTIES[c.upper()]["code"]
        for c in counties
        if c.upper() in PERMIAN_TX_COUNTIES
    ]
    # The county selector is a multi-select of county codes; requests
    # encodes a list value as repeated parameters, like a browser does.
    fields[county_field] = county_codes

    submit_url = urljoin(resp.url, action) if action else resp.url
    if verbose:
        print(
            f"[rrc-drilling] searching {len(county_codes)} Permian counties, "
            f"approved since {since:%m/%d/%Y}"
        )

    permits = []
    page = session.post(submit_url, data=fields)
    for page_no in range(1, MAX_PAGES + 1):
        rows = extract_rows(page.text, required_headers=["operator", "county"])
        for row in rows:
            operator = pick(row, "operator")
            county = pick(row, "county")
            if not operator or not county:
                continue
            # The "Status Date" column holds e.g.
            # "Approved 06/22/2026 Submitted 05/12/2026".
            status_date = pick(row, "status", "date")
            m = re.search(
                r"(?:Approved|Submitted)\s+(\d{2}/\d{2}/\d{4})", status_date
            )
            permits.append(
                {
                    "signal": "drilling_permit",
                    "state": "TX",
                    "operator": operator,
                    "county": county.upper(),
                    "district": pick(row, "dist"),
                    "date": m.group(1) if m else (
                        pick(row, "approved") or pick(row, "submitted")
                    ),
                    "purpose": pick(row, "purpose") or pick(row, "filing"),
                    "lease": pick(row, "lease"),
                    "permit_no": pick(row, "status", "#")
                    or pick(row, "permit"),
                }
            )
        next_url = _next_page_link(page.text, page.url)
        if not next_url:
            break
        if verbose:
            print(f"[rrc-drilling] page {page_no + 1} ...")
        page = session.get(next_url)

    if verbose:
        print(f"[rrc-drilling] found {len(permits)} permits")
    return permits


def _next_page_link(html: str, base_url: str):
    from ..http import make_soup

    soup = make_soup(html)
    for a in soup.find_all("a"):
        # The RRC pager renders the link as "[ Next > ]".
        text = a.get_text(strip=True).lower().strip("[] >")
        if text == "next" and a.get("href"):
            return urljoin(base_url, a["href"])
    return None
