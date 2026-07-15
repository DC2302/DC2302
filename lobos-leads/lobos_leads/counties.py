"""Permian Basin county reference data.

Texas RRC organizes the Permian Basin under districts 08, 8A, and 7C.
County codes below are the RRC's 3-digit county codes (used by the
drilling-permit query). The New Mexico side of the basin (Delaware
Basin) is Lea and Eddy counties.

Trim or extend PERMIAN_TX_COUNTIES to focus the search area. The
counties closest to most tank-battery / SWD activity right now are
Midland, Martin, Howard, Upton, Reagan (Midland Basin) and Loving,
Reeves, Ward, Culberson, Pecos (Delaware Basin).
"""

# name -> RRC county code (3-digit, zero-padded), RRC district
PERMIAN_TX_COUNTIES = {
    # District 08 - Delaware Basin & central platform
    "LOVING":    {"code": "302", "district": "08"},
    "REEVES":    {"code": "389", "district": "08"},
    "WARD":      {"code": "475", "district": "08"},
    "WINKLER":   {"code": "495", "district": "08"},
    "CULBERSON": {"code": "109", "district": "08"},
    "PECOS":     {"code": "371", "district": "08"},
    "ECTOR":     {"code": "135", "district": "08"},
    "MIDLAND":   {"code": "329", "district": "08"},
    "MARTIN":    {"code": "317", "district": "08"},
    "ANDREWS":   {"code": "003", "district": "08"},
    "CRANE":     {"code": "103", "district": "08"},
    "UPTON":     {"code": "461", "district": "08"},
    "GLASSCOCK": {"code": "173", "district": "08"},
    "HOWARD":    {"code": "227", "district": "08"},
    # District 8A - northern Midland Basin
    "GAINES":    {"code": "165", "district": "8A"},
    "DAWSON":    {"code": "115", "district": "8A"},
    "YOAKUM":    {"code": "501", "district": "8A"},
    "TERRY":     {"code": "445", "district": "8A"},
    "BORDEN":    {"code": "033", "district": "8A"},
    "SCURRY":    {"code": "415", "district": "8A"},
    # District 7C - southern Midland Basin
    "REAGAN":    {"code": "383", "district": "7C"},
    "IRION":     {"code": "235", "district": "7C"},
    "CROCKETT":  {"code": "105", "district": "7C"},
    "STERLING":  {"code": "431", "district": "7C"},
    "COKE":      {"code": "081", "district": "7C"},
    "TOM GREEN": {"code": "451", "district": "7C"},
}

# New Mexico (Delaware Basin) counties for the OCD source.
PERMIAN_NM_COUNTIES = ["LEA", "EDDY"]


def tx_county_names():
    return sorted(PERMIAN_TX_COUNTIES)


def tx_county_codes():
    return [v["code"] for v in PERMIAN_TX_COUNTIES.values()]


def is_permian_tx_county(name: str) -> bool:
    return name.strip().upper() in PERMIAN_TX_COUNTIES


def is_permian_nm_county(name: str) -> bool:
    return name.strip().upper() in PERMIAN_NM_COUNTIES
