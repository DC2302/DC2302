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

let registry = null; // phoneNumber (E.164) -> company object

function loadRegistry() {
  const map = new Map();
  if (!fs.existsSync(config.companiesDir)) return map;

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
    };

    for (const number of company.phoneNumbers) {
      map.set(normalizeNumber(number), company);
    }
  }
  return map;
}

function normalizeNumber(number) {
  return String(number).replace(/[^\d+]/g, "");
}

export function findCompanyByNumber(calledNumber) {
  if (!registry) registry = loadRegistry();
  return registry.get(normalizeNumber(calledNumber)) || null;
}

export function reloadCompanies() {
  registry = loadRegistry();
  return registry.size;
}
