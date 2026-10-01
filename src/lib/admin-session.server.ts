import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Signed admin token (HMAC-SHA256 with SESSION_SECRET). Sent with each admin
// request instead of a cookie, because the preview runs inside an iframe where
// browsers block third-party cookies.
const TTL_MS = 8 * 60 * 60 * 1000;

function getSessionSecret() {
  const secret =
    process.env["SESSION_SECRET"] ||
    process.env["SUPABASE_SECRET_KEY"] ||
    process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("No server signing secret is configured.");
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export function issueAdminToken() {
  const payload = `admin.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return false;
  const exp = Number(payload.split(".")[1]);
  return Number.isFinite(exp) && exp > Date.now();
}

export function requireAdmin(token: string | undefined | null) {
  if (!verifyAdminToken(token)) throw new Error("Unauthorized");
}

export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input.trim(), "utf8").digest();
  const b = createHash("sha256").update(expected.trim(), "utf8").digest();
  return timingSafeEqual(a, b);
}
