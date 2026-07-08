/**
 * Sends a summary of a finished call to the company's CRM.
 *
 * This uses a generic webhook so it works with almost any CRM without
 * custom code: HubSpot (via workflows), GoHighLevel (inbound webhook),
 * Zoho (webhook), or Zapier/Make as glue to anything else.
 *
 * Set `crmWebhookUrl` in the company's company.json to enable it.
 */

export async function logCallToCrm(callSid, call) {
  if (!call?.company?.crmWebhookUrl) return;

  const transcript = call.history
    .map((turn) => `${turn.role === "user" ? "Caller" : "Agent"}: ${turn.content}`)
    .join("\n");

  const payload = {
    event: "call.completed",
    callSid,
    company: call.company.id,
    companyName: call.company.name,
    callerNumber: call.from,
    startedAt: call.startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    transcript,
  };

  try {
    const res = await fetch(call.company.crmWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`CRM webhook for ${call.company.id} returned ${res.status}`);
    }
  } catch (err) {
    console.error(`CRM webhook for ${call.company.id} failed: ${err.message}`);
  }
}
