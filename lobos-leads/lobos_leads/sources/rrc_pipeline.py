"""Texas RRC pipeline permit (T-4) source.

Why this matters for Lobos: a new or amended T-4 pipeline permit in a
Permian county means pipe is going in the ground or an existing system
is being extended/reworked -- trenching, connecting, rehab, and the
ongoing maintenance contracts that follow.

Since 2015 all T-4 work goes through the RRC's Pipeline Online
Permitting System (POPS), which doesn't have a friendly public query.
But the RRC publishes the permitted pipeline systems (with operator,
county, status, and last-update attributes) through its public ArcGIS
map services, which answer clean JSON queries. This module discovers
the pipeline layer on the RRC GIS server at run time and pulls
recently-updated systems in the target counties.

If the GIS server layout defeats it, check these manually instead:
  * New pipeline permits by year (PDF lists):
    https://www.rrc.texas.gov/pipeline-safety/permitting-and-mapping/permitting/new-permits/
  * RRC public GIS viewer (pipelines layer):
    https://gis.rrc.texas.gov/GISViewer/
"""

from datetime import date, datetime, timedelta

from ..counties import PERMIAN_TX_COUNTIES
from ..http import PoliteSession

GIS_ROOT = "https://gis.rrc.texas.gov/server/rest/services"
MAX_RECORDS = 2000


def fetch(days_back: int = 90, counties=None, verbose=True) -> list:
    counties = [
        c.upper() for c in (counties or sorted(PERMIAN_TX_COUNTIES))
        if c.upper() in PERMIAN_TX_COUNTIES
    ]
    session = PoliteSession()

    if verbose:
        print(f"[rrc-pipeline] discovering pipeline layer on {GIS_ROOT}")
    layer_url, fields = _find_pipeline_layer(session)
    if verbose:
        print(f"[rrc-pipeline] using layer: {layer_url}")

    county_f = _field(fields, "county")
    oper_f = _field(fields, "operator") or _field(fields, "oper")
    status_f = _field(fields, "status")
    date_f = _field(fields, "modify", "date") or _field(fields, "update") \
        or _field(fields, "date")
    sys_f = _field(fields, "system") or _field(fields, "name")
    t4_f = _field(fields, "t4") or _field(fields, "permit")
    if not (county_f and oper_f):
        raise RuntimeError(
            "pipeline layer found but county/operator fields were not "
            f"recognizable (fields: {sorted(fields)[:20]} ...)"
        )

    county_list = ", ".join(f"'{c}'" for c in counties)
    params = {
        "where": f"UPPER({county_f}) IN ({county_list})",
        "outFields": "*",
        "returnGeometry": "false",
        "resultRecordCount": MAX_RECORDS,
        "f": "json",
    }
    data = session.get(f"{layer_url}/query", params=params).json()
    if "error" in data:
        raise RuntimeError(f"GIS query error: {data['error']}")

    cutoff = datetime.now() - timedelta(days=days_back)
    permits = []
    for feat in data.get("features", []):
        attrs = feat.get("attributes", {})
        when = _as_datetime(attrs.get(date_f)) if date_f else None
        if when and when < cutoff:
            continue
        status = str(attrs.get(status_f, "") or "")
        permits.append(
            {
                "signal": "pipeline_permit",
                "state": "TX",
                "operator": str(attrs.get(oper_f, "")).strip(),
                "county": str(attrs.get(county_f, "")).strip().upper(),
                "district": PERMIAN_TX_COUNTIES.get(
                    str(attrs.get(county_f, "")).strip().upper(), {}
                ).get("district", ""),
                "date": when.strftime("%m/%d/%Y") if when else "",
                "purpose": f"T-4 pipeline system ({status})" if status
                else "T-4 pipeline system",
                "lease": str(attrs.get(sys_f, "") or "").strip(),
                "permit_no": str(attrs.get(t4_f, "") or "").strip(),
            }
        )

    permits = [p for p in permits if p["operator"]]
    if verbose:
        print(
            f"[rrc-pipeline] {len(permits)} pipeline systems touched in "
            f"the last {days_back} days in target counties"
        )
    return permits


def _find_pipeline_layer(session: PoliteSession):
    """Walk the ArcGIS services directory for a pipelines layer and
    return (layer_url, {field names})."""
    root = session.get(GIS_ROOT, params={"f": "json"}).json()
    candidates = []
    for svc in root.get("services", []):
        candidates.append((svc["name"], svc["type"]))
    for folder in root.get("folders", []):
        sub = session.get(f"{GIS_ROOT}/{folder}", params={"f": "json"}).json()
        candidates.extend(
            (svc["name"], svc["type"]) for svc in sub.get("services", [])
        )

    for name, stype in candidates:
        if "pipeline" not in name.lower() or stype not in (
            "MapServer", "FeatureServer"
        ):
            continue
        svc_url = f"{GIS_ROOT}/{name}/{stype}"
        meta = session.get(svc_url, params={"f": "json"}).json()
        for layer in meta.get("layers", []):
            if "pipeline" not in layer.get("name", "").lower():
                continue
            layer_url = f"{svc_url}/{layer['id']}"
            layer_meta = session.get(layer_url, params={"f": "json"}).json()
            fields = {f["name"] for f in layer_meta.get("fields", [])}
            if fields:
                return layer_url, fields
    raise RuntimeError(
        "no pipelines layer found on the RRC GIS server -- the server "
        "layout may have changed"
    )


def _field(fields, *substrings):
    for name in fields:
        low = name.lower()
        if all(s.lower() in low for s in substrings):
            return name
    return None


def _as_datetime(value):
    if value in (None, ""):
        return None
    try:
        # ArcGIS dates are epoch milliseconds
        return datetime.fromtimestamp(int(value) / 1000)
    except (ValueError, TypeError, OSError):
        return None
