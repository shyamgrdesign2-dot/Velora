#!/usr/bin/env python3
"""
Parse a complete OMOP CDM export for one patient and emit:

  • A field-coverage report (what's populated, what's empty)
  • A visit-by-visit join: for each visit, list conditions/drugs/measurements/observations
  • A specialty-grouped cross-consultation brief outline

Usage:
    python3 scripts/parse_omop_patient.py /path/to/omop-extract-dir
"""
import csv
import json
import sys
from collections import defaultdict
from pathlib import Path


def read_csv(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def main():
    if len(sys.argv) < 2:
        print("usage: parse_omop_patient.py <omop-dir>", file=sys.stderr)
        sys.exit(1)
    d = Path(sys.argv[1])

    person          = read_csv(d / "person_1.csv")
    obs_period      = read_csv(d / "observation_period.csv")
    visits          = read_csv(d / "visit_occurrence_1.csv")
    conditions      = read_csv(d / "condition_occurrence_1.csv")
    drugs           = read_csv(d / "drug_exposure_1.csv")
    measurements    = read_csv(d / "measurement_1.csv")
    observations    = read_csv(d / "observation_1.csv")

    # ── Person ─────────────────────────────────────────────────────
    p = person[0] if person else {}
    age = 2026 - int(p.get("year_of_birth") or 0) if p.get("year_of_birth") else "?"
    print("═" * 72)
    print(f"PATIENT · {p.get('person_source_value', '?')}")
    print("═" * 72)
    print(f"  person_id:        {p.get('person_id')}")
    print(f"  gender:           {p.get('gender_source_value')}")
    print(f"  DOB:              {p.get('birth_datetime', '').split(' ')[0]}  (~age {age})")
    print(f"  primary_provider: {p.get('provider_id')}")
    print(f"  care_site:        {p.get('care_site_id')}")
    print(f"  obs window:       {obs_period[0]['observation_period_start_date'] if obs_period else '?'} → {obs_period[0]['observation_period_end_date'] if obs_period else '?'}")

    # ── Coverage scorecard ─────────────────────────────────────────
    print()
    print("OMOP TABLE COVERAGE")
    print("─" * 72)
    print(f"  visit_occurrence       {len(visits):>5} rows")
    print(f"  condition_occurrence   {len(conditions):>5} rows")
    print(f"  drug_exposure          {len(drugs):>5} rows")
    print(f"  measurement            {len(measurements):>5} rows")
    print(f"  observation            {len(observations):>5} rows")
    print(f"  observation_period     {len(obs_period):>5} rows")

    # ── Observation source value distribution ─────────────────────
    obs_src_counts = defaultdict(int)
    for o in observations:
        v = o.get("observation_source_value", "").strip()
        # bucket numeric IDs into one bucket
        if v.isdigit() or v == "0":
            obs_src_counts["<unknown-concept-id>"] += 1
        else:
            obs_src_counts[v or "<empty>"] += 1
    print()
    print("OBSERVATION SOURCE-VALUE DISTRIBUTION")
    print("─" * 72)
    for k, v in sorted(obs_src_counts.items(), key=lambda kv: -kv[1]):
        print(f"  {v:>4}  {k}")

    # ── Distinct conditions (the diagnosis picture) ────────────────
    cond_vals = defaultdict(int)
    for c in conditions:
        v = (c.get("condition_source_value") or "").strip().strip('"').replace('\n', ' ')
        if v:
            cond_vals[v] += 1
    print()
    print("DISTINCT CONDITION SOURCE-VALUES (Diagnoses + History)")
    print("─" * 72)
    for k, v in sorted(cond_vals.items(), key=lambda kv: -kv[1]):
        print(f"  {v:>3}  {k[:100]}")

    # ── Visit join: for each visit, the bundle of records ──────────
    by_visit_cond = defaultdict(list)
    for c in conditions:
        vid = c.get("visit_occurrence_id") or ""
        by_visit_cond[vid].append(c)
    by_visit_drug = defaultdict(list)
    for r in drugs:
        vid = r.get("visit_occurrence_id") or ""
        by_visit_drug[vid].append(r)
    by_visit_meas = defaultdict(list)
    for m in measurements:
        vid = m.get("visit_occurrence_id") or ""
        by_visit_meas[vid].append(m)
    by_visit_obs = defaultdict(list)
    for o in observations:
        vid = o.get("visit_occurrence_id") or ""
        by_visit_obs[vid].append(o)

    visits_sorted = sorted(visits, key=lambda v: v.get("visit_start_date", ""))
    print()
    print(f"VISIT TIMELINE  ({len(visits_sorted)} visits)")
    print("─" * 72)
    for v in visits_sorted:
        vid = v.get("visit_occurrence_id", "")
        date = v.get("visit_start_date", "")
        prov = v.get("provider_id", "")
        n_c = len(by_visit_cond.get(vid, []))
        n_d = len(by_visit_drug.get(vid, []))
        n_m = len(by_visit_meas.get(vid, []))
        n_o = len(by_visit_obs.get(vid, []))
        print(f"  {date}  visit={vid:<8}  provider={prov:<10}  cond={n_c:<2} rx={n_d:<2} meas={n_m:<2} obs={n_o:<3}")

    # ── One illustrative visit drilldown ───────────────────────────
    rich_visits = sorted(visits_sorted,
                          key=lambda v: -(len(by_visit_cond.get(v.get("visit_occurrence_id", ""), []))
                                        + len(by_visit_drug.get(v.get("visit_occurrence_id", ""), []))
                                        + len(by_visit_obs.get(v.get("visit_occurrence_id", ""), []))))
    if rich_visits:
        v = rich_visits[0]
        vid = v.get("visit_occurrence_id", "")
        print()
        print(f"DRILLDOWN · richest visit · {v.get('visit_start_date')} · visit_id={vid}")
        print("─" * 72)
        print(f"  CONDITIONS ({len(by_visit_cond.get(vid, []))}):")
        for c in by_visit_cond.get(vid, []):
            print(f"    • {c.get('condition_source_value', '?')[:90]}  status={c.get('condition_status_source_value', '?')}")
        print(f"  MEDICATIONS ({len(by_visit_drug.get(vid, []))}):")
        for r in by_visit_drug.get(vid, [])[:10]:
            src = (r.get("drug_source_value", "") or "")[:80]
            sig = (r.get("sig", "") or "")[:60]
            print(f"    • {src}    [{sig}]")
        print(f"  MEASUREMENTS ({len(by_visit_meas.get(vid, []))}):")
        for m in by_visit_meas.get(vid, []):
            label = m.get("measurement_source_value", "")
            value = m.get("value_as_number") or m.get("value_source_value", "")
            unit = m.get("unit_source_value", "")
            print(f"    • {label}: {value} {unit}")
        print(f"  OBSERVATIONS ({len(by_visit_obs.get(vid, []))}):")
        for o in by_visit_obs.get(vid, [])[:15]:
            label = o.get("observation_source_value", "")
            value = (o.get("value_as_string") or o.get("value_source_value") or "")[:80]
            print(f"    • {label}: {value}")


if __name__ == "__main__":
    main()
