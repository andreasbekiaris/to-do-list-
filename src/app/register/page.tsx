import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { CredentialsForm } from "@/components/credentials-form";
import { isAuthConfigured, isRegistrationConfigured } from "@/lib/env";
import { accountAvailability } from "@/lib/accounts";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const state = isAuthConfigured() ? await accountAvailability() : { available: false, hasOwner: false };
  if (state.hasOwner) redirect("/login?registration=closed");
  const available = state.available && isRegistrationConfigured();
  return (
    <AuthShell title="Make this space yours." description="Create your private account. One place, just for you.">
      {!available && <p role="status" className="mb-5 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">Account creation isn’t available yet. Please try again later.</p>}
      <CredentialsForm mode="register" disabled={!available} />
      <p className="mt-5 text-center text-sm text-muted-foreground">Already set up? <Link href="/login" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Log in</Link></p>
    </AuthShell>
  );
}
