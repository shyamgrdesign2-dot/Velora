# Cross-consultation brief · base archetype

> **A developer-facing skeleton.** No mock data. No patient names. No clinical
> content. Just the structural anatomy of the card, where each field comes
> from, how it renders, and what optionality looks like.
>
> When you need to support a new patient or a new intent, this is the
> reference. Copy the schema, fill in the slots from a real OMOP export.

---

## 1 · Purpose

The cross-consultation brief answers **four questions** a clinician asks when
they open a complex patient cold:

```
  ┌─ ① Who is this patient?              → Section · Medical history
  ├─ ② Who has been involved, and        → Section · Specialty consultations
  │      what is each team thinking?
  ├─ ③ What demands attention?           → Section · Where they collide
  └─ ④ How do I trust this?              → Inline ⓘ tooltips + Open loops
                                            + Section · Guideline anchors
```

Every visible row is **OMOP-row-attributed**. Anything that's *captured upstream
but not rendered* surfaces via a tooltip or an amber "Open loops" block — so
absence is always visible, never silent.

---

## 2 · Anatomy · full-card ASCII wireframe

```
╔═══════════════════════════════════════════════════════════════════════════╗
║  ⚕  Cross-consultation brief                                              ║
║  {patientName} · {gender} · {age}                                         ║
║                                                                           ║
║  Data sources: Visit × Provider · Note metadata · Drug Exposure × Provider║
║                · Referral × Visit                                         ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  {N} specialties touched this patient in the last {windowDays} days.      ║
║                                                                           ║
║  ┌─ MEDICAL HISTORY ─────────────────────────────────────────────────┐    ║
║  │                                                                   │    ║
║  │  [Primary problem ⓘ]      ← tag chip, red tone                    │    ║
║  │    • {item} | {item} | {item}    ← one bullet, pipe-divided      │    ║
║  │                                                                   │    ║
║  │  [Co-morbidities ⓘ]       ← tag chip, slate tone                  │    ║
║  │    • {item} | {item} | {item} | …                                 │    ║
║  │                                                                   │    ║
║  │  [Surgical history ⓘ]     ← tag chip, slate tone                  │    ║
║  │    • {item} ({date}) | {item}                                     │    ║
║  │                                                                   │    ║
║  │  [Allergies & safety ⓘ]   ← tag chip, green tone                  │    ║
║  │    • {explicit negative} (verified ×N) | {explicit negative}     │    ║
║  │                                                                   │    ║
║  │  [Family / Social ⓘ]      ← tag chip, green tone                  │    ║
║  │    • {item} | {item}                                              │    ║
║  └───────────────────────────────────────────────────────────────────┘    ║
║                                                                           ║
║  ┌─ SPECIALTY CONSULTATIONS · repeat per team ───────────────────────┐    ║
║  │                                                                   │    ║
║  │  [icon] {Specialty}        {dateRange} · {N} visits · {drs} · ⓘ   │    ║
║  │                                                                   │    ║
║  │    • [FINDINGS]      {value} | {value} | {value}                  │    ║
║  │    • [MEDICATIONS]   {value} | {value}    ← hidden if no ongoing ║
║  │    • [PLAN]          {value} | {value} | {value}                  │    ║
║  │                                                                   │    ║
║  │  ┌─ ⚠ OPEN LOOPS ON THIS SPECIALTY ─────────────────────────┐    │    ║
║  │  │  • {missing data / overdue / no-result investigation}     │    │    ║
║  │  │  • {guideline-anchored gap}                               │    │    ║
║  │  └───────────────────────────────────────────────────────────┘    │    ║
║  └───────────────────────────────────────────────────────────────────┘    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════════════════════════════╗
║  ⬢  Clinical synthesis                                                    ║
║  Cross-team interpretation · {patientName} · {gender} · {age}             ║
║                                                                           ║
║  Data sources: DDI rule-base · Guideline panels · Note metadata           ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  ┌─ ⚠ WHERE THEY COLLIDE · {N} detector fires ─────────────────────┐    ║
║  │                                                                   │    ║
║  │  ┌─ [DDI flag]   {title with **bolded drug pair**}    [chip] ─┐  │    ║
║  │  │    • {point}                                                │  │    ║
║  │  │    • {point}                                                │  │    ║
║  │  └───────────────────────────────────────────────────────────────┘  │    ║
║  │                                                                   │    ║
║  │  ┌─ [Coordination gap]   {title}                       [chip] ─┐  │    ║
║  │  │    • {point}                                                │  │    ║
║  │  └───────────────────────────────────────────────────────────────┘  │    ║
║  └───────────────────────────────────────────────────────────────────┘    ║
║                                                                           ║
║  [icon] {Guideline panel title}                          [Rule chip]      ║
║    • {Label} : {value with optional tone}        ← FlagArrow if abnormal ║
║    • {Label} : {value}                                                    ║
║                                                                           ║
║  [icon] Pending MDT                                                       ║
║    • {item}                                                               ║
║    • {item}                                                               ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 3 · Header strip · what goes where

```
{patientName} · {gender} · {age}
```

| Field | Type | OMOP source | Notes |
|---|---|---|---|
| `patientName` | string · required | `person.person_source_value` resolved through anonymisation layer | Display name; PHI not surfaced |
| `patientGender` | "M" \| "F" · optional | `person.gender_source_value` | Renders as single letter "M" / "F" |
| `patientAge` | number \| string · optional | derived from `person.birth_datetime` | Exact age, not band |
| `patientMobile` | string · optional | `observation.patient_demographic_contact_no` | **NOT shown on card.** Lives in PatientSelector dropdown only |
| `patientId` | string · optional | `person.person_id` | **NOT shown on card.** PatientSelector only |
| `patientMeta` | string · required (legacy fallback) | concatenated string for older mocks | Used when structured fields absent |

> **Render rule** · `formatPatientStrip(data)` joins the present optional fields
> with " · ". Mobile + ID are intentionally excluded — they live in the
> PatientSelector bottom sheet so the card stays compact.

---

## 4 · Medical history · per group

```
[Group title ⓘ]    ← tone-tinted tag chip
  • {item} | {item} | {item}    ← one bullet; HighlightLine renders pipes
