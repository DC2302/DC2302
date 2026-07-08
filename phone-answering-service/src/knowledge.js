import fs from "node:fs";
import path from "node:path";

/**
 * Loads a company's training materials: every .md and .txt file inside
 * companies/<company>/knowledge/ (subfolders included).
 *
 * Files are cached and only re-read when they change on disk, so editing
 * a knowledge file takes effect on the very next call — no restart needed.
 */

const cache = new Map(); // companyId -> { fingerprint, text }

function listKnowledgeFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listKnowledgeFiles(full));
    } else if (/\.(md|txt)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files.sort();
}

export function loadKnowledge(company) {
  const knowledgeDir = path.join(company.dir, "knowledge");
  const files = listKnowledgeFiles(knowledgeDir);

  const fingerprint = files
    .map((f) => `${f}:${fs.statSync(f).mtimeMs}`)
    .join("|");

  const cached = cache.get(company.id);
  if (cached && cached.fingerprint === fingerprint) return cached.text;

  const sections = files.map((file) => {
    const relative = path.relative(knowledgeDir, file);
    const body = fs.readFileSync(file, "utf8").trim();
    return `## Source: ${relative}\n\n${body}`;
  });

  const text = sections.join("\n\n---\n\n") || "(No training materials found.)";
  cache.set(company.id, { fingerprint, text });
  return text;
}
