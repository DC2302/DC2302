import { logoutCookie } from "./_lib/auth.js";
import { json } from "./_lib/http.js";

export function POST() {
  return json({ ok: true }, 200, { "set-cookie": logoutCookie() });
}
