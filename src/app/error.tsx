"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-xl px-6 py-20"><h1 className="font-display text-3xl">Your tasks couldn’t load.</h1><p className="my-5 text-muted-foreground">Your saved work is still there. Please try again in a moment.</p><Button onClick={reset}>Try again</Button></main>;
}
