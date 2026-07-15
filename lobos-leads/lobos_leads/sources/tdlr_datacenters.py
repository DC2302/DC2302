"""TDLR construction-project source -- data centers (and other big
commercial builds) in West Texas.

Why this matters for Lobos: every commercial construction project in
Texas with an estimated cost of $50,000+ must be registered with TDLR
(Texas Accessibility Standards) BEFORE construction. The registration
is public and names the project, location, estimated cost, the owner,
the design firm, and -- once assigned -- the general contractor.
That's the exact chain to call for site work, trenching, utility
infrastructure, and subcontract packages on West Texas data-center
builds.

Data source: TDLR TABS project search,
    https://www.tdlr.texas.gov/tabs/search

The search page is a web app, so this module does a best-effort
keyword search per target county and filters the results. If the page
defeats automation, the tool prints the URL -- searching "data center"
by county in a browser takes about a minute and the project detail
pages list the contacts.
"""

from urllib.parse import urljoin

from ..counties import DATACENTER_TX_COUNTIES
from ..http import PoliteSession, find_field, parse_form
from ..tables import extract_rows, pick

SEARCH_URL = "https://www.tdlr.texas.gov/tabs/search"

# Keywords matched against project names. "Substation" and "switchyard"
# are included because data-center campuses register their power
# infrastructure as separate projects -- often earlier than the
# buildings themselves.
KEYWORDS = [
    "data center", "datacenter", "data centre", "server", "hyperscale",
    "compute", "crypto", "mining", "substation", "switchyard",
]


def fetch(days_back: int = 365, counties=None, verbose=True) -> list:
    counties = [
        c.upper() for c in (counties or sorted(DATACENTER_TX_COUNTIES))
        if c.upper() in DATACENTER_TX_COUNTIES
    ]
    session = PoliteSession()

    if verbose:
        print(f"[tdlr] loading TABS project search: {SEARCH_URL}")
    resp = session.get(SEARCH_URL)
    action, fields = parse_form(resp.text, form_hint="search")

    keyword_field = (
        find_field(fields, "keyword") or find_field(fields, "search")
        or find_field(fields, "name") or find_field(fields, "term")
    )
    county_field = find_field(fields, "county")
    if not keyword_field:
        raise RuntimeError(
            "could not find the search box on the TDLR TABS page -- "
            f"search manually at {SEARCH_URL} (keyword 'data center', "
            "filter to West Texas counties)"
        )

    projects = []
    seen = set()
    for keyword in KEYWORDS:
        fields[keyword_field] = keyword
        if county_field:
            fields[county_field] = ""  # all counties; we filter below
        submit_url = urljoin(resp.url, action) if action else resp.url
        page = session.post(submit_url, data=fields)
        for row in extract_rows(page.text, required_headers=["project"]):
            county = pick(row, "county").upper()
            if county and county not in counties:
                continue
            name = pick(row, "project", "name") or pick(row, "project")
            number = pick(row, "tabs") or pick(row, "number")
            if not name or (number or name) in seen:
                continue
            seen.add(number or name)
            projects.append(
                {
                    "signal": "datacenter_project",
                    "state": "TX",
                    "operator": pick(row, "owner") or name,
                    "county": county or "WEST TEXAS",
                    "district": DATACENTER_TX_COUNTIES.get(county, ""),
                    "date": pick(row, "date") or pick(row, "registered"),
                    "purpose": f"commercial construction ({keyword})",
                    "lease": name,
                    "permit_no": number,
                    "contractor": pick(row, "contractor"),
                    "design_firm": pick(row, "design") or pick(row, "firm"),
                    "cost": pick(row, "cost") or pick(row, "estimate"),
                }
            )

    if verbose:
        print(f"[tdlr] found {len(projects)} matching West Texas projects")
    return projects
