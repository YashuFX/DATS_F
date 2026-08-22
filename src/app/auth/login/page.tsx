import { Suspense } from "react";
import { LoginForm } from "@/features/auth";
import { FormFallback } from "../FormFallback";

export default function LoginPage() {
  return (
    <Suspense fallback={<FormFallback title="Sign in" lines={2} />}>
      <LoginForm />
    </Suspense>
  );
}
