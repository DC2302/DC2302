import express from "express";
import twilio from "twilio";
import { config, assertConfig } from "./config.js";
import { findCompanyByNumber, reloadCompanies } from "./companies.js";
import { getAgentReply } from "./agent.js";
import { startCall, getCall, endCall } from "./calls.js";
import { logCallToCrm } from "./crm.js";
import { webpay } from "./webpay.js";

assertConfig();

const app = express();
app.use(express.urlencoded({ extended: false }));

// Hosted payment pages (/p/<companyId>) — linked from each client's
// website and Google Business Profile.
app.use(webpay);

const { VoiceResponse } = twilio.twiml;

// Rejects requests that aren't genuinely from Twilio (skipped if no auth
// token is configured, so local testing with curl still works).
function validateTwilio(req, res, next) {
  if (!config.twilioAuthToken || !config.publicBaseUrl) return next();
  const url = new URL(req.originalUrl, config.publicBaseUrl).toString();
  const valid = twilio.validateRequest(
    config.twilioAuthToken,
    req.headers["x-twilio-signature"] || "",
    url,
    req.body
  );
  if (!valid) return res.status(403).send("Invalid Twilio signature");
  next();
}

function gather(twiml, company) {
  return twiml.gather({
    input: "speech",
    action: "/respond",
    method: "POST",
    speechTimeout: "auto",
    language: company.language,
  });
}

function say(node, company, text) {
  node.say({ voice: company.voice, language: company.language }, text);
}

// Step 1 — Twilio hits this when a call comes in.
// Point each Twilio phone number's "A call comes in" webhook at POST /voice.
app.post("/voice", validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  const company = findCompanyByNumber(req.body.To);

  if (!company) {
    twiml.say("Sorry, this number is not configured yet. Goodbye.");
    twiml.hangup();
  } else {
    startCall(req.body.CallSid, company, req.body.From);
    const g = gather(twiml, company);
    say(g, company, company.greeting);
    // If the caller says nothing, ask again instead of dropping the call.
    twiml.redirect({ method: "POST" }, "/voice");
  }

  res.type("text/xml").send(twiml.toString());
});

// Step 2 — Twilio sends us what the caller said; we answer with Claude.
app.post("/respond", validateTwilio, async (req, res) => {
  const twiml = new VoiceResponse();
  const call = getCall(req.body.CallSid);

  if (!call) {
    twiml.say("Sorry, something went wrong. Please call back. Goodbye.");
    twiml.hangup();
    return res.type("text/xml").send(twiml.toString());
  }

  const { company } = call;
  const speech = (req.body.SpeechResult || "").trim();

  if (!speech) {
    const g = gather(twiml, company);
    say(g, company, "Sorry, I didn't catch that. Could you say it again?");
    return res.type("text/xml").send(twiml.toString());
  }

  call.history.push({ role: "user", content: speech });

  try {
    const { text, action } = await getAgentReply(company, call);
    call.history.push({ role: "assistant", content: text });

    if (action === "transfer" && company.transferNumber) {
      say(twiml, company, text);
      twiml.dial(company.transferNumber);
    } else if (action === "hangup") {
      say(twiml, company, text);
      twiml.hangup();
    } else {
      const g = gather(twiml, company);
      say(g, company, text);
      twiml.redirect({ method: "POST" }, "/respond");
    }
  } catch (err) {
    console.error(`Agent error on call ${req.body.CallSid}:`, err);
    say(
      twiml,
      company,
      "I'm sorry, I'm having trouble right now. Please call back in a few minutes."
    );
    twiml.hangup();
  }

  res.type("text/xml").send(twiml.toString());
});

// Step 3 — Twilio tells us the call ended; we log it to the company's CRM.
// Set each number's "Call status changes" webhook to POST /call-status.
app.post("/call-status", validateTwilio, async (req, res) => {
  if (req.body.CallStatus === "completed") {
    const call = endCall(req.body.CallSid);
    if (call) await logCallToCrm(req.body.CallSid, call);
  }
  res.sendStatus(204);
});

// Reload company folders without restarting (call after adding a client).
app.post("/admin/reload", (req, res) => {
  const count = reloadCompanies();
  res.json({ ok: true, phoneNumbersConfigured: count });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(config.port, () => {
  const count = reloadCompanies();
  console.log(
    `Phone answering service listening on port ${config.port} — ` +
      `${count} phone number(s) configured.`
  );
});
