// Velora data layer — public barrel.
//
// `lib/velora/` is the single source of truth for everything the
// Velora demo surface knows about: the per-patient OMOP-backed
// mocks, the canned-question router, the trend / follow-up
// registries, and the hospital-signed-guideline catalogue + admin
// selection persistence.
//
// Consumers should import from `@/lib/velora` (this barrel) rather
// than reach into individual files. The internal file shapes can
// change; the names exported below are the stable contract.
//
// See docs/velora/velora-data-layer.md for the full reference.

// ── V0 reply engine ─────────────────────────────────────────────
// The single entry point for the chat surface: takes a raw doctor
// message, decides whether it matches a Velora intent (cross-
// consultation brief, patient journey, recent trends, follow-up
// pivot), and returns a structured reply (text + rxOutput card)
// or null to let the legacy reply path handle it.
export { buildVeloraV0Reply } from "./v0-replies"

// ── Trend registry ──────────────────────────────────────────────
// Per-patient available-trend index, plus the lookup helpers the
// recent-trends handler uses to route specific-trend questions.
export {
  resolvePatientTrends,
  findTrendByQuestion,
  filterTrendsByCategory,
  detectTrendCategory,
} from "./v0-trends"
export type { TrendDef, TrendCategory, PatientTrendProfile } from "./v0-trends"

// ── Follow-up registry ──────────────────────────────────────────
// Inline pivot suggestions surfaced under each card (e.g. after
// the brief: "Show patient journey", "Show recent trends"). The
// reply engine consults this registry to attach `suggestions[]`
// to every reply.
export {
  getVeloraFollowUps,
  findVeloraFollowUp,
  parentIntentForCardKind,
} from "./v0-followups"

// ── Hospital-signed guideline registry ──────────────────────────
// Drives the admin sidebar (GuidelineSettingsSidebar) and the
// Stack 2 filter in the brief card. Localstorage-persisted.
export {
  GUIDELINE_CATALOGUE,
  SPECIALTY_LABELS,
  loadGuidelineSelection,
  saveGuidelineSelection,
  defaultSelection,
  isBodySigned,
} from "./guideline-registry"

// ── Sync context ────────────────────────────────────────────────
// Re-exports the RxPad sync provider under a Velora-named alias so
// the standalone homepage doesn't have to know the upstream name.
export { VeloraSyncProvider, useVeloraSync } from "./sync-context"
