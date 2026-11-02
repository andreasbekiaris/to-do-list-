import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { accountAvailability } from "@/lib/accounts";
import { isAuthConfigured, isPasswordResetConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const state = isAuthConfigured() ? await accountAvailability() : { available: false, hasOwner: false };
  if (state.hasOwner && (await auth())?.user?.id) redirect("/");
  const available = state.available && state.hasOwner && isPasswordResetConfigured();
  return (
    <AuthShell title="Reset your password." description="Verify your private setup code, then choose a new password.">
      {!available && <p role="status" className="mb-5 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">Password reset isn’t available until the private setup code is configured.</p>}
      <ResetPasswordForm disabled={!available} />
      <p className="mt-5 text-center text-sm text-muted-foreground">Remembered it? <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Back to login</Link></p>
    </AuthShell>
  );
}
