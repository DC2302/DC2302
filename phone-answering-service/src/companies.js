import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

/**
 * Each client company is a folder under companies/ containing:
 *   company.json   — settings (name, phone numbers, greeting, CRM webhook)
 *   knowledge/     — training materials (.md / .txt files) the agent answers from
 *
 * The Twilio number a caller dialed ("To") decides which company answers.
 */

let registry = null; // { byNumber: Map, byId: Map }

function loadRegistry() {
  const byNumber = new Map();
  const byId = new Map();
  if (!fs.existsSync(config.companiesDir)) return { byNumber, byId };

  for (const entry of fs.readdirSync(config.companiesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const companyDir = path.join(config.companiesDir, entry.name);
    const settingsPath = path.join(companyDir, "company.json");
    if (!fs.existsSync(settingsPath)) continue;

    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (err) {
      console.error(`Skipping ${entry.name}: invalid company.json (${err.message})`);
      continue;
    }

    const company = {
      id: entry.name,
      dir: companyDir,
      name: settings.name || entry.name,
      greeting:
        settings.greeting ||
        `Thank you for calling ${settings.name || entry.name}. How can I help you today?`,
      phoneNumbers: settings.phoneNumbers || [],
      crmWebhookUrl: settings.crmWebhookUrl || "",
      voice: settings.voice || "Polly.Joanna-Neural",
      language: settings.language || "en-US",
      transferNumber: settings.transferNumber || "",
      notify: settings.notify || { smsNumbers: [] },
      payments: settings.payments || null,
      web: settings.web || null,
      // Optional second language, e.g. { "language": "es-MX",
      // "voice": "Polly.Mia-Neural", "greeting": "...", "invite": "..." }
      spanish: settings.spanish || null,
    };

    byId.set(company.id, company);
    for (const number of company.phoneNumbers) {
      byNumber.set(normalizeNumber(number), company);
    }
  }
  return { byNumber, byId };
}

function normalizeNumber(number) {
  return String(number).replace(/[^\d+]/g, "");
}

export function findCompanyByNumber(calledNumber) {
  if (!registry) registry = loadRegistry();
  return registry.byNumber.get(normalizeNumber(calledNumber)) || null;
}

export function findCompanyById(id) {
  if (!registry) registry = loadRegistry();
  return registry.byId.get(id) || null;
}

export function reloadCompanies() {
  registry = loadRegistry();
  return registry.byNumber.size;
}
