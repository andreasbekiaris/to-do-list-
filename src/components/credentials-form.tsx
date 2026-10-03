"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { logIn, createAccount } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

const inputClass = "min-h-12 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export function CredentialsForm({ mode, disabled = false }: { mode: "login" | "register"; disabled?: boolean }) {
  const registration = mode === "register";
  const [state, action, pending] = useActionState(registration ? createAccount : logIn, {});
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const busy = disabled || pending;
  return (
    <form action={action} className="space-y-5" aria-label={registration ? "Create account" : "Log in"}>
      {state.error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm leading-6 text-destructive">{state.error}</p>}
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">Username</label>
        <input id="username" name="username" type="text" required minLength={3} maxLength={32} autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} disabled={busy} className={inputClass} />
        {registration && <p className="text-xs leading-5 text-muted-foreground">3–32 characters. Letters, numbers, dots, underscores, or hyphens.</p>}
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <div className="relative">
          <input id="password" name="password" type={showPassword ? "text" : "password"} required minLength={registration ? 12 : 1} maxLength={128} autoComplete={registration ? "new-password" : "current-password"} disabled={busy} className={`${inputClass} pr-12`} aria-describedby={registration ? "password-hint" : undefined} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-0.5" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} disabled={busy}>
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
        {registration && <p id="password-hint" className="text-xs leading-5 text-muted-foreground">At least 12 characters. A few memorable words work well.</p>}
      </div>
      {registration && <>
        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</label>
          <input id="confirmPassword" name="confirmPassword" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} autoComplete="new-password" disabled={busy} className={inputClass} />
        </div>
        <div className="space-y-2">
          <label htmlFor="setupKey" className="text-sm font-medium">Setup code</label>
          <input id="setupKey" name="setupKey" type="password" required maxLength={256} autoComplete="off" disabled={busy} className={inputClass} aria-describedby="setup-hint" />
          <p id="setup-hint" className="text-xs leading-5 text-muted-foreground">The private code used to set up this workspace. You’ll only need it once.</p>
        </div>
      </>}
      <Button type="submit" size="lg" className="w-full" disabled={busy} aria-busy={pending}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {pending ? (registration ? "Creating account…" : "Logging in…") : (registration ? "Create account" : "Log in")}
        {!pending && <ArrowRight className="ml-auto" aria-hidden="true" />}
      </Button>
    </form>
  );
}
