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

The search page is a JavaScript app; the page's own JSON endpoint is
POST /TABS/Search/SearchProjects (a DataTables server-side feed with
filter fields like ProjectName / LocationCounty), and project details
come from POST /TABS/Search/Details. County and city ids are decoded
with the Lookup tables embedded in the search page. If the endpoints
defeat automation, the tool prints the URL -- searching "data center"
by county in a browser takes about a minute and the project detail
pages list the contacts.
"""

import json
import re
from datetime import date, timedelta

from ..counties import DATACENTER_TX_COUNTIES
from ..http import PoliteSession, make_soup

SEARCH_URL = "https://www.tdlr.texas.gov/tabs/search"
SEARCH_ENDPOINT = "https://www.tdlr.texas.gov/TABS/Search/SearchProjects"
DETAILS_ENDPOINT = "https://www.tdlr.texas.gov/TABS/Search/Details"

# Keywords matched against project names. "Substation" and "switchyard"
# are included because data-center campuses register their power
# infrastructure as separate projects -- often earlier than the
# buildings themselves.
KEYWORDS = [
    "data center", "datacenter", "data centre", "server", "hyperscale",
    "compute", "crypto", "mining", "substation", "switchyard",
]

# How many project detail pages to fetch (owner / design firm / GC).
MAX_DETAIL_FETCHES = 40


def fetch(days_back: int = 365, counties=None, verbose=True) -> list:
    counties = {
        c.upper() for c in (counties or DATACENTER_TX_COUNTIES)
        if c.upper() in DATACENTER_TX_COUNTIES
    }
    session = PoliteSession()

    if verbose:
        print(f"[tdlr] loading TABS project search: {SEARCH_URL}")
    resp = session.get(SEARCH_URL)
    county_names = _lookup(resp.text, "COUNTIES")   # id -> name
    city_names = _lookup(resp.text, "CITIES")
    if not county_names:
        raise RuntimeError(
            "could not read the county lookup from the TDLR TABS page -- "
            f"search manually at {SEARCH_URL} (keyword 'data center', "
            "filter to West Texas counties)"
        )

    ajax_headers = {
        "X-Requested-With": "XMLHttpRequest",
        "Referer": resp.url,
    }
    reg_begin = (date.today() - timedelta(days=days_back)).strftime(
        "%m/%d/%Y"
    )

    found = {}

    def collect(data, keyword, min_cost=0):
        for item in data.get("data", []):
            county = county_names.get(str(item.get("County")), "").upper()
            number = item.get("ProjectNumber") or item.get("ProjectId")
            cost = float(item.get("EstimatedCost") or 0)
            if county not in counties or number in found or cost < min_cost:
                continue
            found[number] = {
                "keyword": keyword,
                "county": county,
                "city": city_names.get(str(item.get("City")), ""),
                "item": item,
            }

    def search(**filters):
        payload = {"draw": "1", "start": "0", "length": "500",
                   "RegistrationDateBegin": reg_begin}
        payload.update(filters)
        return session.post(
            SEARCH_ENDPOINT, data=payload, headers=ajax_headers
        ).json()

    # Keyword pass over project AND facility names (campuses often
    # register under a codename project name but a descriptive
    # facility name, or vice versa).
    for keyword in KEYWORDS:
        collect(search(ProjectName=keyword), keyword)
        collect(search(FacilityName=keyword), keyword)

    # Catch-all pass: every $10M+ registration in the target counties,
    # whatever it's called -- data-center campuses register under
    # codenames ("Project Eagle") that keywords can't guess.
    county_ids = {
        cid: name for cid, name in county_names.items()
        if name.upper() in counties
    }
    for cid, cname in sorted(county_ids.items(), key=lambda kv: kv[1]):
        collect(
            search(LocationCounty=cid), "large project ($10M+)",
            min_cost=10_000_000,
        )

    if verbose:
        print(
            f"[tdlr] {len(found)} matching West Texas projects; fetching "
            f"contact details for up to {MAX_DETAIL_FETCHES}"
        )

    projects = []
    for number, hit in found.items():
        item = hit["item"]
        detail = {}
        if len(projects) < MAX_DETAIL_FETCHES and item.get("ProjectId"):
            try:
                page = session.post(
                    DETAILS_ENDPOINT,
                    data={"id": item["ProjectId"]},
                    headers=ajax_headers,
                )
                detail = _parse_details(page.text)
            except Exception:  # noqa: BLE001 - details are best-effort
                detail = {}

        owner = _clean(detail.get("Owner", ""))
        name = item.get("ProjectName", "")
        projects.append(
            {
                "signal": "datacenter_project",
                "state": "TX",
                "operator": owner or name,
                "county": hit["county"],
                "district": DATACENTER_TX_COUNTIES.get(hit["county"], ""),
                "date": _fmt_date(item.get("ProjectCreatedOn", "")),
                "purpose": f"commercial construction ({hit['keyword']})",
                "lease": name,
                "permit_no": number,
                "contractor": _clean(detail.get("Contractor", "")),
                "design_firm": _clean(detail.get("Architect", "")),
                "cost": str(item.get("EstimatedCost") or ""),
            }
        )

    if verbose:
        print(f"[tdlr] found {len(projects)} matching West Texas projects")
    return projects


def _lookup(html: str, name: str) -> dict:
    m = re.search(r"Lookup\.%s\s*=\s*(\{.*?\});" % name, html, re.S)
    if not m:
        return {}
    try:
        return json.loads(m.group(1))
    except ValueError:
        return {}


def _parse_details(html: str) -> dict:
    """Return {label: value} from the detail page's <dt>/<dd> pairs."""
    soup = make_soup(html)
    out = {}
    for dt in soup.find_all("dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            out[dt.get_text(strip=True)] = dd.get_text(" ", strip=True)
    return out


def _clean(value: str) -> str:
    value = (value or "").strip()
    return "" if value.lower() == "not assigned" else value


def _fmt_date(iso: str) -> str:
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", iso or "")
    return f"{m.group(2)}/{m.group(3)}/{m.group(1)}" if m else ""