```

### Schema · one `VeloraV0MedicalHistoryGroup` per sub-section

```ts
{
  title:      string                          // "Primary problem", "Co-morbidities", etc.
  tone:       "primary" | "neutral" | "positive"
  items: [
    { text:  string }                         // markdown-bold via **…**
    …
  ]
  sources: [
    { doctor: string, date: string }          // one row per contributing OMOP visit
    …
  ]
  reasoning:  string                          // why this group is here at all
}
```

### Conventional sub-sections (in render order)

| # | `title` | `tone` | What goes in `items` |
|---|---|---|---|
| 1 | Primary problem | `primary` (red) | The headline diagnosis · the recurrence signal · the active oncological / cardiological / neurological problem driving the case |
| 2 | Co-morbidities | `neutral` (slate) | Chronic conditions recorded as Active in `condition_occurrence` |
| 3 | Surgical history | `neutral` (slate) | Past procedures · pattern: `**Name** (Date)` |
| 4 | Allergies & safety | `positive` (green) | Explicit-negative verifications surfaced as data, not gaps |
| 5 | Family / Social history | `positive` (green) | "No significant…" or specific findings |

### What sub-sections to OMIT

- **"Acute episodes"** — belongs in the patient-journey timeline, not the
  chronic-context section. Surfacing transient events here muddied the read.
- Any group with zero items — just omit; never render an empty group.

### Tone styling

```
primary  →  red chip      ·  bg-tp-error-50 / text-tp-error-700
neutral  →  slate chip    ·  bg-tp-slate-100 / text-tp-slate-700
positive →  green chip    ·  bg-tp-success-50 / text-tp-success-700
```

### The ⓘ tooltip (per tag)

```
SOURCES ({count})
  • {doctor} ({specialty}) · {date}
  • {doctor} ({specialty}) · {date}
  • … (capped at 6 visible; "+ N more" appears for overflow)

WHY THIS MATTERS
  {reasoning sentence}
```

---

## 5 · Specialty consultation card · per team

```
[icon] {Specialty}           {dateRange} · {N} visits · {drs} · ⓘ
  • [FINDINGS]      {pipe-divided content}
  • [MEDICATIONS]   {pipe-divided ongoing-only content}     ← optional
  • [PLAN]          {pipe-divided content}

  ⚠ OPEN LOOPS · {amber block, optional}
