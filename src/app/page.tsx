"use client";

import { lazy, Suspense, useState } from "react";
import { BarChart3, Briefcase, Building2, Calculator, Flame, Github, Loader2, LineChart, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

const OverviewDashboard = lazy(() => import("@/components/overview-dashboard").then((m) => ({ default: m.OverviewDashboard })));
const PatrimonioDashboard = lazy(() => import("@/components/patrimonio-dashboard").then((m) => ({ default: m.PatrimonioDashboard })));
const FireDashboard = lazy(() => import("@/components/fire-dashboard").then((m) => ({ default: m.FireDashboard })));
const AdvisorDashboard = lazy(() => import("@/components/advisor-dashboard").then((m) => ({ default: m.AdvisorDashboard })));
const ProgressioneDashboard = lazy(() => import("@/components/progressione-dashboard").then((m) => ({ default: m.ProgressioneDashboard })));
const RealEstateAnalysis = lazy(() => import("@/components/real-estate-analysis").then((m) => ({ default: m.RealEstateAnalysis })));
const CalculatorsDashboard = lazy(() => import("@/components/calculators-dashboard").then((m) => ({ default: m.CalculatorsDashboard })));
const BudgetingDashboard = lazy(() => import("@/components/budgeting-dashboard").then((m) => ({ default: m.BudgetingDashboard })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-card/70 py-24 shadow-sm backdrop-blur-sm">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function CalculatorPage() {
  const { user, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const triggerClass =
    "min-h-11 rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:shadow-black/5 dark:data-[state=active]:shadow-black/20";

  return (
    <div className="space-y-8 pb-24">
      <header className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur-xl sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 shadow-lg shadow-emerald-500/20">
            <TrendingUp className="size-6 md:size-7 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="bg-clip-text text-2xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-foreground via-foreground/80 to-foreground md:text-3xl">
              Effetto<span className="font-black text-emerald-500">Composto</span>
            </h1>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Il cruscotto della tua libertà
            </p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-start gap-2 md:w-auto md:justify-end">
          <a
            href="https://github.com/iSte94/EffettoComposto"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            title="Codice sorgente su GitHub"
          >
            <Github className="size-4" />
            <span>Open Source</span>
          </a>
          <ThemeToggle />
          <AuthModal user={user} onLogin={login} onLogout={logout} />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center">
          <TabsList className="grid w-full max-w-6xl grid-cols-2 gap-1 rounded-2xl border border-border/70 bg-card/80 p-1 shadow-sm backdrop-blur-xl sm:grid-cols-4 md:grid-cols-8">
            <TabsTrigger value="overview" className={triggerClass}>
              <BarChart3 className="size-4 text-teal-500" />
              <span>Riepilogo</span>
            </TabsTrigger>
            <TabsTrigger value="patrimonio" className={triggerClass}>
              <LineChart className="size-4" />
              <span>Patrimonio</span>
            </TabsTrigger>
            <TabsTrigger value="carriera" className={triggerClass}>
              <Briefcase className="size-4 text-violet-500" />
              <span>Carriera</span>
            </TabsTrigger>
            <TabsTrigger value="advisor" className={triggerClass}>
              <ShieldCheck className="size-4 text-indigo-500" />
              <span>Consulente</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className={triggerClass}>
              <Building2 className="size-4 text-cyan-600" />
              <span>Immobiliare</span>
            </TabsTrigger>
            <TabsTrigger value="fire" className={triggerClass}>
              <Flame className="size-4 text-orange-500" />
              <span>FIRE</span>
            </TabsTrigger>
            <TabsTrigger value="budgeting" className={triggerClass}>
              <Wallet className="size-4 text-violet-500" />
              <span>Budget</span>
            </TabsTrigger>
            <TabsTrigger value="calculators" className={triggerClass}>
              <Calculator className="size-4 text-teal-500" />
              <span>Calcolatori</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <Suspense fallback={<TabFallback />}>
          <TabsContent value="overview">
            <OverviewDashboard user={user} />
          </TabsContent>

          <TabsContent value="patrimonio">
            <PatrimonioDashboard user={user} />
          </TabsContent>

          <TabsContent value="carriera">
            <ProgressioneDashboard />
          </TabsContent>

          <TabsContent value="advisor">
            <AdvisorDashboard user={user} />
          </TabsContent>

          <TabsContent value="simulator">
            <RealEstateAnalysis />
          </TabsContent>

          <TabsContent value="fire">
            <FireDashboard user={user} />
          </TabsContent>

          <TabsContent value="budgeting">
            <BudgetingDashboard user={user} />
          </TabsContent>

          <TabsContent value="calculators">
            <CalculatorsDashboard />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
