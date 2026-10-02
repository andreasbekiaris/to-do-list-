import type { Metadata } from "next";
import { CornerDownRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";
import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAllowedGithubId } from "@/lib/auth-policy";
import { isAuthConfigured } from "@/lib/env";
import { signInWithGitHub } from "./actions";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  const configured = isAuthConfigured();
  if (configured) {
    const session = await auth();
    if (isAllowedGithubId(session?.user?.githubId, process.env.ALLOWED_GITHUB_ID)) redirect("/");
  }
  const { error } = await searchParams;
  const message = !configured
    ? "Sign-in isn’t available yet. Please try again later."
    : error === "AccessDenied"
      ? "This space is private. That GitHub account doesn’t have access."
      : error
        ? "We couldn’t sign you in. Please try again."
        : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-6 sm:px-12 lg:px-20">
      <header className="flex items-center justify-between py-7 sm:py-10">
        <Brand />
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5" aria-hidden="true" />Your space. Just yours.
        </span>
      </header>
      <main id="main-content" className="grid flex-1 items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <section aria-labelledby="welcome-heading">
          <div className="mb-7 flex items-center gap-2.5 text-[11px] font-medium tracking-[0.18em] text-primary">
            <span className="h-px w-7 bg-primary/50" />A LITTLE MORE CLARITY
          </div>
          <h1 id="welcome-heading" className="max-w-lg font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
            Make room for<br /><span className="italic text-primary/75">what matters.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-muted-foreground">A quiet place for your big plans, small tasks, and everything in between.</p>
          <div className="mt-10 hidden max-w-xs space-y-3 text-sm sm:block" aria-label="One step at a time">
            <div className="flex items-center gap-3"><span className="size-3 rounded-[4px] border border-primary/50" />The big picture</div>
            <div className="ml-1.5 border-l border-border py-1 pl-6">
              <div className="flex items-center gap-2 text-muted-foreground"><CornerDownRight className="size-4" aria-hidden="true" />The small steps</div>
              <div className="ml-2 mt-4 flex items-center gap-2 border-l border-border pl-6 text-primary"><CornerDownRight className="size-4" aria-hidden="true" />One thing at a time.</div>
            </div>
          </div>
        </section>
        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <Card className="border-white/80 shadow-[0_12px_60px_-20px_rgba(40,64,48,0.18)]">
            <CardHeader className="px-7 pb-6 pt-8 sm:px-9 sm:pt-10">
              <div className="mb-6 flex size-11 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <LockKeyhole className="size-5" strokeWidth={1.6} aria-hidden="true" />
              </div>
              <CardTitle className="text-2xl">Welcome to your space.</CardTitle>
              <CardDescription>Sign in to pick up where you left off.</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 sm:px-9 sm:pb-10">
              {message && <p role="alert" className="mb-5 rounded-xl border border-border bg-background p-3 text-sm leading-6 text-muted-foreground">{message}</p>}
              <form action={signInWithGitHub}><AuthSubmitButton disabled={!configured} /></form>
              <div className="mt-7 border-t border-border pt-6">
                <p className="flex items-center gap-2 text-xs font-medium"><ShieldCheck className="size-4 text-primary" aria-hidden="true" />A private corner of the internet.</p>
                <p className="mt-2 pl-6 text-xs leading-5 text-muted-foreground">This workspace is open to its owner only.</p>
              </div>
            </CardContent>
          </Card>
          <p className="mt-5 text-center text-xs text-muted-foreground">Less noise. More intention.</p>
        </div>
      </main>
      <footer className="flex items-center justify-between gap-3 pb-7 pt-8 text-[11px] text-muted-foreground">
        <span>One step is a good start.</span><span>Made for your everyday.</span>
      </footer>
    </div>
  );
}
