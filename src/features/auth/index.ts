/**
 * Public surface of the Auth module.
 *
 * Mirrors `features/data-archival`: a host application imports the shell, the
 * three forms and the guard, and nothing outside this folder is referenced
 * except the shared theme tokens and two primitives from the board.
 */

export { AuthShell, AuthCard } from "./components/AuthShell";
export { AuthGuard } from "./components/AuthGuard";
export { BrandPanel } from "./components/BrandPanel";
export { LoginForm } from "./components/LoginForm";
export { RegisterForm } from "./components/RegisterForm";
export { ForgotPasswordForm } from "./components/ForgotPasswordForm";
export { SignOutButton } from "./components/SignOutButton";

export { Field, PasswordField, SelectField } from "./components/Field";
export { FormError, Rise, StepDots, StrengthMeter, SubmitButton } from "./components/FormBits";

export { useSession } from "./hooks/useSession";
export {
  authenticate,
  registerUser,
  resetPassword,
  readSession,
  securityQuestionFor,
  signOut,
} from "./lib/store";

export { authConfig, SECURITY_QUESTIONS, SECURITY_QUESTION_MAP } from "./config";
export * from "./types";
