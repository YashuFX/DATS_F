import { Suspense } from "react";
import { RegisterForm } from "@/features/auth";
import { FormFallback } from "../FormFallback";

export default function RegisterPage() {
  return (
    <Suspense fallback={<FormFallback title="Create account" lines={4} />}>
      <RegisterForm />
    </Suspense>
  );
}
