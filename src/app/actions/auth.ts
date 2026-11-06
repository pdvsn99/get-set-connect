"use server";
import { redirect } from "next/navigation";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { endSession, startSession } from "@/lib/auth/session";
import { mutate, newId, readDb } from "@/lib/db/store";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function safeNext(next: FormDataEntryValue | null, fallback: string) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : fallback;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }
  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "That email and password don't match. Please try again." };
  }
  await startSession(user.id);
  const fallback = user.role === "admin" ? "/admin" : "/portal";
  let next = safeNext(form.get("next"), fallback);
  if (user.role !== "admin" && next.startsWith("/admin")) next = "/portal";
  if (user.role === "admin" && next.startsWith("/portal")) next = "/admin";
  redirect(next);
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const company = String(form.get("company") ?? "").trim();
  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = "Please tell us your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = "Please enter a valid email address.";
  if (password.length < 8) fieldErrors.password = "Use at least 8 characters.";
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const result = await mutate((db) => {
    if (db.users.some((u) => u.email === email)) return { error: "exists" as const };
    const now = new Date().toISOString();
    const org = { id: newId("org"), name: company || name, kind: company ? ("developer" as const) : ("individual" as const), createdAt: now };
    db.organisations.push(org);
    const user = { id: newId("usr"), email, name, passwordHash: hashPassword(password), role: "customer" as const, organisationId: org.id, createdAt: now };
    db.users.push(user);
    return { userId: user.id };
  });
  if ("error" in result) {
    return { fieldErrors: { email: "There's already an account with that email. Try signing in." } };
  }
  await startSession(result.userId);
  redirect(safeNext(form.get("next"), "/portal"));
}

export async function signOut() {
  await endSession();
  redirect("/");
}
