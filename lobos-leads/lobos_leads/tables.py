"""Generic HTML results-table extraction.

State query sites render results as plain HTML tables. Rather than
hard-code column positions (which break when a site adds a column),
we find the table whose header row contains the words we need and
return each row as a {header: cell-text} dict.
"""

from .http import make_soup


def _cell_text(cell) -> str:
    return " ".join(cell.get_text(" ", strip=True).split())


def extract_rows(html: str, required_headers) -> list:
    """Return rows (as dicts) from the first results table whose
    header row includes every string in ``required_headers``
    (case-insensitive substring match).

    State sites nest the results table inside layout tables, and the
    header row is not always the table's first row -- so scan every
    row for one whose own cells carry the required headers. Rows that
    themselves contain a nested table are wrappers, not headers, and
    are skipped. Cells are read non-recursively so widgets nested
    inside a data cell (e.g. the RRC's "Links / Images" mini-tables)
    don't shift the columns.
    """
    soup = make_soup(html)
    seen = set()
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            if id(tr) in seen:
                continue
            seen.add(id(tr))
            if tr.find("table"):
                continue
            headers = [
                _cell_text(c) for c in tr.find_all(["th", "td"], recursive=False)
            ]
            lower = [h.lower() for h in headers]
            if len(headers) < 2 or not all(
                any(req.lower() in h for h in lower)
                for req in required_headers
            ):
                continue

            rows = []
            for data_tr in tr.find_next_siblings("tr"):
                cells = [
                    _cell_text(c)
                    for c in data_tr.find_all(["td", "th"], recursive=False)
                ]
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
