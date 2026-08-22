"use client";

import { AtSign } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authConfig } from "../config";
import { authenticate, resolveNextPath } from "../lib/store";
import { validateEmail } from "../lib/validate";
import { AuthCard } from "./AuthShell";
import { Field, PasswordField } from "./Field";
import { FormError, Rise, SubmitButton } from "./FormBits";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const emailProblem = validateEmail(email);
    setEmailError(emailProblem);
    // The password is not format-checked on sign-in: rules can change, and an
    // existing account must still be able to get in with the password it has.
    if (emailProblem || !password) {
      if (!password) setFormError("Enter your password.");
      return;
    }

    setPending(true);
    const result = await authenticate(email, password);
    if (!result.ok) {
      setFormError(result.error);
      setPending(false);
      return;
    }

    router.replace(resolveNextPath(params.get("next")));
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Authenticate to reach the archival board."
      footer={
        <span className="flex items-center justify-between gap-[0.5rem]">
          No account yet?
          <Link
            href={authConfig.registerPath}
            className="font-semibold text-da-brand hover:underline"
          >
            Create one
          </Link>
        </span>
      }
    >
      <form className="flex flex-col gap-[1rem]" onSubmit={onSubmit} noValidate>
        <FormError message={formError} />

        <Rise index={0}>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="operator@dats.local"
            value={email}
            error={emailError}
            icon={<AtSign className="size-[0.875rem]" strokeWidth={2} />}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
          />
        </Rise>

        <Rise index={1}>
          <PasswordField
            label="Password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Rise>

        <Rise index={2} className="flex justify-end">
          <Link
            href={authConfig.forgotPath}
            className="text-2xs font-semibold text-da-brand hover:underline"
          >
            Forgot password?
          </Link>
        </Rise>

        <Rise index={3}>
          <SubmitButton pending={pending} pendingLabel="Verifying…">
            Sign in
          </SubmitButton>
        </Rise>
      </form>
    </AuthCard>
  );
}
