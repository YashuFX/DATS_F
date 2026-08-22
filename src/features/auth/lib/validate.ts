import { authConfig } from "../config";

/**
 * Field rules, kept out of the components so the login form, the register form
 * and the recovery flow all reject the same input for the same reason.
 */

// Deliberately permissive: the goal is to catch a typo, not to adjudicate
// RFC 5322. Anything stricter rejects addresses that genuinely exist.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!EMAIL.test(value)) return "That does not look like an email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Enter a password.";
  if (password.length < authConfig.minPasswordLength) {
    return `Use at least ${authConfig.minPasswordLength} characters.`;
  }
  if (!/[a-z]/i.test(password) || !/[0-9]/.test(password)) {
    return "Use at least one letter and one number.";
  }
  return null;
}

export function validateAnswer(answer: string): string | null {
  if (!answer.trim()) return "Answer your security question.";
  if (answer.trim().length < authConfig.minAnswerLength) {
    return "That answer is too short to be useful.";
  }
  return null;
}

export interface Strength {
  /** 0..4 */
  score: number;
  label: string;
  /** Theme token name without the `--color-` prefix. */
  color: string;
}

/**
 * Strength as a coarse, honest signal: length first, then variety. It guides
 * rather than gates — `validatePassword` is what actually blocks a submission.
 */
export function passwordStrength(password: string): Strength {
  if (!password) return { score: 0, label: "—", color: "da-border-strong" };

  let score = 0;
  if (password.length >= authConfig.minPasswordLength) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

  const steps: Strength[] = [
    { score: 0, label: "Too short", color: "da-danger" },
    { score: 1, label: "Weak", color: "da-danger" },
    { score: 2, label: "Fair", color: "da-warn" },
    { score: 3, label: "Strong", color: "da-info" },
    { score: 4, label: "Excellent", color: "da-success" },
  ];
  return steps[Math.min(score, 4)];
}
