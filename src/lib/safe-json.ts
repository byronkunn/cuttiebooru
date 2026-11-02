import { NextResponse } from "next/server";
// Prisma relations frequently include whole users; never send credentials or email to clients.
function sanitize(value: unknown): unknown {
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== "passwordHash" && key !== "email").map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}
export function safeJson(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(sanitize(body), { ...init, headers });
}
