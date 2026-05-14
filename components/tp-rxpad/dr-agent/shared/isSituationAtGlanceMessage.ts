import type { RxAgentChatMessage } from "../types"

/** Intro line for the quick clinical snapshot / text_quote card */
export const SITUATION_AT_A_GLANCE_ASSISTANT_TEXT = "Here's the situation at a glance."

/** True for assistant messages that should show inline canned pills directly below their bubble.
 *  Everything else pipes suggestions into the PillBar above the input box instead.
 *  Keep this list tight — only messages that act as an "entry point" belong here. */
export function isSituationAtGlanceAssistantMessage(message: RxAgentChatMessage): boolean {
  if (message.role !== "assistant") return false

  // Classic "situation at a glance" (text_quote)
  if (
    message.text?.trim() === SITUATION_AT_A_GLANCE_ASSISTANT_TEXT &&
    message.rxOutput?.kind === "text_quote"
  ) {
    return true
  }

  // Velora entry card only — subsequent Velora messages feed the PillBar.
  if (message.rxOutput?.kind === "velora_brief") {
    return true
  }

  // Velora v0 standalone replies — text_quote whose footer carries the validation
  // contract ("Show Cypher" in the source line). Lets the 5 intent replies show
  // their inline follow-up suggestions directly under the bubble.
  if (
    message.rxOutput?.kind === "text_quote" &&
    typeof message.rxOutput.data?.source === "string" &&
    message.rxOutput.data.source.includes("Show Cypher")
  ) {
    return true
  }

  // Velora v0 — the three live intents + the trend-detail card.
  // Inline follow-up pills surface directly under each card.
  if (
    message.rxOutput?.kind === "velora_v0_mdt_brief" ||
    message.rxOutput?.kind === "velora_v0_patient_journey" ||
    message.rxOutput?.kind === "velora_v0_trend_menu" ||
    message.rxOutput?.kind === "velora_v0_trend_detail"
  ) {
    return true
  }

  return false
}
