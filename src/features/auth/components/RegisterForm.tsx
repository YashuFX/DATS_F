"use client";

import { AtSign, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authConfig, SECURITY_QUESTIONS } from "../config";
import { registerUser, resolveNextPath } from "../lib/store";
import { validateAnswer, validateEmail, validatePassword } from "../lib/validate";
import { AuthCard } from "./AuthShell";
import { Field, PasswordField, SelectField } from "./Field";
import { FormError, Rise, StrengthMeter, SubmitButton } from "./FormBits";

type Errors = Partial<Record<"email" | "password" | "confirm" | "answer", string>>;

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [questionId, setQuestionId] = useState(SECURITY_QUESTIONS[0].id);
  const [answer, setAnswer] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const clear = (field: keyof Errors) =>
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next: Errors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      confirm: password !== confirm ? "Those passwords do not match." : undefined,
      answer: validateAnswer(answer) ?? undefined,
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    const result = await registerUser({
      email,
      password,
      securityQuestionId: questionId,
      securityAnswer: answer,
    });

    if (!result.ok) {
      // A field-scoped rejection belongs on the field; anything else is a
      // whole-form problem (storage blocked, quota exhausted).
      if (result.field === "email") setErrors((prev) => ({ ...prev, email: result.error }));
      else setFormError(result.error);
      setPending(false);
      return;
    }

    router.replace(resolveNextPath(params.get("next")));
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Email and password only — no third-party sign-in. The security question is what recovers this account if the password is lost."
      footer={
        <span className="flex items-center justify-between gap-[0.5rem]">
          Already registered?
          <Link href={authConfig.loginPath} className="font-semibold text-da-brand hover:underline">
            Sign in
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
            error={errors.email}
            icon={<AtSign className="size-[0.875rem]" strokeWidth={2} />}
            onChange={(e) => {
              setEmail(e.target.value);
              clear("email");
            }}
          />
        </Rise>

        <Rise index={1} className="flex flex-col gap-[0.5rem]">
          <PasswordField
            label="Password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            error={errors.password}
            hint={`At least ${authConfig.minPasswordLength} characters, with a letter and a number.`}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
          />
          <StrengthMeter password={password} />
        </Rise>

        <Rise index={2}>
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirm}
            error={errors.confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              clear("confirm");
            }}
          />
        </Rise>

        <Rise index={3} className="flex flex-col gap-[0.75rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60 p-[0.875rem]">
          <span className="flex items-center gap-[0.375rem] text-2xs font-bold uppercase tracking-[0.08em] text-da-text">
            <KeyRound className="size-[0.8125rem] text-da-brand" strokeWidth={2.2} />
            Account recovery
          </span>

          <SelectField
            label="Security question"
            value={questionId}
            onChange={(e) => setQuestionId(e.target.value)}
            options={SECURITY_QUESTIONS.map((q) => ({ value: q.id, label: q.label }))}
          />

          <Field
            label="Your answer"
            autoComplete="off"
            placeholder="Something you will still remember"
            value={answer}
            error={errors.answer}
            hint="Case and spacing are ignored when you answer it later."
            onChange={(e) => {
              setAnswer(e.target.value);
              clear("answer");
            }}
          />
        </Rise>

        <Rise index={4}>
          <SubmitButton pending={pending} pendingLabel="Creating…">
            Create account
          </SubmitButton>
        </Rise>
      </form>
    </AuthCard>
  );
}
