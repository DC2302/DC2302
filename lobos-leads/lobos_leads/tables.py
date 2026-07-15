"""Generic HTML results-table extraction.

State query sites render results as plain HTML tables. Rather than
hard-code column positions (which break when a site adds a column),
we find the table whose header row contains the words we need and
return each row as a {header: cell-text} dict.
"""

from bs4 import BeautifulSoup


def _cell_text(cell) -> str:
    return " ".join(cell.get_text(" ", strip=True).split())


def extract_rows(html: str, required_headers) -> list:
    """Return rows (as dicts) from the first table whose headers
    include every string in ``required_headers`` (case-insensitive
    substring match)."""
    soup = BeautifulSoup(html, "html.parser")
    for table in soup.find_all("table"):
        header_row = table.find("tr")
        if not header_row:
            continue
        headers = [_cell_text(c) for c in header_row.find_all(["th", "td"])]
        lower = [h.lower() for h in headers]
        if not all(
            any(req.lower() in h for h in lower) for req in required_headers
        ):
            continue

        rows = []
        for tr in header_row.find_next_siblings("tr"):
            cells = [_cell_text(c) for c in tr.find_all(["td", "th"])]
            if len(cells) < 2:
                continue
            row = {}
            for i, value in enumerate(cells):
                key = headers[i] if i < len(headers) else f"col{i}"
                row[key] = value
            rows.append(row)
        return rows
    return []


def pick(row: dict, *substrings: str) -> str:
    """Fuzzy column lookup: first value whose header contains all the
    given substrings (case-insensitive)."""
    for header, value in row.items():
        low = header.lower()
        if all(s.lower() in low for s in substrings):
            return value
    return ""
