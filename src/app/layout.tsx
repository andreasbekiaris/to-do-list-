import type { Metadata, Viewport } from "next";
import "@fontsource-variable/geist";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Thread — Your personal space", template: "%s · Thread" },
  description: "A quiet, private place for your plans and the small steps that make them happen.",
  robots: { index: false, follow: false },
  applicationName: "Thread",
  appleWebApp: { capable: true, title: "Thread", statusBarStyle: "default" },
  icons: { apple: "/icons/thread-180.png" },
};

export const viewport: Viewport = { themeColor: "#2e5947" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" data-theme="sage" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('thread-theme');if(['sage','lavender','sunset','midnight'].includes(t))document.documentElement.dataset.theme=t}catch(e){}` }} /></head>
      <body className="min-h-full">
        <a href="#main-content" className="sr-only z-50 rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
