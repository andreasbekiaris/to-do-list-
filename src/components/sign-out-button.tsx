"use client";

import { useTransition } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { signOutOfApp } from "@/app/login/actions";
import { clearOfflineData } from "@/lib/offline-store";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  return <Button type="button" variant="ghost" aria-label="Sign out" disabled={pending} onClick={() => startTransition(async () => {
    await clearOfflineData();
    await signOutOfApp();
  })}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <LogOut aria-hidden="true" />}<span className="hidden sm:inline">Sign out</span></Button>;
}
