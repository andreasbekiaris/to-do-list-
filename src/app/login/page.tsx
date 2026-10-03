import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { CredentialsForm } from "@/components/credentials-form";
import { isAuthConfigured } from "@/lib/env";
import { accountAvailability } from "@/lib/accounts";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; created?: string; registration?: string }>;
}) {
  const state = isAuthConfigured() ? await accountAvailability() : { available: false, hasOwner: false };
  if (state.hasOwner && (await auth())?.user?.id) redirect("/");
  const params = await searchParams;
  const message = !state.available ? "Login isn’t available yet. Please try again later."
    : !state.hasOwner ? "Create your account to get started."
    : params.created === "1" ? "Account created. Log in to your space."
    : params.registration === "closed" ? "Your account is already set up. Log in below."
    : params.error ? "We couldn’t log you in. Please try again." : null;
  return (
    <AuthShell title="Welcome to your space." description="Log in with your username and password.">
      {message && <p role="status" className="mb-5 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">{message}</p>}
      <CredentialsForm mode="login" disabled={!state.available || !state.hasOwner} />
      {!state.hasOwner && <p className="mt-5 text-center text-sm text-muted-foreground">First time here? <Link href="/register" className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4">Create account</Link></p>}
    </AuthShell>
  );
}
