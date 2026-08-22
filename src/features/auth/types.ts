/**
 * Domain types for the Auth module.
 *
 * As with `features/data-archival`, these are the contract between the UI and
 * whatever backs it. The browser-local store in `lib/store.ts` satisfies them
 * today; a real identity service can satisfy them tomorrow without a component
 * changing — every form talks to the store through these shapes only.
 */

export interface SecurityQuestion {
  id: string;
  label: string;
}

export interface StoredUser {
  id: string;
  /** Lower-cased at write time; the login lookup is case-insensitive. */
  email: string;
  /** Per-user random salt, hex. Shared by the password and the answer digest. */
  salt: string;
  passwordHash: string;
  securityQuestionId: string;
  /** The answer is a credential too — it is hashed, never stored readable. */
  securityAnswerHash: string;
  createdAt: number;
}

export interface Session {
  userId: string;
  email: string;
  startedAt: number;
}

/** What the guard knows about the current visitor. */
export type SessionState =
  | { status: "checking" }
  | { status: "authenticated"; session: Session }
  | { status: "anonymous" };

/**
 * Every store call answers in this shape. Forms render `error` inline rather
 * than throwing — a wrong password is an expected outcome, not an exception.
 */
export type AuthResult<T = void> =
  | ({ ok: true } & (T extends void ? { value?: undefined } : { value: T }))
  | { ok: false; error: string; field?: "email" | "password" | "answer" | "confirm" };
