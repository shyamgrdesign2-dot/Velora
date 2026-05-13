#!/usr/bin/env python3
"""
Parse a Memgraph graph-results CSV export for a single patient and emit a
structured JSON summary that downstream MD/mock generators can consume.

Each CSV row is one node-and-relationship slice (one Visit + optionally one
Provider + one Drug + one Symptom + one Lab). The same Visit appears across
multiple rows when it has multiple prescriptions / symptoms / labs.

Output JSON shape:
{
  "person_id": "...",
  "age_band": "...",
  "gender": "M|F",
  "visit_count_property": "...",   # what the Patient node claims
  "actual_visit_count": N,         # what we observed in the CSV
  "all_outpatient": bool,
  "first_visit_date": "YYYY-MM-DD",
  "last_visit_date": "YYYY-MM-DD",
  "specialties": [
    {
      "specialty": "Cardiology",
      "providers": ["Dr X", "Dr Y"],
      "visits": [
        {
          "visit_id": "...",
          "date": "YYYY-MM-DD",
          "type": "Outpatient|Inpatient",
          "provider": "Dr X",
          "drugs": [...],
          "symptoms": [...],
          "labs": [...]
        }
      ]
    }
  ]
}
"""
import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path


def _try_parse_node_or_rel(cell: str):
    """Each non-empty cell is a JSON object in double-doubled-quotes. Decode."""
    if not cell or cell.strip() == "":
        return None
    # csv module already collapses "" -> " for us, so cell is plain JSON
    try:
        return json.loads(cell)
    except json.JSONDecodeError:
        return None


def clean_generic_name(raw: str) -> str:
    """Trim 'BRAND 40MG TABLET|GENERIC-40MG|10|4' -> 'BRAND 40MG TABLET (GENERIC-40MG)'."""
    if not raw:
        return raw
    parts = raw.split("|")
    if len(parts) >= 2:
        return f"{parts[0].strip()} ({parts[1].strip()})"
    return raw.strip()


def parse_csv(path: Path) -> dict:
    rows = []
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)  # header
        for row in reader:
            if not row or all(c == "" for c in row):
                continue
            rows.append(row)

    patient_info = None
    # Group by visit_id; collect provider, drugs, symptoms, labs per visit
    visits: dict[str, dict] = {}

    for row in rows:
        # columns are: p, r1, v, r2, pr, r3, d, r4, dr, r5, lt, r6, s
        if len(row) < 13:
            row = row + [""] * (13 - len(row))
        p, r1, v, r2, pr, r3, d, r4, dr, r5, lt, r6, s = row[:13]

        p_node = _try_parse_node_or_rel(p)
        v_node = _try_parse_node_or_rel(v)
        pr_node = _try_parse_node_or_rel(pr)
        d_node = _try_parse_node_or_rel(d)
        dr_node = _try_parse_node_or_rel(dr)
        lt_node = _try_parse_node_or_rel(lt)
        s_node = _try_parse_node_or_rel(s)
        r6_rel = _try_parse_node_or_rel(r6)

        if patient_info is None and p_node:
            patient_info = p_node.get("properties", {})

        if not v_node:
            continue
        vid = v_node["properties"].get("visit_occurrence_id", "?")
        rec = visits.setdefault(vid, {
            "visit_id": vid,
            "date": v_node["properties"].get("visit_date"),
            "type": v_node["properties"].get("visit_type"),
            "provider_name": None,
            "provider_id": None,
            "specialty": None,
            "drugs": [],
            "symptoms": [],
            "diseases": [],
            "labs": [],
        })

        if pr_node:
            props = pr_node.get("properties", {})
            rec["provider_name"] = props.get("name")
            rec["provider_id"] = props.get("provider_id")
            rec["specialty"] = props.get("specialty")

        if dr_node:
            props = dr_node.get("properties", {})
            generic = clean_generic_name(props.get("generic_name", ""))
            if generic and generic not in rec["drugs"]:
                rec["drugs"].append(generic)

        if s_node:
            props = s_node.get("properties", {})
            cname = props.get("canonical_name")
            if cname:
                # also include the severity-field, which sometimes carries free text
                # like "DOE grade III since 4-5 months- since , severity -, ;..."
                if cname not in rec["symptoms"]:
                    rec["symptoms"].append(cname)
            if r6_rel:
                sev = r6_rel.get("properties", {}).get("severity", "")
                # Split on ";" — these are separate notes joined by Memgraph
                if sev:
                    for chunk in sev.split(";"):
                        # Strip "- since , severity -," suffix
                        chunk = re.sub(r"-\s*since\s*,\s*severity\s*-,?\s*$", "", chunk).strip()
                        if chunk and chunk not in rec["symptoms"]:
                            rec["symptoms"].append(chunk)

        if d_node:
            props = d_node.get("properties", {})
            disease_name = props.get("disease_name")
            if disease_name and disease_name not in rec["diseases"]:
                rec["diseases"].append(disease_name)

        if lt_node:
            props = lt_node.get("properties", {})
            test = props.get("test_name") or props.get("source_value")
            if test and test not in rec["labs"]:
                rec["labs"].append(test)

    # Group visits by specialty
    by_spec: dict[str, list] = defaultdict(list)
    for vid, rec in visits.items():
        spec = rec["specialty"] or "(Unknown specialty)"
        by_spec[spec].append(rec)

    specialties_out = []
    for spec, recs in sorted(by_spec.items(), key=lambda kv: (-len(kv[1]), kv[0])):
        recs_sorted = sorted(recs, key=lambda r: r["date"] or "")
        providers = sorted({r["provider_name"] for r in recs_sorted if r["provider_name"]})
        specialties_out.append({
            "specialty": spec,
            "n_visits": len(recs_sorted),
            "providers": providers,
            "first_date": recs_sorted[0]["date"],
            "last_date": recs_sorted[-1]["date"],
            "visits": recs_sorted,
        })

    all_dates = sorted({v["date"] for v in visits.values() if v["date"]})
    all_types = {v["type"] for v in visits.values() if v["type"]}

    return {
        "person_id": (patient_info or {}).get("person_id"),
        "age_band": (patient_info or {}).get("age_band"),
        "gender": (patient_info or {}).get("gender"),
        "is_active": (patient_info or {}).get("is_active"),
        "care_site_id": (patient_info or {}).get("care_site_id"),
        "visit_count_property": (patient_info or {}).get("visit_count"),
        "actual_visit_count": len(visits),
        "all_outpatient": all_types == {"Outpatient"},
        "visit_types": sorted(all_types),
        "first_visit_date": all_dates[0] if all_dates else None,
        "last_visit_date": all_dates[-1] if all_dates else None,
        "specialty_count": len(specialties_out),
        "specialties": specialties_out,
    }


def main():
    if len(sys.argv) < 2:
        print("usage: parse_patient_csv.py <csv-path> [<csv-path> ...]", file=sys.stderr)
        sys.exit(1)
    results = []
    for path_str in sys.argv[1:]:
        path = Path(path_str)
        if not path.exists():
            print(f"missing: {path}", file=sys.stderr)
            continue
        results.append(parse_csv(path))
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
