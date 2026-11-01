import { checkPassword, isAdmin, loginCookie, passwordConfigured } from "./_lib/auth.js";
import { body, json } from "./_lib/http.js";
import { storageLabel } from "./_lib/store.js";

export function GET(request) {
  return json({ admin: isAdmin(request), configured: passwordConfigured(), storage: storageLabel(), ai: !!process.env.ANTHROPIC_API_KEY?.trim() });
}

export async function POST(request) {
  if (!passwordConfigured()) return json({ error: "ADMIN_PASSWORD isn't set on the server yet." }, 503);
  const { password } = await body(request);
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "Wrong password." }, 401);
  }
  return json({ ok: true }, 200, { "set-cookie": loginCookie() });
}
