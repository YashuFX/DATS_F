import { ForgotPasswordForm } from "@/features/auth";

/**
 * No Suspense boundary here: recovery never carries a `next`, so this form
 * reads no search params and prerenders whole.
 */
export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
