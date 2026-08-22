"use client";

import { authConfig } from "../config";
import type { AuthResult, Session, StoredUser } from "../types";
import {
  createId,
  createSalt,
  digestsMatch,
  hashSecret,
  normaliseAnswer,
  normaliseEmail,
} from "./crypto";

/**
 * Browser-local account store.
 *
 * Every function here is the seam a real identity service slots into: the forms
 * only ever call these, and only ever read `AuthResult`. Swapping localStorage
 * for `fetch` changes this file and nothing else.
 *
 * All storage access is wrapped — private mode, a full quota or a blocked
 * origin must degrade to "no account found", never crash a form mid-submit.
 */

const USERS_KEY = "dats-auth-users";
const SESSION_KEY = "dats-auth-session";

/** Broadcast so an open tab reacts to a sign-out performed in another one. */
export const SESSION_EVENT = "dats-auth-session-change";

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): boolean {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return true;
  } catch {
    return false;
  }
}

function announce() {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function findUser(email: string): StoredUser | null {
  const wanted = normaliseEmail(email);
  return readUsers().find((u) => u.email === wanted) ?? null;
}

export function hasAnyAccount(): boolean {
  return readUsers().length > 0;
}

/** Create an account and sign it in. */
export async function registerUser(input: {
  email: string;
  password: string;
  securityQuestionId: string;
  securityAnswer: string;
}): Promise<AuthResult<Session>> {
  const email = normaliseEmail(input.email);

  if (findUser(email)) {
    return { ok: false, error: "An account with that email already exists.", field: "email" };
  }

  const salt = createSalt();
  const user: StoredUser = {
    id: createId(),
    email,
    salt,
    passwordHash: await hashSecret(input.password, salt),
    securityQuestionId: input.securityQuestionId,
    securityAnswerHash: await hashSecret(normaliseAnswer(input.securityAnswer), salt),
    createdAt: Date.now(),
  };

  const users = readUsers();
  users.push(user);
  if (!writeUsers(users)) {
    return { ok: false, error: "This browser is blocking local storage, so the account could not be saved." };
  }

  return { ok: true, value: startSession(user) };
}

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthResult<Session>> {
  const user = findUser(email);
  // Same message for "no such account" and "wrong password" on purpose: telling
  // an anonymous visitor which emails are registered is a free user directory.
  const rejection: AuthResult<Session> = {
    ok: false,
    error: "Those credentials do not match an account.",
    field: "password",
  };
  if (!user) return rejection;

  const candidate = await hashSecret(password, user.salt);
  if (!digestsMatch(candidate, user.passwordHash)) return rejection;

  return { ok: true, value: startSession(user) };
}

/** Step one of recovery: which question was chosen at registration. */
export function securityQuestionFor(email: string): AuthResult<string> {
  const user = findUser(email);
  if (!user) {
    return { ok: false, error: "No account is registered with that email.", field: "email" };
  }
  return { ok: true, value: user.securityQuestionId };
}

/** Step two: prove the answer, then set a new password. */
export async function resetPassword(input: {
  email: string;
  answer: string;
  password: string;
}): Promise<AuthResult<Session>> {
  const user = findUser(input.email);
  if (!user) {
    return { ok: false, error: "No account is registered with that email.", field: "email" };
  }

  const candidate = await hashSecret(normaliseAnswer(input.answer), user.salt);
  if (!digestsMatch(candidate, user.securityAnswerHash)) {
    return { ok: false, error: "That answer does not match our records.", field: "answer" };
  }

  // New salt on every reset, so an old digest is worthless even if it leaked.
  const salt = createSalt();
  const updated: StoredUser = {
    ...user,
    salt,
    passwordHash: await hashSecret(input.password, salt),
    securityAnswerHash: await hashSecret(normaliseAnswer(input.answer), salt),
  };

  const users = readUsers().map((u) => (u.id === user.id ? updated : u));
  if (!writeUsers(users)) {
    return { ok: false, error: "This browser is blocking local storage, so the password could not be changed." };
  }

  return { ok: true, value: startSession(updated) };
}

function startSession(user: StoredUser): Session {
  const session: Session = { userId: user.id, email: user.email, startedAt: Date.now() };
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // The visitor is signed in for this page view even if it cannot be stored.
  }
  announce();
  return session;
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed || typeof parsed.email !== "string" || typeof parsed.userId !== "string") {
      return null;
    }
    return parsed as Session;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing to clear.
  }
  announce();
}

/** Where to send someone after they authenticate. */
export function resolveNextPath(next: string | null): string {
  // Only same-origin absolute paths: `next=https://elsewhere` would turn the
  // login screen into an open redirect.
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return authConfig.homePath;
}
