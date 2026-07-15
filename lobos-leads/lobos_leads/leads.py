"""Turn raw permit records into a ranked lead list.

A "lead" is an operator, scored by how much facility-construction
work their recent permits imply:

  * saltwater-disposal permit application  -> 4 points each
    (an SWD permit IS a facility construction project: pad, tanks,
    pumps, water gathering lines)
  * drilling permit                        -> 1 point each
    (each new well needs tank battery capacity, flowlines, hookups;
    a batch of permits on one lease usually means a new central
    facility)

Operators are grouped under a normalized name so "XYZ OPERATING LLC"
and "XYZ Operating, L.L.C." count as one company.
"""

import re
from collections import defaultdict

_SUFFIXES = re.compile(
    r"\b(l\.?l\.?c\.?|l\.?p\.?|inc\.?|corp(oration)?\.?|co\.?|company|"
    r"ltd\.?|resources|operating|oper|petroleum|energy|e&p|usa|"
    r"permian(\s+basin)?)\b",
    re.IGNORECASE,
)


def normalize_operator(name: str) -> str:
    """Collapse legal-suffix noise so name variants group together."""
    base = re.sub(r"\(\d+\)", "", name)          # RRC operator numbers
    base = re.sub(r"[^\w\s&-]", " ", base)
    base = _SUFFIXES.sub(" ", base)
    base = re.sub(r"\s+", " ", base).strip().upper()
    return base or name.strip().upper()


SIGNAL_POINTS = {
    "swd_permit": 4,          # an SWD application IS a facility build
    "pipeline_permit": 3,     # pipe going in / system being reworked
    "datacenter_project": 6,  # registered commercial build, huge scope
    "drilling_permit": 1,     # facilities follow within months
}


def build_leads(permits: list) -> list:
    """Aggregate permit records into leads, best first."""
    groups = defaultdict(list)
    for p in permits:
        groups[normalize_operator(p["operator"])].append(p)

    leads = []
    for key, records in groups.items():
        drilling = [r for r in records if r["signal"] == "drilling_permit"]
        swd = [r for r in records if r["signal"] == "swd_permit"]
        pipeline = [r for r in records if r["signal"] == "pipeline_permit"]
        datacenter = [r for r in records if r["signal"] == "datacenter_project"]
        counties = sorted({r["county"].title() for r in records})
        states = sorted({r["state"] for r in records})
        dates = sorted(d for d in (r.get("date", "") for r in records) if d)

        # Use the most common raw spelling as the display name.
        raw_names = defaultdict(int)
        for r in records:
            raw_names[r["operator"].strip()] += 1
        display = max(raw_names, key=raw_names.get)

        score = sum(SIGNAL_POINTS.get(r["signal"], 1) for r in records)

        leads.append(
            {
                "operator": display,
                "operator_key": key,
                "category": "datacenter" if datacenter else "oilgas",
                "score": score,
                "drilling_permits": len(drilling),
                "swd_permits": len(swd),
                "pipeline_permits": len(pipeline),
                "datacenter_projects": len(datacenter),
                "counties": counties,
                "states": states,
                "latest_activity": dates[-1] if dates else "",
                "pitch": pitch_for(
                    len(drilling), len(swd), len(pipeline), datacenter,
                    counties,
                ),
                "records": records,
            }
        )

    leads.sort(key=lambda l: (-l["score"], l["operator"]))
    return leads


def pitch_for(drilling: int, swd: int, pipeline: int, datacenter: list,
              counties: list) -> str:
    """One-line talking point for the call sheet."""
    where = ", ".join(counties[:3]) + (" ..." if len(counties) > 3 else "")
    parts = []
    if datacenter:
        projects = ", ".join(
            r.get("lease", "") for r in datacenter[:3] if r.get("lease")
        )
        gcs = sorted(
            {r.get("contractor", "") for r in datacenter if r.get("contractor")}
        )
        line = (
            f"{len(datacenter)} registered construction project(s) "
            f"({projects}) -- pitch site work, trenching, utility "
            "infrastructure, and concrete/steel subcontract packages"
        )
        if gcs:
            line += f"; general contractor on file: {', '.join(gcs)}"
        parts.append(line)
    if swd:
        parts.append(
            f"filed {swd} saltwater-disposal permit application(s) -- "
            "pitch full SWD facility construction (pad, tanks, pumps, "
            "water gathering line trenching/tie-in)"
        )
    if pipeline:
        parts.append(
            f"{pipeline} pipeline system(s) newly permitted or amended -- "
            "pitch pipeline trenching, connecting, rehab, and maintenance"
        )
    if drilling:
        parts.append(
            f"pulled {drilling} drilling permit(s) in {where} -- "
            "pitch tank batteries, production facilities, flowline "
            "hookups for the new wells"
        )
    return "; ".join(parts) if parts else "recent Permian permit activity"
