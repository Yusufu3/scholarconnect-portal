import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { admin?: boolean };

function config() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "izf-admin",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" },
  };
}

export async function getAdminSession() {
  return useSession<AdminSession>(config());
}

export async function requireAdmin() {
  const s = await getAdminSession();
  if (!s.data.admin) throw new Error("Unauthorized");
}

export function passwordMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}
