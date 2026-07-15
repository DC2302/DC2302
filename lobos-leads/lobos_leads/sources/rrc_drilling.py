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

    date_from = find_field(fields, "approved", "from") or find_field(
        fields, "submitted", "from"
    )
    date_to = find_field(fields, "approved", "to") or find_field(
        fields, "submitted", "to"
    )
    county_field = find_field(fields, "county")
    if not (date_from and date_to and county_field):
        raise RuntimeError(
            "Could not locate the date/county fields on the RRC drilling "
            "permit query form. The site layout may have changed -- see "
            "the Troubleshooting section of the README."
        )

    fields[date_from] = since.strftime("%m/%d/%Y")
    fields[date_to] = date.today().strftime("%m/%d/%Y")

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
            permits.append(
                {
                    "signal": "drilling_permit",
                    "state": "TX",
                    "operator": operator,
                    "county": county.upper(),
                    "district": pick(row, "dist"),
                    "date": pick(row, "approved") or pick(row, "submitted"),
                    "purpose": pick(row, "purpose") or pick(row, "filing"),
                    "lease": pick(row, "lease"),
                    "permit_no": pick(row, "status") or pick(row, "permit"),
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
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a"):
        text = a.get_text(strip=True).lower()
        if text in ("next", "next >", "[next]", ">") and a.get("href"):
            return urljoin(base_url, a["href"])
    return None
