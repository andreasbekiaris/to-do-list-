import { ArrowDownRight, LogOut, ShieldCheck, Sprout } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireUser } from "@/lib/require-user";
import { signOutOfApp } from "@/app/login/actions";

// Never cache a build-time redirect when credentials are added after deployment.
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireUser();
  const name = user.name?.trim().split(/\s+/)[0] || "there";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border/80 bg-card/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-10">
          <Brand />
          <form action={signOutOfApp}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-5 py-14 sm:px-10 sm:py-20">
        <div className="mb-8 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />MY WORKSPACE
        </div>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-sm text-muted-foreground">Welcome back, {name}.</p>
            <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">Room for your next chapter.</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-primary">
            <ShieldCheck className="size-3.5" aria-hidden="true" />Only you
          </span>
        </div>
        <Card className="mt-10 overflow-hidden border-dashed shadow-none">
          <CardContent className="flex flex-col items-center px-6 py-20 text-center sm:py-24">
            <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-accent text-primary">
              <Sprout className="size-8" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h2 className="mb-3 text-xl font-medium tracking-tight">You’re home.</h2>
            <p className="max-w-sm text-sm leading-7 text-muted-foreground">Your private workspace is ready. A little space for the big plans and the small things along the way.</p>
            <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
              <ArrowDownRight className="size-4" aria-hidden="true" />Good things start with a little space.
            </div>
          </CardContent>
        </Card>
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 pb-7 text-xs text-muted-foreground sm:px-10">A little structure. A clearer head.</footer>
    </div>
  );
}