```

### Schema · one `VeloraV0Attribution` per specialty

```ts
{
  source: {
    specialty: string                          // header label
    author:    string                          // primary doctor (legacy)
    date:      string                          // most-recent visit date (ISO)
    sourceId?: string                          // optional Rx / visit identifier
  }
  reason:                 string               // why Velora picked this specialty
  dateRangeLabel?:        string               // "8 May → 30 Sep '25"   ← header
  consultationCount?:     number               // "12"  → "12 visits"    ← header
  doctorsLabel?:          string               // "Dr X / Dr Y"          ← header
  lines: [
    "**Findings**: {pipe-divided content}",
    "**Medications**: {pipe-divided content}",   // omit if no ongoing meds
    "**Plan**: {pipe-divided content}",
  ]
  openLoops?: [
    string,   // one short sentence per loop
    …
  ]
}
```

### Header trailing · render rules

When `dateRangeLabel || consultationCount || doctorsLabel` is present,
trailing renders as a compact joined string (` · ` separator) + ⓘ. The ⓘ
opens a `SourceInfoTip` with the full attribution + Velora's selection reason.

Otherwise falls back to legacy `(shortDate(source.date))` + ⓘ.

### Body · render rules

Each entry in `lines` is parsed for the leading `**Label**:` chip. The label
renders as an uppercase pill (`Findings` / `Medications` / `Plan`); the content
flows as inline text after the chip on the same line, with `|` characters
rendered as styled `PipeDivider` glyphs (slate-200 vertical bar).

**Conditional hide:** when a `Medications` row's content begins with the
literal phrase "No ongoing" (case-insensitive), the entire row is dropped —
not rendered as "Medications: none". Saying nothing is louder than saying
nothing.

### Open loops · render rules

Renders ONLY when `openLoops.length > 0`. Amber-tinted block with a 🚩 flag
header and one bullet per loop. The block sits at the bottom of the specialty
body, attached visually but tonally distinct.

---

## 6 · Clinical synthesis card (Stack 2) · per panel

### Schema · `VeloraV0Synthesis`

```ts
{
  panelTitle: string                           // section heading
  guideline:  {
    body:        string                        // "NCCN", "ESC", "NICE", …
    year?:       string
    section?:    string                        // "§SURV-2"
    description?: string                      // tooltip body
    fetches?:    string                       // tooltip body
  }
  rows: [
    {
      label:    string                         // e.g. "Months since last contact"
      value:    string                         // computed value
      ref?:     string                         // tooltip — derivation
      tone?:    "ok" | "warn" | "alert"
    }
    …
  ]
  note?: string                                // panel-level rationale (deep-dive only)
}
```

### Where they collide · `VeloraV0CollideEntry[]`

```ts
{
  kind:   "ddi" | "coordination-gap"
  title:  string                               // headline with bolded drug pair
  points: string[]                             // bullets under the headline
  rule:   VeloraV0Guideline                    // chip on the right
}
```

Renders top-of-card under an amber "Where they collide" banner with a count
badge. Each entry is its own white-on-amber card.

### Pending MDT · `string[]`

Flat list. Renders below the collisions + synthesis panels with an emergency
icon header.

---

## 7 · Trust contract · the no-data-loss layer

Three concentric mechanisms, in order of granularity:

### 7.1 · Header attribution (Stack 1, every specialty)

The compact `dateRange · N visits · doctors` trailing shows the doctor
**exactly how much evidence backs the synthesis** before they read a word of
the body. If they disagree, they know how many records to audit.

### 7.2 · Group source tooltip (Stack 1, every medical-history tag)

Hover the ⓘ on any sub-heading tag → portal-rendered tooltip with:

```
SOURCES (N)
  • doctor · date
  • …

WHY THIS MATTERS
  reasoning sentence
```

This replaces the legacy "N rows" inline caption — same evidence-strength
signal, less visual clutter, richer detail when requested.

### 7.3 · Open loops block (Stack 1, every specialty body)

Amber-tinted block surfacing:

- **Captured upstream but not shown** — what the deep-dive will have more of
- **Missing from upstream entirely** — investigations advised with no result
- **Guideline-anchored gaps** — overdue surveillance, NSAID-on-DAPT, etc.

---

## 8 · Data flow · OMOP → mock → UI

```
┌────────────────────┐
│  Source HMIS DBs   │  Pm-Casemanager · Pm-PatientMaster · Pm-Vital ·
│  (MySQL + Mongo)   │  Pm-medicalHistory · Pm-Patient-Docs · Pm-IPD ·
└─────────┬──────────┘  Pm-Growth-Chart
          │
          │  omop_etl/transform.py
          ▼
┌────────────────────┐
│  OMOP CDM v5.4     │  person · visit_occurrence · condition_occurrence ·
│  (PostgreSQL)      │  drug_exposure · measurement · observation · note
└─────────┬──────────┘
          │
          │  scripts/parse_omop_patient.py  (per patient)
          ▼
┌────────────────────────────────────────────────────────────────┐
│  VeloraV0MdtBriefData mock                                     │
│  ──────────────────────────────────────────────────────────    │
│  patientName     ←  anonymised display name                    │
│  patientGender   ←  person.gender_source_value                 │
│  patientAge      ←  derived from person.birth_datetime          │
│  patientMobile   ←  observation.patient_demographic_contact_no  │
│  patientId       ←  person.person_id                            │
│                                                                │
│  medicalHistory  ←  GROUPED condition_occurrence rows with     │
│                      sources + reasoning derived from the      │
│                      condition_source_value + visit metadata   │
│                                                                │
│  specialties     ←  GROUPED visit_occurrence rows joined by    │
│                      provider_id → specialty lookup, each      │
│                      carrying:                                 │
│                        Findings  ← condition_occurrence +      │
│                                     observation.symptoms_text  │
│                                     + observation.examination  │
│                        Meds      ← drug_exposure where         │
│                                     drug_exposure_end_date ≥   │
│                                     today (ongoing-only)       │
│                        Plan      ← observation.followup_date + │
│                                     investigation_text + advice│
│                                                                │
│  collisions      ←  derived by class-based detectors over the  │
│                      condition + drug + visit join             │
│                                                                │
│  syntheses       ←  computed from rules in collisions's        │
│                      cited guidelines + values from            │
│                      measurement / condition / drug rows       │
│                                                                │
│  pendingMdtItems ←  detector recommendations not yet actioned  │
└─────────────────┬──────────────────────────────────────────────┘
                  │
                  │  v0-replies.ts router · keyword match
                  ▼
