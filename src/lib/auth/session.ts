import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readDb } from "../db/store";
import type { User } from "../db/types";

const COOKIE = "gsc_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
    console.warn("SESSION_SECRET is not set — using an insecure demo secret.");
  }
  return "gsc-demo-secret-change-me-in-production-please-0001";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Math.floor(Date.now() / 1000) + MAX_AGE }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof uid !== "string" || exp < Date.now() / 1000) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type SessionUser = Omit<User, "passwordHash">;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const uid = readToken(jar.get(COOKIE)?.value);
  if (!uid) return null;
  const db = await readDb();
  const user = db.users.find((u) => u.id === uid);
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function requireCustomer(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/portal");
  if (user.role === "admin") redirect("/admin");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?next=/admin");
  if (user.role !== "admin") redirect("/portal");
  return user;
}
