"use client";

import { Suspense, lazy, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Flame, Building2, ShieldCheck, BarChart3, Calculator, Wallet, Loader2, Briefcase, TrendingUp } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

const OverviewDashboard = lazy(() => import("@/components/overview-dashboard").then(m => ({ default: m.OverviewDashboard })));
const PatrimonioDashboard = lazy(() => import("@/components/patrimonio-dashboard").then(m => ({ default: m.PatrimonioDashboard })));
const FireDashboard = lazy(() => import("@/components/fire-dashboard").then(m => ({ default: m.FireDashboard })));
const AdvisorDashboard = lazy(() => import("@/components/advisor-dashboard").then(m => ({ default: m.AdvisorDashboard })));
const ProgressioneDashboard = lazy(() => import("@/components/progressione-dashboard").then(m => ({ default: m.ProgressioneDashboard })));
const RealEstateAnalysis = lazy(() => import("@/components/real-estate-analysis").then(m => ({ default: m.RealEstateAnalysis })));
const CalculatorsDashboard = lazy(() => import("@/components/calculators-dashboard").then(m => ({ default: m.CalculatorsDashboard })));
const BudgetingDashboard = lazy(() => import("@/components/budgeting-dashboard").then(m => ({ default: m.BudgetingDashboard })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );
}

export default function CalculatorPage() {
  const { user, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const triggerClass = "rounded-xl py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm data-[state=active]:text-slate-900 dark:text-slate-100 text-slate-500 font-semibold transition-all";

  return (
    <div className="space-y-12 pb-24">
      {/* BRAND HEADER E AUTH */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-4 mb-8 gap-6 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2.5 rounded-2xl shadow-lg shadow-emerald-500/20">
            <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white">
              Effetto<span className="text-emerald-500 font-black">Composto</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium tracking-widest uppercase">Il cruscotto della tua libertà</p>
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 w-full md:w-auto">
          <ThemeToggle />
          <AuthModal
            user={user}
            onLogin={login}
            onLogout={logout}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex justify-center mb-8">
          <TabsList className="grid w-full max-w-6xl grid-cols-4 md:grid-cols-8 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-2xl">
            <TabsTrigger value="overview" className={triggerClass}>
              <BarChart3 className="w-4 h-4 md:mr-2 text-teal-500" /> <span className="hidden md:inline">Riepilogo</span>
            </TabsTrigger>
            <TabsTrigger value="patrimonio" className={triggerClass}>
              <LineChart className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline">Patrimonio</span>
            </TabsTrigger>
            <TabsTrigger value="carriera" className={triggerClass}>
              <Briefcase className="w-4 h-4 md:mr-2 text-violet-500" /> <span className="hidden md:inline">Carriera</span>
            </TabsTrigger>
            <TabsTrigger value="advisor" className={triggerClass}>
              <ShieldCheck className="w-4 h-4 md:mr-2 text-indigo-500" /> <span className="hidden md:inline">Consulente</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className={triggerClass}>
              <Building2 className="w-4 h-4 md:mr-2 text-cyan-600" /> <span className="hidden md:inline">Immobiliare</span>
            </TabsTrigger>
            <TabsTrigger value="fire" className={triggerClass}>
              <Flame className="w-4 h-4 md:mr-2 text-orange-500" /> <span className="hidden md:inline">FIRE</span>
            </TabsTrigger>
            <TabsTrigger value="budgeting" className={triggerClass}>
              <Wallet className="w-4 h-4 md:mr-2 text-violet-500" /> <span className="hidden md:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="calculators" className={triggerClass}>
              <Calculator className="w-4 h-4 md:mr-2 text-teal-500" /> <span className="hidden md:inline">Calcolatori</span>
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
