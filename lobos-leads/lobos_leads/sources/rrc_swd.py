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
    # The UIC form filters on Original Authority date:
    # searchArgs.oaStartDateArg / searchArgs.oaEndDateArg.
    date_from = find_field(fields, "start", "date")
    date_to = find_field(fields, "end", "date")
    if not county_field:
        raise RuntimeError(
            "Could not locate the county field on the RRC UIC query form. "
            "See the Troubleshooting section of the README."
        )
    if date_from and date_to:
        # End at yesterday: the RRC server runs on Central time, so
        # "today" here (UTC) can be rejected as a future date.
        fields[date_from] = since.strftime("%m/%d/%Y")
        fields[date_to] = (date.today() - timedelta(days=1)).strftime(
            "%m/%d/%Y"
        )

    submit_url = urljoin(resp.url, action) if action else resp.url
    if verbose:
        print(
            f"[rrc-swd] searching disposal permits authorized since "
            f"{since:%m/%d/%Y} ({len(counties)} counties, one query each)"
        )

    permits = []
    # The county selector is a single select, so query per county.
    for county_name in counties:
        info = PERMIAN_TX_COUNTIES.get(county_name.upper())
        if not info:
            continue
        fields[county_field] = info["code"]
        page = session.post(submit_url, data=fields)
        for _ in range(MAX_PAGES):
            rows = extract_rows(
                page.text, required_headers=["operator", "county"]
            )
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
                        "lease": pick(row, "lease", "name")
                        or pick(row, "well"),
                        "permit_no": pick(row, "uic") or pick(row, "permit"),
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
    from ..http import make_soup

    soup = make_soup(html)
    for a in soup.find_all("a"):
        # The RRC pager renders the link as "[ Next > ]".
        text = a.get_text(strip=True).lower().strip("[] >")
        if text == "next" and a.get("href"):
            return urljoin(base_url, a["href"])
    return None
