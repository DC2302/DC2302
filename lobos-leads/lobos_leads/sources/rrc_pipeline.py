"""Texas RRC pipeline permit (T-4) source.

Why this matters for Lobos: a new or amended T-4 pipeline permit in a
Permian county means pipe is going in the ground or an existing system
is being extended/reworked -- trenching, connecting, rehab, and the
ongoing maintenance contracts that follow.

Since 2015 all T-4 work goes through the RRC's Pipeline Online
Permitting System (POPS), which doesn't have a friendly public query.
The RRC's public GIS layers carry every permitted pipeline ever built
(no dates), so they can't answer "who permitted pipe recently" -- but
the RRC also publishes a "New T-4 permits issued since January 1"
PDF on its new-permits page, updated through the year. This module
finds the current-year PDF and reads its table.

If the page or PDF defeats it, check manually:
    https://www.rrc.texas.gov/pipeline-safety/permitting-and-mapping/permitting/new-permits/
"""

import io
import re

from ..counties import PERMIAN_TX_COUNTIES
from ..http import PoliteSession, make_soup

NEW_PERMITS_PAGE = (
    "https://www.rrc.texas.gov/pipeline-safety/"
    "permitting-and-mapping/permitting/new-permits/"
)


def fetch(days_back: int = 90, counties=None, verbose=True) -> list:
    """Return permit dicts for new T-4 permits (current year to date)
    that touch a target county.

    ``days_back`` is accepted for interface consistency but the PDF is
    a year-to-date list, so all of the current year is returned.
    """
    counties = {
        c.upper() for c in (counties or PERMIAN_TX_COUNTIES)
        if c.upper() in PERMIAN_TX_COUNTIES
    }
    session = PoliteSession()

    if verbose:
        print(f"[rrc-pipeline] finding current new-permits list on "
              f"{NEW_PERMITS_PAGE}")
    page = session.get(NEW_PERMITS_PAGE)
    pdf_url = _current_year_pdf_url(page.text, page.url)
    if not pdf_url:
        raise RuntimeError(
            "could not find the current-year 'New Permits' PDF link -- "
            f"check {NEW_PERMITS_PAGE} manually"
        )

    if verbose:
        print(f"[rrc-pipeline] reading {pdf_url}")
    pdf_bytes = session.get(pdf_url).content
    rows, updated = _parse_permit_pdf(pdf_bytes)

    permits = []
    seen = set()
    for row in rows:
        row_counties = [
            c.strip().upper() for c in (row.get("counties") or "").split(",")
        ]
        hit = sorted(counties.intersection(row_counties))
        if not hit or not row.get("operator"):
            continue
        for county in hit:
            key = (row.get("permit_no"), county)
            if key in seen:
                continue
            seen.add(key)
            permits.append(
                {
                    "signal": "pipeline_permit",
                    "state": "TX",
                    "operator": row["operator"],
                    "county": county,
                    "district": PERMIAN_TX_COUNTIES.get(county, {}).get(
                        "district", ""
                    ),
                    "date": updated or "",
                    "purpose": "new T-4 pipeline permit ({}, {})".format(
                        row.get("type") or "pipeline",
                        row.get("classification") or "n/a",
                    ),
                    "lease": "",
                    "permit_no": row.get("permit_no", ""),
                }
            )

    if verbose:
        print(
            f"[rrc-pipeline] {len(permits)} new T-4 permit/county records "
            f"in target counties (current year to date)"
        )
    return permits


def _current_year_pdf_url(html: str, base_url: str):
    """Find the newest 'New Permits' PDF link on the page."""
    from urllib.parse import urljoin

    soup = make_soup(html)
    best = None
    for a in soup.find_all("a", href=True):
        text = a.get_text(strip=True)
        m = re.match(r"(\d{4})\s+New\s+Permits", text, re.IGNORECASE)
        if m and a["href"].lower().endswith(".pdf"):
            year = int(m.group(1))
            if best is None or year > best[0]:
                best = (year, urljoin(base_url, a["href"]))
    return best[1] if best else None


def _parse_permit_pdf(pdf_bytes: bytes):
    """Return (rows, last_updated) from the new-permits PDF table.

    Table columns: PERMIT_NBR, OPERATOR_NAME, OPERATOR_P5,
    PERMIT_TYPE, CLASSIFICATION, INTERSTATE_Y_N, COUNTIES.
    """
    import pdfplumber

    rows = []
    updated = ""
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        header = None
        for page in pdf.pages:
            for raw in page.extract_table() or []:
                cells = [(c or "").strip() for c in raw]
                joined = " ".join(cells)
                m = re.search(
                    r"Last updated\s+([A-Za-z]+ \d{1,2}, \d{4})", joined
                )
                if m:
                    updated = m.group(1)
                if any("PERMIT_NBR" in c for c in cells):
                    header = [c.lower() for c in cells]
                    continue
                if not header or not cells[0]:
                    continue
                row = dict(zip(header, cells))
                rows.append(
                    {
                        "permit_no": row.get("permit_nbr", ""),
                        "operator": row.get("operator_name", ""),
                        "type": row.get("permit_type", ""),
                        "classification": row.get("classification", ""),
                        "counties": row.get("counties", ""),
                    }
                )
    return rows, updated
