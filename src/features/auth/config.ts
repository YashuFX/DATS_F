import type { SecurityQuestion } from "./types";

/**
 * Everything a host application might rebrand lives here, matching the pattern
 * in `features/data-archival/config.ts` — no component reads a hard-coded label.
 */
export const authConfig = {
  brand: {
    title: "DATS",
    subtitle: "Data Archival & Telemetry Suite",
    /** Shown under the wordmark on the brand panel. */
    tagline: "Ground segment console",
    blurb:
      "Every log, record, task and alert the array produces — archived, verified and searchable from one board.",
  },
  /** Where an authenticated visitor lands when no `next` was requested. */
  homePath: "/",
  loginPath: "/auth/login",
  registerPath: "/auth/register",
  forgotPath: "/auth/forgot",
  /** Minimum password length. Enforced by `lib/validate.ts`. */
  minPasswordLength: 8,
  minAnswerLength: 2,
} as const;

/**
 * The recovery questions offered at registration.
 *
 * Deliberately short and factual: an answer must survive being typed again
 * months later, so anything a user might phrase two different ways is a bad
 * question. The stored answer is normalised (trimmed, lower-cased, inner
 * whitespace collapsed) before hashing so casing and spacing never lock
 * somebody out of their own account.
 */
export const SECURITY_QUESTIONS: SecurityQuestion[] = [
  { id: "first-school", label: "What was the name of your first school?" },
  { id: "birth-city", label: "In which city were you born?" },
  { id: "first-pet", label: "What was the name of your first pet?" },
  { id: "mother-maiden", label: "What is your mother's maiden name?" },
  { id: "first-vehicle", label: "What was the make of your first vehicle?" },
  { id: "childhood-street", label: "What street did you live on as a child?" },
];

export const SECURITY_QUESTION_MAP: Record<string, SecurityQuestion> = Object.fromEntries(
  SECURITY_QUESTIONS.map((q) => [q.id, q]),
);
