/**
 * Optional: pull training materials from Google Drive into a company's
 * knowledge folder. Use this when a client prefers editing Google Docs
 * over GitHub — GitHub stays the source of truth the agent reads from,
 * and this script copies Drive content into it.
 *
 * One-time setup:
 *   1. In Google Cloud Console, create a project and enable the Drive API.
 *   2. Create a Service Account, download its JSON key, and save it next to
 *      this project as gdrive-service-account.json (it is git-ignored).
 *   3. Share the client's Drive folder with the service account's email
 *      address (Viewer access is enough).
 *   4. npm install googleapis   (only needed if you use this script)
 *
 * Usage:
 *   node scripts/sync-gdrive.js <driveFolderId> <companyId>
 *
 * Google Docs are exported as plain text; .md/.txt files are downloaded
 * as-is. Everything lands in companies/<companyId>/knowledge/.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const [driveFolderId, companyId] = process.argv.slice(2);
if (!driveFolderId || !companyId) {
  console.error("Usage: node scripts/sync-gdrive.js <driveFolderId> <companyId>");
  process.exit(1);
}

const keyFile = path.join(projectRoot, "gdrive-service-account.json");
if (!fs.existsSync(keyFile)) {
  console.error(`Missing ${keyFile} — see the setup steps at the top of this script.`);
  process.exit(1);
}

const { google } = await import("googleapis").catch(() => {
  console.error("The googleapis package is not installed. Run: npm install googleapis");
  process.exit(1);
});

const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/drive.readonly"],
});
const drive = google.drive({ version: "v3", auth });

const outDir = path.join(projectRoot, "companies", companyId, "knowledge");
fs.mkdirSync(outDir, { recursive: true });

const { data } = await drive.files.list({
  q: `'${driveFolderId}' in parents and trashed = false`,
  fields: "files(id, name, mimeType)",
  pageSize: 1000,
});

let synced = 0;
for (const file of data.files || []) {
  const safeName = file.name.replace(/[^\w.\- ]/g, "_");

  if (file.mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId: file.id, mimeType: "text/plain" },
      { responseType: "text" }
    );
    fs.writeFileSync(path.join(outDir, `${safeName}.txt`), res.data);
    synced++;
  } else if (/\.(md|txt)$/i.test(file.name)) {
    const res = await drive.files.get(
      { fileId: file.id, alt: "media" },
      { responseType: "text" }
    );
    fs.writeFileSync(path.join(outDir, safeName), res.data);
    synced++;
  } else {
    console.log(`Skipping ${file.name} (unsupported type: ${file.mimeType})`);
  }
}

console.log(`Synced ${synced} file(s) into ${outDir}`);
console.log("Review the changes, then commit and push so the deployed agent picks them up.");
