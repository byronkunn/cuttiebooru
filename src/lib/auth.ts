import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = "cuttie_session";
const SESSION_LIFETIME = 1000 * 60 * 60 * 24 * 7;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const [format, salt, hash] = encoded.split(":");
  if (format !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt || "") || !/^[a-f0-9]{128}$/.test(hash || "")) return false;
  const key = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(key, Buffer.from(hash, "hex"));
}
export async function getSessionUser(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt <= new Date() || session.user.isBanned) return null;
  return session.user;
}
export async function createSession(userId: string, response: NextResponse) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", expires: expiresAt });
}
export async function revokeSession(req: NextRequest, response: NextResponse) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
}
export function isModerator(user: { role: string; isModerator: boolean } | null) { return !!user && (user.role === "admin" || user.role === "moderator" || user.isModerator); }
export const unauthorized = () => NextResponse.json({ error: "Sign in required" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Not authorized" }, { status: 403 });
