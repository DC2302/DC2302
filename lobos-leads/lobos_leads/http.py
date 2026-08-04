"""Polite HTTP session + HTML form helpers.

State websites (Texas RRC, New Mexico OCD) explicitly warn that
aggressive automated scraping will get a session cut off. Everything
here is deliberately slow and gentle:

  * one request at a time, with a pause between requests
  * a real browser-style User-Agent that identifies the tool
  * automatic retry with backoff on transient errors

The form helpers let source modules *discover* form field names from
the live page instead of hard-coding them, so small site updates do
not break the scraper.
"""

import time

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.ssl_ import create_urllib3_context

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) LobosLeadsBot/0.1 "
    "(oilfield facility construction lead research; low volume)"
)

# Seconds to wait between requests. Be nice -- these are shared
# public systems and getting blocked helps nobody.
REQUEST_DELAY = 3.0

# BeautifulSoup parser preference. The state sites serve malformed
# HTML that the strict built-in parser truncates (e.g. it drops most
# of the RRC drilling-permit form's fields); lxml recovers it.
try:
    import lxml  # noqa: F401
    SOUP_PARSER = "lxml"
except ImportError:
    SOUP_PARSER = "html.parser"


def make_soup(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, SOUP_PARSER)


class _LegacyCipherAdapter(HTTPAdapter):
    """Some RRC servers (webapps2.rrc.texas.gov) only negotiate
    ciphers below urllib3's default security level. Allow them while
    keeping certificate verification fully enabled."""

    def _ctx(self):
        ctx = create_urllib3_context()
        ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
        return ctx

    def init_poolmanager(self, *args, **kwargs):
        kwargs["ssl_context"] = self._ctx()
        return super().init_poolmanager(*args, **kwargs)

    def proxy_manager_for(self, *args, **kwargs):
        kwargs["ssl_context"] = self._ctx()
        return super().proxy_manager_for(*args, **kwargs)


class PoliteSession:
    def __init__(self, delay: float = REQUEST_DELAY):
        self.session = requests.Session()
        self.session.mount("https://", _LegacyCipherAdapter())
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.delay = delay
        self._last_request = 0.0

    def _wait(self):
        elapsed = time.time() - self._last_request
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self._last_request = time.time()

    def _request(self, method, url, **kwargs):
        kwargs.setdefault("timeout", 60)
        last_err = None
        for attempt in range(3):
            self._wait()
            try:
                resp = self.session.request(method, url, **kwargs)
                if resp.status_code in (429, 502, 503, 504):
                    raise requests.HTTPError(f"HTTP {resp.status_code}")
                resp.raise_for_status()
                return resp
            except requests.RequestException as err:
                last_err = err
                time.sleep(5 * (attempt + 1))
        raise RuntimeError(f"Request failed after retries: {url} ({last_err})")

    def get(self, url, **kwargs):
        return self._request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self._request("POST", url, **kwargs)


def parse_form(html: str, form_hint: str = ""):
    """Find a form on the page and return (action, {field: value}).

    ``form_hint`` is a substring matched against the form's action/name/id
    to pick the right form when a page has several. Hidden inputs and
    default values (including ASP.NET __VIEWSTATE machinery) are captured
    so the form can be re-submitted the way a browser would.
    """
    soup = make_soup(html)
    forms = soup.find_all("form")
    if not forms:
        raise ValueError("No <form> found on page")

    form = forms[0]
    if form_hint:
        for f in forms:
            haystack = " ".join(
                str(f.get(attr, "")) for attr in ("action", "name", "id")
            ).lower()
            if form_hint.lower() in haystack:
                form = f
                break

    fields = {}
    for inp in form.find_all("input"):
        name = inp.get("name")
        if not name:
            continue
        itype = (inp.get("type") or "text").lower()
        if itype in ("submit", "button", "image", "reset"):
            continue
        if itype in ("checkbox", "radio") and not inp.has_attr("checked"):
            continue
        fields[name] = inp.get("value", "")
    for sel in form.find_all("select"):
        name = sel.get("name")
        if not name:
            continue
        if sel.has_attr("multiple"):
            # A browser submits nothing for an untouched multi-select;
            # defaulting to the first option would silently narrow the
            # query (e.g. RRC district '01').
            chosen = sel.find_all("option", selected=True)
            fields[name] = [o.get("value", "") for o in chosen]
        else:
            chosen = sel.find("option", selected=True) or sel.find("option")
            fields[name] = chosen.get("value", "") if chosen else ""
    for ta in form.find_all("textarea"):
        name = ta.get("name")
        if name:
            fields[name] = ta.get_text()

    return form.get("action", ""), fields


def find_field(fields: dict, *substrings: str):
    """Return the first field name containing all given substrings
    (case-insensitive), or None. Lets us fill e.g. the 'approved date
    from' box without hard-coding the site's exact field name."""
    for name in fields:
        low = name.lower()
        if all(s.lower() in low for s in substrings):
            return name
    return None
