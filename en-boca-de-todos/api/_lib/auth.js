import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Owner login. The password lives in ADMIN_PASSWORD. A successful login sets an
 * HttpOnly cookie holding a token derived from the password, so the password
 * never sits in the browser; changing the password logs everyone out.
 */
export const COOKIE = "ebdt_admin";
const MAX_AGE = 60 * 60 * 24 * 30;

const password = () => String(process.env.ADMIN_PASSWORD ?? "").trim();

function same(a, b) {
  const x = Buffer.from(String(a), "utf8");
  const y = Buffer.from(String(b), "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

function token() {
  const pass = password();
  return pass ? createHmac("sha256", pass).update("ebdt-admin-session-v1").digest("hex") : "";
}

export function checkPassword(candidate) {
  const pass = password();
  return !!pass && same(String(candidate ?? "").trim(), pass);
}

export function isAdmin(request) {
  const want = token();
  if (!want) return false;
  const m = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return !!m && same(decodeURIComponent(m[1]), want);
}

const secure = () => (process.env.VERCEL ? "; Secure" : "");
export const loginCookie = () => `${COOKIE}=${token()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secure()}`;
export const logoutCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`;

export const passwordConfigured = () => !!password();
