/**
 * Sends a summary of a finished call to the company's CRM.
 *
 * This uses a generic webhook so it works with almost any CRM without
 * custom code: HubSpot (via workflows), GoHighLevel (inbound webhook),
 * Zoho (webhook), or Zapier/Make as glue to anything else.
 *
 * Set `crmWebhookUrl` in the company's company.json to enable it.
 */

export async function postToCrm(company, payload) {
  if (!company?.crmWebhookUrl) return;
  try {
    const res = await fetch(company.crmWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(`CRM webhook for ${company.id} returned ${res.status}`);
    }
  } catch (err) {
    console.error(`CRM webhook for ${company.id} failed: ${err.message}`);
  }
}

export async function logCallToCrm(callSid, call) {
  const transcript = call.history
    .map((turn) => `${turn.role === "user" ? "Caller" : "Agent"}: ${turn.content}`)
    .join("\n");

  await postToCrm(call.company, {
    event: "call.completed",
    callSid,
    company: call.company.id,
    companyName: call.company.name,
    callerNumber: call.from,
    startedAt: call.startedAt.toISOString(),
    endedAt: new Date().toISOString(),
    actions: call.actions || [],
    transcript,
  });
}