┌────────────────────────────────────────────────────────────────┐
│  Chat surface · VeloraV0MdtBriefCard renders Stack 1 + Stack 2 │
└────────────────────────────────────────────────────────────────┘
```

---

## 9 · Implementation pointers

| Concern | Code location |
|---|---|
| Type definitions | `components/tp-rxpad/dr-agent/types.ts` — `VeloraV0MdtBriefData`, `VeloraV0Attribution`, `VeloraV0MedicalHistoryGroup`, `VeloraV0Synthesis`, `VeloraV0CollideEntry`, `VeloraV0Guideline` |
| Card render | `components/tp-rxpad/dr-agent/cards/velora-v0/VeloraV0MdtBriefCard.tsx` |
| Pipe + bold rendering | `cards/velora-v0/highlight.tsx` — `HighlightLine`, `PipeDivider` |
| Group source tooltip | inline `GroupSourceTip` in the card file |
| Specialty header trailing | inline `HeaderTrailing` in the card file |
| Mock factory (per patient) | `lib/velora/v0-replies.ts` — `SURESH_PATEL_BRIEF_MOCK`, future siblings |
| Chat routing | `lib/velora/v0-replies.ts` — keyword match by patient name |
| Patient catalogue | `components/tp-rxpad/dr-agent/constants.ts` — `RX_CONTEXT_OPTIONS` |
| Patient summary stub | `components/tp-rxpad/dr-agent/mock-data.ts` — `SMART_SUMMARY_BY_CONTEXT` |
| V0 patient ID gate | `components/tp-rxpad/dr-agent/velora/velora-patients.ts` — `VELORA_V0_PATIENT_IDS` |
| OMOP source mapping | `/Users/shyamsundar/Documents/Archive*.zip` + `docs/OMOP_MAPPING_DOCUMENTATION` (uploaded) |

---

## 10 · How to add a new patient

1. **Export OMOP data** for the new `person_id` → 7 CSV files
   (`person · observation_period · visit_occurrence · condition_occurrence ·
   drug_exposure · measurement · observation`).
2. **Run `scripts/parse_omop_patient.py`** on the export directory to inspect
   the structured data + identify the clinical story.
3. **Write a per-patient MD** under `docs/velora-patients/P{N}-{name}-{personId}.md`
   following the existing patient docs.
4. **Add to `RX_CONTEXT_OPTIONS`** (`constants.ts`) — anonymised label + meta
   string in the format `{gender}, {age}y · {mobile} · {personId}`.
5. **Add a stub to `SMART_SUMMARY_BY_CONTEXT`** (`mock-data.ts`) — minimal
   `patientNarrative` + `chronicConditions`; the rest can be `[]`.
6. **Add the ID to `VELORA_V0_PATIENT_IDS`** (`velora-patients.ts`).
7. **Write the full mock** in `lib/velora/v0-replies.ts` following the
   `SURESH_PATEL_BRIEF_MOCK` shape — medicalHistory + specialties + collisions
   + syntheses + pendingMdtItems.
8. **Route in `v0-replies.ts`** — add a keyword branch matching the patient
   name, returning the new mock.
9. **Typecheck** · `npx tsc --noEmit`. Zero new errors expected.

---

## 11 · What's NOT in this archetype (intentional gaps)

- **No concrete patient names** — see `docs/velora-patients/P1…P5*.md` for the
  worked examples.
- **No concrete drug lists or guideline citations** — those are per-patient.
- **No raw OMOP row IDs** — the archetype is structural; row-attribution lives
  on the rendered card's tooltips.
- **No Stack 2 panel content templates** — each guideline's panel structure
  is intentionally bespoke (CHA₂DS₂-VASc rows look nothing like NCCN
  surveillance rows). Build per intent.
- **No deep-dive documentation page schema** — that's covered separately in
  `components/dr-agent-design-system/velora-v0/MdtBriefDeepDivePage.tsx`.

---

*Living document. When the schema changes, update this file in the same PR.
The card's render code is authoritative; this document mirrors it.*
