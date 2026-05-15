// Velora chrome — public barrel.
//
// Standalone surface-only components: the things the homepage
// renders OUTSIDE the embedded EMR usage of DrAgentPanel. The
// brief / journey / trend cards still live under
// components/tp-rxpad/dr-agent/cards/velora-v0/ because they're
// rendered by the shared CardRenderer dispatch — see
// docs/velora/velora-cards-catalog.md for the card catalogue.
//
// Consumers should import from `@/components/velora` rather than
// reach into individual files.

export { LoginScreen } from "./LoginScreen"
export { default as AnimatedGrid } from "./AnimatedGrid"
