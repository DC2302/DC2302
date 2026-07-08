import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { loadKnowledge } from "./knowledge.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

function buildSystemPrompt(company) {
  const knowledge = loadKnowledge(company);
  return [
    `You are a friendly, professional phone receptionist answering calls for ${company.name}.`,
    "You are speaking with a caller on the phone, so:",
    "- Keep answers short and conversational — one to three sentences. No lists, no markdown, no emoji.",
    "- Spell out anything a text-to-speech voice could mangle (say numbers and hours naturally).",
    "- Answer ONLY from the company training materials below. If the answer is not in the materials, say you are not sure and offer to take a message so a team member can follow up.",
    "- Never invent prices, policies, availability, or medical/legal advice.",
    company.transferNumber
      ? "- If the caller asks for a human or is upset, tell them you will transfer them, and include the exact token [TRANSFER] at the very end of your reply."
      : "- If the caller asks for a human, offer to take a message with their name and number.",
    "- When the caller is done, thank them for calling and include the exact token [HANGUP] at the very end of your reply.",
    "",
    `# ${company.name} — Training materials`,
    "",
    knowledge,
  ].join("\n");
}

/**
 * Ask the agent for its next spoken reply.
 * `history` is the running conversation: [{ role: "user"|"assistant", content }]
 * Returns { text, action } where action is "continue" | "transfer" | "hangup".
 */
export async function getAgentReply(company, history) {
  const response = await anthropic.messages.create({
    model: config.claudeModel,
    max_tokens: 300,
    system: buildSystemPrompt(company),
    messages: history,
  });

  let text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join(" ")
    .trim();

  let action = "continue";
  if (text.includes("[TRANSFER]")) action = "transfer";
  else if (text.includes("[HANGUP]")) action = "hangup";
  text = text.replaceAll("[TRANSFER]", "").replaceAll("[HANGUP]", "").trim();

  return { text, action };
}
