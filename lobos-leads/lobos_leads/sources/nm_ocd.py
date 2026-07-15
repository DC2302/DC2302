"""New Mexico OCD (Oil Conservation Division) permit source -- the
Delaware Basin side of the Permian (Lea & Eddy counties).

Why this matters for Lobos: Lea and Eddy are two of the busiest
oil-and-gas counties in the country. An approved C-101 (Application
for Permit to Drill) means surface facilities are coming.

Data source: OCD e-permitting public data pages,
    https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Permits.aspx

This is an ASP.NET page (__VIEWSTATE postbacks), which is fussier to
automate than the Texas pages. This module does a best-effort
postback; if the page layout defeats it, the tool prints the URL so
the county permit list can be pulled manually (it exports to Excel
in the browser), and the rest of the pipeline still runs on the
Texas data.
"""

from urllib.parse import urljoin

from ..counties import PERMIAN_NM_COUNTIES
from ..http import PoliteSession, find_field, parse_form
from ..tables import extract_rows, pick

PERMITS_URL = "https://wwwapps.emnrd.nm.gov/OCD/OCDPermitting/Data/Permits.aspx"


def fetch(days_back: int = 30, counties=None, verbose=True) -> list:
    counties = [c.upper() for c in (counties or PERMIAN_NM_COUNTIES)]
    session = PoliteSession()
    permits = []

    for county in counties:
        if verbose:
            print(f"[nm-ocd] loading OCD permits page for {county} county")
        try:
            permits.extend(_fetch_county(session, county))
        except Exception as err:  # noqa: BLE001 - keep pipeline alive
            print(
                f"[nm-ocd] WARNING: automated pull for {county} failed "
                f"({err}).\n"
                f"         Pull it manually in a browser instead: "
                f"{PERMITS_URL} (filter county = {county}, approved "
                f"C-101s, export to Excel)."
            )

    if verbose:
        print(f"[nm-ocd] found {len(permits)} permits")
    return permits


def _fetch_county(session: PoliteSession, county: str) -> list:
    resp = session.get(PERMITS_URL)
    action, fields = parse_form(resp.text, form_hint="aspnetForm")

    county_field = find_field(fields, "county")
    if not county_field:
        raise RuntimeError("county selector not found on page")
    fields[county_field] = county.title()

    # ASP.NET pages fire a postback; the search button name usually
    # contains 'search' or 'go'.
    search_btn = find_field(fields, "search") or find_field(fields, "btn", "go")
    if search_btn:
        fields[search_btn] = "Search"

    submit_url = urljoin(resp.url, action) if action else resp.url
    page = session.post(submit_url, data=fields)

    results = []
    for row in extract_rows(page.text, required_headers=["operator"]):
        operator = pick(row, "operator") or pick(row, "ogrid")
        if not operator:
            continue
        results.append(
            {
                "signal": "drilling_permit",
                "state": "NM",
                "operator": operator,
                "county": county,
                "district": "NM-OCD",
                "date": pick(row, "approved") or pick(row, "date"),
                "purpose": pick(row, "type") or "APD (C-101)",
                "lease": pick(row, "well") or pick(row, "name"),
                "permit_no": pick(row, "api") or pick(row, "permit"),
            }
        )
    return results
