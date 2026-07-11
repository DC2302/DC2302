import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { postToCrm } from "./crm.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");

/**
 * Every callback request is saved two ways so a lead is never lost:
 *   1. Appended to data/<company>-leads.jsonl on the server (git-ignored).
 *   2. Sent to the company's CRM webhook as a "lead.callback_requested" event.
 */
export async function saveLead(company, lead) {
  const record = {
    event: "lead.callback_requested",
    company: company.id,
    companyName: company.name,
    receivedAt: new Date().toISOString(),
    ...lead,
  };

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.appendFileSync(
      path.join(dataDir, `${company.id}-leads.jsonl`),
      JSON.stringify(record) + "\n"
    );
  } catch (err) {
    console.error(`Failed to write lead file for ${company.id}: ${err.message}`);
  }

  await postToCrm(company, record);
  return record;
}
