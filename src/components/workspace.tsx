import Link from "next/link";
import { Brand } from "@/components/brand";
import { InstallApp } from "@/components/install-app";
import { RefreshOnReturn } from "@/components/refresh-on-return";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemePicker } from "@/components/theme-picker";

export function Workspace({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col">
    <RefreshOnReturn />
    <header className="border-b border-border/80 bg-card/70"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-10">
      <Link href="/" aria-label="Thread home"><Brand /></Link>
      <div className="flex items-center gap-2"><ThemePicker /><InstallApp /><SignOutButton /></div>
    </div></header>
    <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-5 py-9 sm:px-10 sm:py-14">{children}</main>
    <footer className="mx-auto w-full max-w-6xl px-5 py-7 text-xs text-muted-foreground sm:px-10">A little structure. A clearer head.</footer>
  </div>;
}
