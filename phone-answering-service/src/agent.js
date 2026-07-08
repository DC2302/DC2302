import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";
import { loadKnowledge } from "./knowledge.js";
import { getToolsForCompany, executeTool } from "./tools.js";
import { availableProviders } from "./payments.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const MAX_TOOL_ROUNDS = 5;

function buildSystemPrompt(company, tools) {
  const knowledge = loadKnowledge(company);
  const providers = availableProviders(company);
  const toolNames = tools.map((t) => t.name);

  const lines = [
    `You are a friendly, professional phone receptionist answering calls for ${company.name}.`,
    "You are speaking with a caller on the phone, so:",
    "- Keep answers short and conversational — one to three sentences. No lists, no markdown, no emoji.",
    "- Spell out anything a text-to-speech voice could mangle (say numbers and hours naturally).",
    "- Answer ONLY from the company training materials below. If the answer is not in the materials, say you are not sure and offer a callback so a team member can follow up.",
    "- Never invent prices, policies, availability, or medical/legal advice.",
  ];

  if (toolNames.includes("book_callback")) {
    lines.push(
      "- To book a callback: collect the caller's name, their best callback number (read it back to confirm), and the reason for the call, then use the book_callback tool. Afterwards, tell them when to expect a call back if the materials say so."
    );
  }
  if (toolNames.includes("send_payment_link")) {
    lines.push(
      `- To take a payment: confirm the exact dollar amount and what it is for${
        providers.length > 1
          ? `, ask whether they prefer ${providers.join(" or ")}`
          : ""
      }, and confirm the mobile number to text the link to. Then use the send_payment_link tool. NEVER ask for card numbers over the phone.`,
      "- Only charge amounts that come from the training materials or that the caller explicitly agrees to."
    );
  }

  lines.push(
    company.transferNumber
      ? "- If the caller asks for a human or is upset, tell them you will transfer them, and include the exact token [TRANSFER] at the very end of your reply."
      : "- If the caller asks for a human, offer to book a callback instead.",
    "- When the caller is done, thank them for calling and include the exact token [HANGUP] at the very end of your reply.",
    "",
    `# ${company.name} — Training materials`,
    "",
    knowledge
  );

  return lines.join("\n");
}

/**
 * Ask the agent for its next spoken reply, running any tools it requests
 * (booking callbacks, sending payment links) along the way.
 *
 * `call` is the in-progress call state from calls.js. Its `history` holds
 * the spoken transcript; tool activity is recorded in `call.actions` so it
 * shows up in the CRM log.
 *
 * Returns { text, action } where action is "continue" | "transfer" | "hangup".
 */
export async function getAgentReply(company, call) {
  const tools = getToolsForCompany(company);
  const system = buildSystemPrompt(company, tools);

  // Local working copy: the tool-use back-and-forth stays out of the
  // spoken transcript in call.history.
  const messages = call.history.map((turn) => ({ role: turn.role, content: turn.content }));

  let text = "";
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: config.claudeModel,
      max_tokens: 400,
      system,
      messages,
      ...(tools.length ? { tools } : {}),
    });

    text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    if (response.stop_reason !== "tool_use") break;

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(company, call, block.name, block.input);
      call.actions = call.actions || [];
      call.actions.push({ tool: block.name, input: block.input, result });
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      });
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });
  }

  let action = "continue";
  if (text.includes("[TRANSFER]")) action = "transfer";
  else if (text.includes("[HANGUP]")) action = "hangup";
  text = text.replaceAll("[TRANSFER]", "").replaceAll("[HANGUP]", "").trim();

  if (!text) text = "All right, is there anything else I can help you with?";

  return { text, action };
}
