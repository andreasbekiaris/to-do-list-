import { CornerDownRight, LockKeyhole, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({ title, description, children }: {
  title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-6 sm:px-12 lg:px-20">
      <header className="flex items-center justify-between gap-4 py-7 sm:py-10">
        <Brand />
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />Your space. Just yours.
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
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="px-7 pb-8 sm:px-9 sm:pb-10">
              {children}
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
