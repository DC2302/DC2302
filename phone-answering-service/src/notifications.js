import twilio from "twilio";
import { config } from "./config.js";

/**
 * Sends SMS through Twilio — used to notify the responsible party about a
 * new callback request, and to text payment links to callers.
 *
 * Requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env. Messages are
 * sent "from" the company's own Twilio number, so clients' texts come from
 * the same number their customers already called.
 */

let client = null;

function getClient() {
  if (!config.twilioAccountSid || !config.twilioAuthToken) return null;
  if (!client) client = twilio(config.twilioAccountSid, config.twilioAuthToken);
  return client;
}

export async function sendSms(from, to, body) {
  const twilioClient = getClient();
  if (!twilioClient) {
    console.warn("SMS not sent (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not configured):", body);
    return false;
  }
  try {
    await twilioClient.messages.create({ from, to, body });
    return true;
  } catch (err) {
    console.error(`SMS to ${to} failed: ${err.message}`);
    return false;
  }
}
