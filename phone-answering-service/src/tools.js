import { saveLead } from "./leads.js";
import { sendSms } from "./notifications.js";
import { availableProviders, createPaymentLink } from "./payments.js";

/**
 * The actions the agent can take during a call, beyond just talking.
 * Which tools a company's agent gets is driven entirely by that company's
 * company.json — so onboarding a new client never requires code changes.
 *
 *   book_callback      enabled when company.notify.smsNumbers is set
 *   send_payment_link  enabled when company.payments has a usable provider
 */

export function getToolsForCompany(company) {
  const tools = [];

  if (company.notify?.smsNumbers?.length) {
    tools.push({
      name: "book_callback",
      description:
        "Book a callback for the caller. Saves the lead and immediately notifies " +
        "the responsible team member by text message. Use once you have the " +
        "caller's name, best callback number, and the reason for their call.",
      input_schema: {
        type: "object",
        properties: {
          caller_name: { type: "string", description: "The caller's name" },
          callback_number: {
            type: "string",
            description:
              "Best number to call back, confirmed with the caller. Defaults to the number they are calling from if they say so.",
          },
          reason: { type: "string", description: "Short summary of what the caller needs" },
          preferred_time: {
            type: "string",
            description: "When the caller prefers to be called back, if they mentioned one",
          },
        },
        required: ["caller_name", "callback_number", "reason"],
      },
    });
  }

  if (availableProviders(company).length > 0) {
    tools.push({
      name: "send_payment_link",
      description:
        "Create a secure payment link and text it to the caller's mobile phone. " +
        "Use only after confirming the exact amount, what it is for, and which " +
        "payment provider the caller prefers (if more than one is available). " +
        "Never ask for card numbers over the phone.",
      input_schema: {
        type: "object",
        properties: {
          amount_dollars: { type: "number", description: "Amount to charge, in dollars" },
          description: {
            type: "string",
            description: "What the payment is for, shown on the checkout page",
          },
          phone_number: {
            type: "string",
            description:
              "Mobile number to text the link to. Defaults to the number the caller is calling from.",
          },
          provider: {
            type: "string",
            enum: ["square", "stripe"],
            description: "Payment provider to use, per the caller's preference",
          },
        },
        required: ["amount_dollars", "description"],
      },
    });
  }

  return tools;
}

/**
 * Runs a tool the agent asked for. Returns a plain-text result that goes
 * back to the agent so it can tell the caller what happened. Never throws —
 * failures come back as text so the agent can recover gracefully on the call.
 */
export async function executeTool(company, call, name, input) {
  try {
    if (name === "book_callback") return await runBookCallback(company, call, input);
    if (name === "send_payment_link") return await runSendPaymentLink(company, call, input);
    return `Unknown tool: ${name}`;
  } catch (err) {
    console.error(`Tool ${name} failed for ${company.id}: ${err.message}`);
    return `The action failed (${err.message}). Apologize to the caller and offer to have a team member follow up instead.`;
  }
}

async function runBookCallback(company, call, input) {
  const lead = {
    callerName: input.caller_name,
    callbackNumber: input.callback_number || call.from,
    reason: input.reason,
    preferredTime: input.preferred_time || "",
    callerId: call.from,
  };

  await saveLead(company, lead);

  const fromNumber = company.phoneNumbers[0];
  const message =
    `New callback request for ${company.name}:\n` +
    `${lead.callerName} — ${lead.callbackNumber}\n` +
    `Reason: ${lead.reason}` +
    (lead.preferredTime ? `\nPreferred time: ${lead.preferredTime}` : "");

  let notified = 0;
  for (const to of company.notify.smsNumbers) {
    if (await sendSms(fromNumber, to, message)) notified++;
  }

  return (
    `Callback booked for ${lead.callerName} at ${lead.callbackNumber}. ` +
    (notified > 0
      ? "The team has been notified by text."
      : "Saved, but the team text notification failed — reassure the caller a team member will still follow up.")
  );
}

async function runSendPaymentLink(company, call, input) {
  const p = company.payments || {};
  const maxAmount = p.maxAmountDollars || 2000;
  const amount = Number(input.amount_dollars);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Invalid amount. Confirm the exact dollar amount with the caller.";
  }
  if (amount > maxAmount) {
    return `Amount exceeds the $${maxAmount} phone-payment limit. Offer to book a callback so a team member can handle this payment.`;
  }

  const providers = availableProviders(company);
  const provider = input.provider && providers.includes(input.provider) ? input.provider : providers[0];
  if (!provider) return "No payment provider is configured for this company.";

  const url = await createPaymentLink(company, provider, amount, input.description);
  const to = input.phone_number || call.from;
  const sent = await sendSms(
    company.phoneNumbers[0],
    to,
    `${company.name}: here is your secure ${provider === "stripe" ? "Stripe" : "Square"} payment link for $${amount.toFixed(2)} — ${input.description}\n${url}`
  );

  if (!sent) {
    return "The payment link was created but the text message failed to send. Confirm the caller's mobile number and try again.";
  }
  return `Payment link for $${amount.toFixed(2)} sent by text to ${to} via ${provider}. Tell the caller to check their texts.`;
}
