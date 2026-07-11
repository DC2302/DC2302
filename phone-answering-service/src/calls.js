/**
 * In-memory state for calls that are currently in progress, keyed by
 * Twilio's CallSid. Holds the conversation history so the agent remembers
 * what was already said during the call.
 *
 * Note: this is fine for a single server. If you ever run multiple server
 * instances, move this to a shared store like Redis.
 */

const calls = new Map(); // callSid -> { company, history, startedAt, from }

const MAX_AGE_MS = 30 * 60 * 1000; // clean up calls older than 30 minutes

export function startCall(callSid, company, from) {
  const call = { company, history: [], startedAt: new Date(), from, lang: "en" };
  calls.set(callSid, call);
  cleanup();
  return call;
}

export function getCall(callSid) {
  return calls.get(callSid) || null;
}

export function endCall(callSid) {
  const call = calls.get(callSid);
  calls.delete(callSid);
  return call || null;
}

function cleanup() {
  const now = Date.now();
  for (const [sid, call] of calls) {
    if (now - call.startedAt.getTime() > MAX_AGE_MS) calls.delete(sid);
  }
}
