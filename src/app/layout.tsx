import type { Metadata } from "next";
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
  themeColor: "#10b981",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased min-h-screen flex flex-col overflow-x-hidden relative`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Animated Background Gradients (CSS driven) */}
          <div className="fixed inset-0 z-[-1] min-h-screen w-full pointer-events-none overflow-hidden bg-background">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-lighten animate-pulse" style={{ animationDuration: '10s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-[120px] mix-blend-multiply dark:mix-blend-lighten animate-pulse" style={{ animationDuration: '7s' }} />
            <div className="absolute top-[40%] left-[30%] w-[30%] h-[30%] rounded-full bg-purple-400/15 blur-[100px] mix-blend-multiply dark:mix-blend-lighten animate-pulse" style={{ animationDuration: '8s' }} />
          </div>

          <AuthProvider>
            <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 z-10">
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
