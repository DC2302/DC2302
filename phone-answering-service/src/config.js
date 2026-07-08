import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 3000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  claudeModel: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  // Root folder that holds one sub-folder per client company.
  companiesDir: path.resolve(__dirname, "..", "companies"),
};

export function assertConfig() {
  const missing = [];
  if (!config.anthropicApiKey) missing.push("ANTHROPIC_API_KEY");
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        "Copy .env.example to .env and fill them in."
    );
  }
}
