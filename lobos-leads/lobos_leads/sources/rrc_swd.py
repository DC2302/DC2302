"""Texas RRC injection/disposal (saltwater disposal) permit source.

Why this matters for Lobos: a company applying for a W-14 disposal
permit is about to BUILD a saltwater disposal facility -- pad, tanks,
pumps, and usually water-gathering pipeline. That is exactly Lobos's
wheelhouse, and the permit application is public before construction
starts.

Data source: the RRC Underground Injection Control query.
    https://webapps2.rrc.texas.gov/EWA/uicQueryAction.do

Note: since June 2025 the RRC evaluates new/amended Permian SWD
permits under dedicated Permian guidelines, so pending applications
are concentrated exactly where Lobos works.

Field names are discovered from the live form at run time, same as
the drilling-permit source.
"""

from datetime import date, timedelta
from urllib.parse import urljoin

from ..counties import PERMIAN_TX_COUNTIES
from ..http import PoliteSession, find_field, parse_form
from ..tables import extract_rows, pick

QUERY_URL = "https://webapps2.rrc.texas.gov/EWA/uicQueryAction.do"
MAX_PAGES = 20


def fetch(days_back: int = 90, counties=None, verbose=True) -> list:
    counties = counties or sorted(PERMIAN_TX_COUNTIES)
    since = date.today() - timedelta(days=days_back)
    session = PoliteSession()

    if verbose:
        print(f"[rrc-swd] loading UIC query form: {QUERY_URL}")
    resp = session.get(QUERY_URL)
    action, fields = parse_form(resp.text, form_hint="uic")

    county_field = find_field(fields, "county")
    date_from = find_field(fields, "date", "from") or find_field(
        fields, "submitted", "from"
    )
    date_to = find_field(fields, "date", "to") or find_field(
        fields, "submitted", "to"
    )
    if not county_field:
        raise RuntimeError(
            "Could not locate the county field on the RRC UIC query form. "
            "See the Troubleshooting section of the README."
        )
    if date_from and date_to:
        fields[date_from] = since.strftime("%m/%d/%Y")
        fields[date_to] = date.today().strftime("%m/%d/%Y")

    fields[county_field] = [
        PERMIAN_TX_COUNTIES[c.upper()]["code"]
        for c in counties
        if c.upper() in PERMIAN_TX_COUNTIES
    ]

    submit_url = urljoin(resp.url, action) if action else resp.url
    if verbose:
        print(f"[rrc-swd] searching disposal permit applications since {since:%m/%d/%Y}")

    permits = []
    page = session.post(submit_url, data=fields)
    for _ in range(MAX_PAGES):
        rows = extract_rows(page.text, required_headers=["operator", "county"])
        for row in rows:
            operator = pick(row, "operator")
            county = pick(row, "county")
            if not operator or not county:
                continue
            permits.append(
                {
                    "signal": "swd_permit",
                    "state": "TX",
                    "operator": operator,
                    "county": county.upper(),
                    "district": pick(row, "dist"),
                    "date": pick(row, "date") or pick(row, "submitted"),
                    "purpose": pick(row, "type") or "injection/disposal",
                    "lease": pick(row, "lease") or pick(row, "well"),
                    "permit_no": pick(row, "permit") or pick(row, "uic"),
                }
            )
        next_url = _next_page_link(page.text, page.url)
        if not next_url:
            break
        page = session.get(next_url)

    if verbose:
        print(f"[rrc-swd] found {len(permits)} disposal permits/applications")
    return permits


def _next_page_link(html: str, base_url: str):
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    for a in soup.find_all("a"):
        text = a.get_text(strip=True).lower()
        if text in ("next", "next >", "[next]", ">") and a.get("href"):
            return urljoin(base_url, a["href"])
    return None
