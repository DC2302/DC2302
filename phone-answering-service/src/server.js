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
  if (!valid) {
    console.warn(
      `Rejected webhook ${req.originalUrl}: Twilio signature check failed. ` +
        "If this happens on every call, TWILIO_AUTH_TOKEN or PUBLIC_BASE_URL is wrong."
    );
    return res.status(403).send("Invalid Twilio signature");
  }
  next();
}

// Looks up the in-progress call, or reconstructs it from the webhook body —
// the server restarts on every deploy and must not error live calls that
// started before the restart.
function ensureCall(req) {
  const existing = getCall(req.body.CallSid);
  if (existing) return existing;
  const company = findCompanyByNumber(req.body.To);
  if (!company) return null;
  return startCall(req.body.CallSid, company, req.body.From);
}

// Per-call language: calls start in the company's primary language and can
// switch to Spanish (if configured) when the caller asks for it.
function langConfig(company, call) {
  if (call?.lang === "es" && company.spanish) {
    return {
      language: company.spanish.language || "es-MX",
      voice: company.spanish.voice || "Polly.Mia-Neural",
    };
  }
  return { language: company.language, voice: company.voice };
}

function gather(twiml, company, call) {
  return twiml.gather({
    input: "speech",
    action: "/respond",
    method: "POST",
    speechTimeout: "auto",
    language: langConfig(company, call).language,
  });
}

function say(node, company, text, call) {
  const { voice, language } = langConfig(company, call);
  node.say({ voice, language }, text);
}

function wantsSpanish(speech) {
  const plain = speech.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return /\bespanol\b|\bspanish\b/.test(plain);
}

function wantsEnglish(speech) {
  return /\benglish\b|\bingles\b/i.test(
    speech.normalize("NFD").replace(/[̀-ͯ]/g, "")
  );
}

// Plays the greeting and starts listening — the AI answers the call.
function greetWithAgent(twiml, company, call) {
  const g = gather(twiml, company, call);
  say(g, company, company.greeting, call);
  if (company.spanish) {
    const invite = company.spanish.invite || "Para español, diga español.";
    g.say(
      { voice: company.spanish.voice || "Polly.Mia-Neural", language: company.spanish.language || "es-MX" },
      invite
    );
  }
  // If the caller says nothing, ask again instead of dropping the call.
  twiml.redirect({ method: "POST" }, "/greet");
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
    const call = getCall(req.body.CallSid) || startCall(req.body.CallSid, company, req.body.From);

    if (company.ringFirst?.numbers?.length) {
      // Human-first: ring the team's phones simultaneously. If nobody
      // answers within the timeout, /dial-result hands the call to the AI.
      // Keep the timeout shorter than the cells' voicemail (~20s) so
      // voicemail can't swallow the call.
      const dial = twiml.dial({
        timeout: company.ringFirst.timeoutSeconds || 15,
        answerOnBridge: true,
        action: "/dial-result",
        method: "POST",
      });
      for (const number of company.ringFirst.numbers) dial.number(number);
    } else {
      greetWithAgent(twiml, company, call);
    }
  }

  res.type("text/xml").send(twiml.toString());
});

// After the human-first ring: a team member answered (call is done), or
// nobody picked up and the AI takes over.
app.post("/dial-result", validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  const call = ensureCall(req);

  if (req.body.DialCallStatus === "completed" || !call) {
    twiml.hangup();
  } else {
    greetWithAgent(twiml, call.company, call);
  }

  res.type("text/xml").send(twiml.toString());
});

// Re-greets a caller who stayed silent (used by greetWithAgent's redirect).
app.post("/greet", validateTwilio, (req, res) => {
  const twiml = new VoiceResponse();
  const call = ensureCall(req);

  if (!call) {
    twiml.say("Sorry, something went wrong. Please call back. Goodbye.");
    twiml.hangup();
  } else {
    greetWithAgent(twiml, call.company, call);
  }

  res.type("text/xml").send(twiml.toString());
});

// Step 2 — Twilio sends us what the caller said; we answer with Claude.
app.post("/respond", validateTwilio, async (req, res) => {
  const twiml = new VoiceResponse();
  // ensureCall: if the server restarted mid-call (deploys), the caller keeps
  // talking to the agent — it just loses memory of the earlier exchanges.
  const call = ensureCall(req);

  if (!call) {
    twiml.say("Sorry, something went wrong. Please call back. Goodbye.");
    twiml.hangup();
    return res.type("text/xml").send(twiml.toString());
  }

  const { company } = call;
  const speech = (req.body.SpeechResult || "").trim();

  if (!speech) {
    const g = gather(twiml, company, call);
    say(
      g,
      company,
      call.lang === "es"
        ? "Perdón, no le escuché. ¿Puede repetirlo?"
        : "Sorry, I didn't catch that. Could you say it again?",
      call
    );
    return res.type("text/xml").send(twiml.toString());
  }

  // Language switching: "español" flips the call to Spanish speech
  // recognition + voice; "english"/"inglés" flips it back.
  if (company.spanish && call.lang !== "es" && wantsSpanish(speech)) {
    call.lang = "es";
    const g = gather(twiml, company, call);
    say(g, company, company.spanish.greeting || "¡Con gusto! ¿En qué le puedo ayudar hoy?", call);
    twiml.redirect({ method: "POST" }, "/respond");
    return res.type("text/xml").send(twiml.toString());
  }
  if (company.spanish && call.lang === "es" && wantsEnglish(speech)) {
    call.lang = "en";
    const g = gather(twiml, company, call);
    say(g, company, "No problem! How can I help you today?", call);
    twiml.redirect({ method: "POST" }, "/respond");
    return res.type("text/xml").send(twiml.toString());
  }

  call.history.push({ role: "user", content: speech });

  try {
    const { text, action } = await getAgentReply(company, call);
    call.history.push({ role: "assistant", content: text });

    if (action === "transfer" && company.transferNumber) {
      say(twiml, company, text, call);
      twiml.dial(company.transferNumber);
    } else if (action === "hangup") {
      say(twiml, company, text, call);
      twiml.hangup();
    } else {
      const g = gather(twiml, company, call);
      say(g, company, text, call);
      twiml.redirect({ method: "POST" }, "/respond");
    }
  } catch (err) {
    console.error(`Agent error on call ${req.body.CallSid}:`, err);
    say(
      twiml,
      company,
      call.lang === "es"
        ? "Lo siento, estoy teniendo problemas en este momento. Por favor llame de nuevo en unos minutos."
        : "I'm sorry, I'm having trouble right now. Please call back in a few minutes.",
      call
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
