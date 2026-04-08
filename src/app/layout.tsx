import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://effettocomposto.it"),
  title: {
    default: "Effetto Composto - Pianifica la tua indipendenza finanziaria",
    template: "%s | Effetto Composto",
  },
  description:
    "Simulatore mutuo, calcolatore FIRE, tracker patrimonio e budget personale. Strumenti gratuiti e open-source per pianificare la tua indipendenza finanziaria con l'effetto composto.",
  keywords: [
    "effetto composto",
    "interesse composto",
    "FIRE",
    "indipendenza finanziaria",
    "simulatore mutuo",
    "calcolatore patrimonio",
    "budget personale",
    "pensione anticipata",
    "investimenti",
    "finanza personale",
    "calcolatore inflazione",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Effetto Composto",
  },
  openGraph: {
    title: "Effetto Composto - Pianifica la tua indipendenza finanziaria",
    description:
      "Simulatore mutuo, calcolatore FIRE, tracker patrimonio e budget. Strumenti gratuiti e open-source per raggiungere la libertà finanziaria.",
    type: "website",
    locale: "it_IT",
    url: "https://effettocomposto.it",
    siteName: "Effetto Composto",
  },
  twitter: {
    card: "summary_large_image",
    title: "Effetto Composto",
    description:
      "Strumenti gratuiti per simulare mutui, calcolare il FIRE number e tracciare il tuo patrimonio.",
  },
  alternates: {
    canonical: "https://effettocomposto.it",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased min-h-dvh flex flex-col overflow-x-hidden relative bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.08),_transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(99,102,241,0.1),_transparent_32%)]" />
            <div className="absolute -top-28 -left-24 size-[22rem] rounded-full bg-blue-400/10 blur-[140px] animate-pulse [animation-duration:12s]" />
            <div className="absolute top-1/2 -right-24 size-[20rem] rounded-full bg-emerald-400/10 blur-[140px] animate-pulse [animation-duration:14s]" />
            <div className="absolute bottom-[-12rem] left-1/3 size-[24rem] rounded-full bg-violet-400/10 blur-[160px] animate-pulse [animation-duration:16s]" />
          </div>

          <AuthProvider>
            <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 py-4 sm:px-6 md:px-8 md:py-8">
              {children}
            </main>
          </AuthProvider>
          <Toaster position="bottom-center" richColors />
          <ServiceWorkerRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
