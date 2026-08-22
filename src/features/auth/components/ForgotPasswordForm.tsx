"use client";

import { ArrowLeft, AtSign, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authConfig, SECURITY_QUESTION_MAP } from "../config";
import { resetPassword, securityQuestionFor } from "../lib/store";
import { validateAnswer, validateEmail, validatePassword } from "../lib/validate";
import { AuthCard } from "./AuthShell";
import { Field, PasswordField } from "./Field";
import { FormError, Rise, StepDots, StrengthMeter, SubmitButton } from "./FormBits";

type Step = "identify" | "challenge";

/**
 * Recovery by security question — the counterpart to what registration
 * collected. Two steps rather than one screen: the question cannot be shown
 * until the account is known, and asking for a new password before the answer
 * is proven would invite typing it into the wrong account's form.
 */
export function ForgotPasswordForm() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("identify");
  const [email, setEmail] = useState("");
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [emailError, setEmailError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onIdentify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const problem = validateEmail(email);
    setEmailError(problem);
    if (problem) return;

    const result = securityQuestionFor(email);
    if (!result.ok) {
      setEmailError(result.error);
      return;
    }

    setQuestionId(result.value);
    setStep("challenge");
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const answerProblem = validateAnswer(answer);
    const passwordProblem = validatePassword(password);
    const confirmProblem = password !== confirm ? "Those passwords do not match." : null;
    setAnswerError(answerProblem);
    setPasswordError(passwordProblem);
    setConfirmError(confirmProblem);
    if (answerProblem || passwordProblem || confirmProblem) return;

    setPending(true);
    const result = await resetPassword({ email, answer, password });
    if (!result.ok) {
      if (result.field === "answer") setAnswerError(result.error);
      else setFormError(result.error);
      setPending(false);
      return;
    }

    // The reset signs the account in, so there is nothing useful left on this
    // screen — go straight to where they were heading.
    router.replace(authConfig.homePath);
  }

  const question = questionId ? SECURITY_QUESTION_MAP[questionId]?.label : null;

  return (
    <AuthCard
      title="Reset password"
      subtitle={
        step === "identify"
          ? "Tell us which account, and we will ask the security question you chose when you registered."
          : "Answer the question from registration, then set a new password."
      }
      footer={
        <Link
          href={authConfig.loginPath}
          className="inline-flex items-center gap-[0.375rem] font-semibold text-da-brand hover:underline"
        >
          <ArrowLeft className="size-[0.8125rem]" strokeWidth={2.2} />
          Back to sign in
        </Link>
      }
    >
      <StepDots step={step === "identify" ? 0 : 1} total={2} />

      {step === "identify" ? (
        <form className="flex flex-col gap-[1rem]" onSubmit={onIdentify} noValidate>
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
            <SubmitButton pending={false}>Continue</SubmitButton>
          </Rise>
        </form>
      ) : (
        <form className="flex flex-col gap-[1rem]" onSubmit={onReset} noValidate>
          <FormError message={formError} />

          <Rise index={0}>
            <div className="flex items-start gap-[0.5rem] rounded-[0.3125rem] border-[max(1px,0.0625rem)] border-da-border bg-da-subtle/60 px-[0.75rem] py-[0.625rem]">
              <HelpCircle className="mt-[0.0625rem] size-[0.875rem] shrink-0 text-da-brand" strokeWidth={2.2} />
              <span className="flex flex-col gap-[0.1875rem]">
                <span className="text-3xs font-semibold uppercase tracking-[0.08em] text-da-label">
                  Your security question
                </span>
                <span className="text-2xs font-semibold leading-[1.4] text-da-text">
                  {question}
                </span>
              </span>
            </div>
          </Rise>

          <Rise index={1}>
            <Field
              label="Your answer"
              autoComplete="off"
              placeholder="As you answered at registration"
              value={answer}
              error={answerError}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (answerError) setAnswerError(null);
              }}
            />
          </Rise>

          <Rise index={2} className="flex flex-col gap-[0.5rem]">
            <PasswordField
              label="New password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              error={passwordError}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
            />
            <StrengthMeter password={password} />
          </Rise>

          <Rise index={3}>
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              error={confirmError}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (confirmError) setConfirmError(null);
              }}
            />
          </Rise>

          <Rise index={4}>
            <SubmitButton pending={pending} pendingLabel="Updating…">
              Set new password
            </SubmitButton>
          </Rise>
        </form>
      )}
    </AuthCard>
  );
}
