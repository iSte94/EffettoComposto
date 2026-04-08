"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ComposedChart, Line, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, HomeIcon, Bitcoin, LineChart as LineChartIcon, Save, Gem, Landmark, CreditCard, PlaneTakeoff, PiggyBank, Plus, Trash2, Pencil, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateRemainingDebt, getInstallmentAmountForMonth } from "@/lib/finance/loans";
import type { AssetRecord, RealEstateProperty, CustomStock, MonthlyExpense, ExistingLoan } from "@/types";
import { formatEuro } from "@/lib/format";
import { BankImportModal } from "@/components/patrimonio/bank-import-modal";
import { LoanManagerModal } from "@/components/patrimonio/loan-manager-modal";
import { FinancialProfile } from "@/components/patrimonio/financial-profile";
import { RealEstateSection } from "@/components/patrimonio/real-estate-section";
import { StockPortfolioSection } from "@/components/patrimonio/stock-portfolio-section";
import { SnapshotHistoryTable } from "@/components/patrimonio/snapshot-history-table";
import { PortfolioRebalance } from "@/components/patrimonio/portfolio-rebalance";

interface PatrimonioDashboardProps {
    user: { username: string } | null;
}

export function PatrimonioDashboard({ user }: PatrimonioDashboardProps) {
    const [history, setHistory] = useState<AssetRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [saveTrigger, setSaveTrigger] = useState<number>(0);

    const triggerSave = () => setSaveTrigger(Date.now());

    useEffect(() => {
        if (saveTrigger > 0) {
            performAutoSave();
        }
    }, [saveTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    const performAutoSave = async () => {
        if (!user) return;
        setSaveStatus('saving');
        try {
            const res = await fetch('/api/patrimonio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    realEstateValue: realEstateGrossValue,
                    realEstateCosts,
                    realEstateRent,
                    realEstateList: JSON.stringify(realEstateList),
                    liquidStockValue: customStocksList.length > 0 ? customStocksList.reduce((acc, s) => acc + ((s.currentPrice || 0) * s.shares), 0) : liquidStockValue,
                    customStocksList: JSON.stringify(customStocksList),
                    safeHavens,
                    emergencyFund,
                    pensionFund,
                    debtsTotal: totalPassivita,
                    bitcoinAmount,
                    bitcoinPrice: currentBtcPrice
                })
            });
            if (res.ok) {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else {
                setSaveStatus('idle');
            }
        } catch {
            setSaveStatus('idle');
        }
    };

    // Live BTC Price state
    const [currentBtcPrice, setCurrentBtcPrice] = useState<number>(0);

    // Loan Management State
    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState<ExistingLoan | null>(null);

    const initialLoanState: ExistingLoan = {
        id: '', name: '', category: 'Auto', installment: 0,
        startDate: format(new Date(), 'yyyy-MM'),
        endDate: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), 'yyyy-MM'),
        originalAmount: 0, interestRate: 0, currentRemainingDebt: 0, isVariable: false
    };
    const [newLoan, setNewLoan] = useState<ExistingLoan>(initialLoanState);

    const [realEstateList, setRealEstateList] = useState<RealEstateProperty[]>([]);
    const [existingLoansList, setExistingLoansList] = useState<ExistingLoan[]>([]);

    // Derived Loan Metrics
    const totalRemainingDebt = existingLoansList.reduce((acc, curr) => acc + calculateRemainingDebt(curr), 0);
    const calculatedExistingInstallment = existingLoansList.reduce((acc, loan) => {
        if (!loan.startDate || !loan.endDate) return acc + (Number(loan.installment) || 0);
        const start = new Date(loan.startDate + "-01");
        const end = new Date(loan.endDate + "-01");
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const now = new Date();
        const currentMonthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        return acc + getInstallmentAmountForMonth(loan, currentMonthsPassed, totalMonths, currentMonthsPassed);
    }, 0);

    // Derived Real Estate Totals
    const realEstateGrossValue = realEstateList.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const realEstateNetValue = realEstateList.reduce((acc, curr) => {
        let net = curr.value || 0;
        if (curr.linkedLoanId) {
            const loan = existingLoansList.find(l => l.id === curr.linkedLoanId);
            if (loan) net -= calculateRemainingDebt(loan);
        }
        return acc + Math.max(0, net);
    }, 0);
    const realEstateCosts = realEstateList.reduce((acc, curr) => {
        let total = (curr.costs || 0);
        if (!curr.isPrimaryResidence) total += (curr.imu || 0);
        return acc + total;
    }, 0);
    const realEstateRent = realEstateList.reduce((acc, curr) => {
        let isCurrentlyRented = !!curr.isRented;
        if (!isCurrentlyRented && curr.rentStartDate) {
            if (format(new Date(), 'yyyy-MM') >= curr.rentStartDate) isCurrentlyRented = true;
        }
        return acc + (isCurrentlyRented ? (curr.rent || 0) : 0);
    }, 0);

    const [customStocksList, setCustomStocksList] = useState<CustomStock[]>([]);
    const [liquidStockValue, setLiquidStockValue] = useState<number>(0);
    const [safeHavens, setSafeHavens] = useState<number>(0);
    const [emergencyFund, setEmergencyFund] = useState<number>(0);
    const [pensionFund, setPensionFund] = useState<number>(0);
    const [debtsTotal, setDebtsTotal] = useState<number>(0);
    const totalPassivita = totalRemainingDebt + debtsTotal;
    const [bitcoinAmount, setBitcoinAmount] = useState<number>(0);

    // Financial Profile
    const [person1Name, setPerson1Name] = useState<string>("Persona 1");
    const [person1Income, setPerson1Income] = useState<number>(2000);
    const [person2Name, setPerson2Name] = useState<string>("Persona 2");
    const [person2Income, setPerson2Income] = useState<number>(2000);
    const [expensesList, setExpensesList] = useState<MonthlyExpense[]>([]);
    const manualExpenses = expensesList.reduce((acc, e) => acc + ((e.amount || 0) / (e.isAnnual ? 12 : 1)), 0);
    const autoMonthlyRealEstateCosts = realEstateCosts / 12;
    const autoMonthlyLoanPayments = calculatedExistingInstallment;
    const totalAutoExpenses = autoMonthlyRealEstateCosts + autoMonthlyLoanPayments;
    const totalExpenses = manualExpenses + totalAutoExpenses;
    const grossIncome = person1Income + person2Income;
    const netIncome = grossIncome - totalExpenses;
    const monthlyExpenses = totalExpenses > 0 ? totalExpenses : 2500;

    // ETF/Stock Search States
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    const handleSearchStocks = async (query: string, index: number) => {
        if (!query || query.length < 2) { setSearchResults([]); setActiveSearchIdx(null); return; }
        setIsSearching(true);
        setActiveSearchIdx(index);
        try {
            const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.suggestions) setSearchResults(data.suggestions);
        } catch (e) { console.error(e); }
        finally { setIsSearching(false); }
    };

    const savePreferences = async (newLoans: ExistingLoan[]) => {
        if (!user) return;
        try {
            await fetch('/api/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    existingLoansList: JSON.stringify(newLoans),
                    netIncome, person1Name, person1Income, person2Name, person2Income,
                    expensesList: JSON.stringify(expensesList)
                })
            });
        } catch (e) { console.error("Failed to save preferences", e); }
    };

    // LOAN HANDLERS
    const handleAddLoan = () => {
        const id = Math.random().toString(36).substr(2, 9);
        const updatedList = [...existingLoansList, { ...newLoan, id }];
        setExistingLoansList(updatedList);
        savePreferences(updatedList);
        setNewLoan(initialLoanState);
        setIsLoanModalOpen(false);
        toast.success("Prestito aggiunto");
    };

    const handleUpdateLoan = () => {
        if (!editingLoan) return;
        const updatedList = existingLoansList.map(l => l.id === editingLoan.id ? editingLoan : l);
        setExistingLoansList(updatedList);
        savePreferences(updatedList);
        setEditingLoan(null);
        toast.success("Prestito aggiornato");
    };

    const handleRemoveLoan = (id: string) => {
        const updatedList = existingLoansList.filter(l => l.id !== id);
        setExistingLoansList(updatedList);
        savePreferences(updatedList);
        setRealEstateList(prev => prev.map(p => p.linkedLoanId === id ? { ...p, linkedLoanId: undefined } : p));
        toast.success("Prestito rimosso");
    };

    useEffect(() => {
        fetchBtcPrice();
        if (user) { fetchHistory(); } else { setLoading(false); }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchBtcPrice = async () => {
        try {
            const res = await fetch('/api/bitcoin');
            const data = await res.json();
            if (data.price) setCurrentBtcPrice(data.price);
        } catch (e) { console.error(e); }
    };

    const updateStockPrices = async (stocksToFetch: CustomStock[]) => {
        const fetchedStocks = await Promise.all(stocksToFetch.map(async (stock) => {
            if (!stock.ticker) return stock;
            try {
                const res = await fetch(`/api/stocks?ticker=${encodeURIComponent(stock.ticker)}`);
                if (res.ok) {
                    const data = await res.json();
                    return { ...stock, currentPrice: data.price, dividendYield: data.dividendYield || 0, annualDividend: data.annualDividend || 0, isLoading: false };
                }
            } catch { console.error("Error fetching", stock.ticker); }
            return { ...stock, isLoading: false };
        }));

        setCustomStocksList(prevList => {
            const newList = prevList.map(oldStock => {
                const fetched = fetchedStocks.find(f => f.id === oldStock.id);
                return fetched ? { ...oldStock, currentPrice: fetched.currentPrice, dividendYield: fetched.dividendYield, annualDividend: fetched.annualDividend, isLoading: false } : oldStock;
            });
            setTimeout(() => {
                if (newList.filter(s => s.ticker).length > 0) fetchPortfolioHistory(newList);
            }, 0);
            return newList;
        });
    };

    const fetchPortfolioHistory = async (stocks: CustomStock[]) => {
        const activeStocks = stocks.filter(s => s.ticker && s.shares > 0);
        if (activeStocks.length === 0) { setPortfolioHistory([]); return; }
        setIsFetchingHistory(true);
        try {
            const histories = await Promise.all(activeStocks.map(async (stock) => {
                const res = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(stock.ticker!)}&range=5y&interval=1mo`);
                if (!res.ok) return null;
                const data = await res.json();
                return { stock, history: data.history || [] };
            }));
            const aggregated: Record<string, number> = {};
            histories.forEach(item => {
                if (!item) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.history.forEach((point: any) => {
                    const monthKey = point.date.substring(0, 7);
                    if (!aggregated[monthKey]) aggregated[monthKey] = 0;
                    aggregated[monthKey] += point.price * item.stock.shares;
                });
            });
            const chartData = Object.entries(aggregated)
                .map(([monthKey, value]) => ({
                    dateStr: monthKey,
                    monthObj: parseISO(`${monthKey}-01`),
                    label: format(parseISO(`${monthKey}-01`), "MMM yy", { locale: it }),
                    fullDate: format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: it }),
                    Valore: value
                }))
                .sort((a, b) => a.monthObj.getTime() - b.monthObj.getTime());
            setPortfolioHistory(chartData);
        } catch (e) { console.error("Failed to fetch portfolio history", e); }
        finally { setIsFetchingHistory(false); }
    };

    const fetchHistory = async (prepopulateForms: boolean = true) => {
        setLoading(true);
        try {
            const prefRes = await fetch('/api/preferences');
            const prefData = await prefRes.json();
            let loadedLoans: ExistingLoan[] = [];
            if (prefData.preferences) {
                if (prefData.preferences.person1Name) setPerson1Name(prefData.preferences.person1Name);
                if (prefData.preferences.person1Income != null) setPerson1Income(prefData.preferences.person1Income);
                if (prefData.preferences.person2Name) setPerson2Name(prefData.preferences.person2Name);
                if (prefData.preferences.person2Income != null) setPerson2Income(prefData.preferences.person2Income);
                if (prefData.preferences.expensesList) {
                    try { setExpensesList(JSON.parse(prefData.preferences.expensesList)); } catch (e) { console.error("Failed to parse expensesList", e); }
                }
                if (prefData.preferences.existingLoansList) {
                    try { loadedLoans = JSON.parse(prefData.preferences.existingLoansList); setExistingLoansList(loadedLoans); } catch (e) { console.error("Failed to parse existing loans", e); }
                }
            }

            const res = await fetch('/api/patrimonio');
            const data = await res.json();
            if (data.history) {
                const processedHistory = data.history.map((record: AssetRecord) => {
                    const totalAssets = record.liquidStockValue + (record.bitcoinAmount * record.bitcoinPrice) + (record.safeHavens || 0) + (record.emergencyFund || 0) + (record.pensionFund || 0);
                    return { ...record, totalNetWorth: totalAssets - (record.debtsTotal || 0) };
                });
                setHistory(processedHistory);

                if (prepopulateForms && processedHistory.length > 0) {
                    const last = processedHistory[processedHistory.length - 1];
                    let parsedList: RealEstateProperty[] = [];
                    try { if (last.realEstateList) parsedList = JSON.parse(last.realEstateList); } catch { }
                    if (parsedList.length === 0 && last.realEstateValue > 0) {
                        parsedList = [{ id: 'legacy', name: 'Patrimonio Storico Copiato', value: last.realEstateValue, costs: last.realEstateCosts, rent: last.realEstateRent }];
                    }
                    let parsedStocks: CustomStock[] = [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    try { if ((last as any).customStocksList) parsedStocks = JSON.parse((last as any).customStocksList); } catch { }

                    setRealEstateList(parsedList);
                    setCustomStocksList(parsedStocks);
                    if (parsedStocks.length > 0) updateStockPrices(parsedStocks.map(s => ({ ...s, isLoading: true })));

                    setLiquidStockValue(last.liquidStockValue);
                    setSafeHavens(last.safeHavens || 0);
                    setEmergencyFund(last.emergencyFund || 0);
                    setPensionFund(last.pensionFund || 0);

                    let dynamicLoansTotal = 0;
                    loadedLoans.forEach(loan => { dynamicLoansTotal += calculateRemainingDebt(loan); });
                    setDebtsTotal(Math.max(0, (last.debtsTotal || 0) - dynamicLoansTotal));
                    setBitcoinAmount(last.bitcoinAmount);
                }
            }
        } catch {
            toast.error('Errore nel caricamento storico');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Sicuro di voler eliminare questo record storico?")) return;
        try {
            const res = await fetch('/api/patrimonio', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
            if (res.ok) { toast.success("Record eliminato"); fetchHistory(false); }
        } catch { toast.error("Errore eliminazione"); }
    };

    const editSnapshot = (item: AssetRecord) => {
        let parsedList: RealEstateProperty[] = [];
        try { if (item.realEstateList) parsedList = JSON.parse(item.realEstateList); } catch { }
        if (parsedList.length === 0 && item.realEstateValue > 0) {
            parsedList = [{ id: 'legacy', name: 'Patrimonio Storico Copiato', value: item.realEstateValue, costs: item.realEstateCosts, imu: 0, isPrimaryResidence: false, rent: item.realEstateRent }];
        }
        let parsedStocks: CustomStock[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        try { if ((item as any).customStocksList) parsedStocks = JSON.parse((item as any).customStocksList); } catch { }

        let dynamicLoansTotal = 0;
        existingLoansList.forEach(loan => { dynamicLoansTotal += calculateRemainingDebt(loan); });

        setRealEstateList(parsedList);
        setCustomStocksList(parsedStocks);
        if (parsedStocks.length > 0) updateStockPrices(parsedStocks.map(s => ({ ...s, isLoading: true })));
        setLiquidStockValue(item.liquidStockValue || 0);
        setSafeHavens(item.safeHavens || 0);
        setEmergencyFund(item.emergencyFund || 0);
        setPensionFund(item.pensionFund || 0);
        setDebtsTotal(Math.max(0, (item.debtsTotal || 0) - dynamicLoansTotal));
        setBitcoinAmount(item.bitcoinAmount || 0);

        toast.success(`Dati caricati per modifica: ${format(parseISO(item.date), "MMM yyyy")}. Una volta fatte le modifiche, clicca semplicemente nel vuoto per attivare l'auto-salvataggio o aspetta qualche istante!`, { duration: 5000 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center space-y-6">
                <div className="p-6 bg-slate-100 rounded-full">
                    <LineChartIcon className="w-12 h-12 text-slate-400 dark:text-slate-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">Il Mio Patrimonio</h2>
                <p className="text-slate-500 max-w-md">Accedi o crea un account gratuito per sbloccare la dashboard del Patrimonio Netto, tracciare i tuoi investimenti, gli immobili e i tuoi Bitcoin nel tempo con grafici interattivi.</p>
            </div>
        );
    }

    // --- DERIVED METRICS FOR HERO ---
    const activeStocksValue = customStocksList.reduce((acc, s) => acc + ((s.currentPrice || 0) * s.shares), 0);
    const activeLiquidValue = activeStocksValue + liquidStockValue;
    const totalGrossAssets = activeLiquidValue + safeHavens + emergencyFund + pensionFund + (bitcoinAmount * currentBtcPrice);
    const currentNetWorth = totalGrossAssets - totalPassivita;
    const monthlyCashflow = grossIncome + (realEstateRent - realEstateCosts) / 12 - calculatedExistingInstallment - manualExpenses;
    const totalFinancialInvestments = activeLiquidValue + emergencyFund + (bitcoinAmount * currentBtcPrice);
    const totalLiquidForSurvival = liquidStockValue + emergencyFund;
    const survivalMonths = monthlyExpenses > 0 ? (totalLiquidForSurvival / monthlyExpenses) : 0;

    let runwayColor = "text-emerald-600 dark:text-emerald-400";
    let runwayBg = "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900";
    let runwayText = "Sicurezza Alta";
    if (survivalMonths < 6) {
        runwayColor = "text-rose-600 dark:text-rose-400";
        runwayBg = "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900";
        runwayText = "Rischio Alto (< 6 mesi)";
    } else if (survivalMonths < 12) {
        runwayColor = "text-amber-600 dark:text-amber-400";
        runwayBg = "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900";
        runwayText = "Sicurezza Media";
    }

    const chartData = history.map(item => ({
        name: format(parseISO(item.date), "MMM yy", { locale: it }),
        fullDate: format(parseISO(item.date), "dd MMMM yyyy", { locale: it }),
        Patrimonio: item.totalNetWorth,
        Immobili: item.realEstateValue,
        Liquidità: (item.liquidStockValue || 0) + (item.emergencyFund || 0),
        'Altre Attività': (item.safeHavens || 0) + (item.pensionFund || 0),
        Bitcoin: item.bitcoinAmount * item.bitcoinPrice,
        Debiti: -(item.debtsTotal || 0)
    }));

    const handleSelectStock = (stock: CustomStock, suggestion: { symbol: string }) => {
        setCustomStocksList(prev => prev.map(s => s.id === stock.id ? { ...s, ticker: suggestion.symbol } : s));
        setSearchResults([]);
        setActiveSearchIdx(null);
        updateStockPrices([{ ...stock, ticker: suggestion.symbol }]);
        triggerSave();
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">

            {/* HEADER & WOW HERO */}
            <div className="text-center space-y-4 pt-6 relative">
                <div className={`absolute top-4 right-4 md:right-8 transition-all duration-500 flex items-center bg-white px-3 py-1.5 rounded-full shadow-sm border ${saveStatus === 'saved' ? 'border-emerald-200 dark:border-emerald-900 opacity-100 transform translate-y-0 text-emerald-600 dark:text-emerald-400' : saveStatus === 'saving' ? 'border-amber-200 dark:border-amber-900 opacity-100 transform translate-y-0 text-amber-600 dark:text-amber-400' : 'opacity-0 transform -translate-y-4 pointer-events-none'}`}>
                    {saveStatus === 'saving' ? (
                        <div className="flex items-center text-xs font-bold gap-1.5">
                            <div className="w-2.5 h-2.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                            Salvataggio...
                        </div>
                    ) : (
                        <div className="flex items-center text-xs font-bold gap-1">
                            <Save className="w-3.5 h-3.5 fill-emerald-100" /> Salvato
                        </div>
                    )}
                </div>

                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center justify-center">
                    Il Mio <span className="text-blue-600 dark:text-blue-400 ml-3">Patrimonio</span>
                </h2>
                {user && (
                    <div className="flex justify-center">
                        <BankImportModal
                            onImportBalance={(balance) => { setEmergencyFund(balance); triggerSave(); }}
                            onImportMonthlySavings={() => {}}
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 pt-6">
                    {/* Net Worth */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500 shadow-md">
                        <CardContent className="p-6 xl:p-8 text-center flex flex-col items-center justify-center h-full">
                            <div className="text-xs xl:text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Net Worth Globale Attuale</div>
                            {loading ? <Skeleton className="h-12 w-48 rounded-xl" /> : (
                                <div className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tighter tabular-nums">{formatEuro(currentNetWorth)}</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Immobili Netto */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500 flex flex-col justify-center">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-4 xl:p-6 text-center xl:text-left">
                            <CardTitle className="flex items-center text-sm xl:text-base text-slate-900 dark:text-slate-100 justify-center xl:justify-start">
                                <HomeIcon className="w-5 h-5 mr-3 text-emerald-600 dark:text-emerald-400 shrink-0 hidden sm:block" /> Totale Immobili (Netto)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 xl:p-6 flex-grow flex flex-col justify-center text-center xl:text-left">
                            {loading ? <Skeleton className="h-9 w-36 rounded-xl mb-2" /> : (
                                <div className="text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2 tabular-nums">{formatEuro(realEstateNetValue)}</div>
                            )}
                            {loading ? <Skeleton className="h-5 w-40 rounded-lg" /> : (
                                <div className="text-[10px] text-slate-500 font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg inline-flex items-center mx-auto xl:mx-0">Da base Lorda: {formatEuro(realEstateGrossValue)}</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Investimenti Finanziari */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500 flex flex-col justify-center">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-4 xl:p-6 text-center xl:text-left">
                            <CardTitle className="flex items-center text-sm xl:text-base text-slate-900 dark:text-slate-100 justify-center xl:justify-start">
                                <PiggyBank className="w-5 h-5 mr-3 text-purple-600 dark:text-purple-400 shrink-0 hidden sm:block" /> Investimenti Finanziari
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 xl:p-6 flex-grow flex flex-col justify-center text-center xl:text-left">
                            {loading ? <Skeleton className="h-9 w-36 rounded-xl mb-2" /> : (
                                <div className="text-2xl xl:text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2 tabular-nums">{formatEuro(totalFinancialInvestments)}</div>
                            )}
                            {loading ? <Skeleton className="h-5 w-44 rounded-lg" /> : (
                                <div className="text-[10px] text-slate-500 font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg inline-flex items-center mx-auto xl:mx-0">Azioni, Liquidità e Criptovalute</div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Runway */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 flex flex-col text-center xl:text-left">
                        <div className={`h-1 w-full ${runwayBg.split(' ')[0]}`} />
                        <CardContent className="p-4 xl:p-6 flex flex-col justify-between h-full flex-grow">
                            <div>
                                <div className="flex items-center justify-center xl:justify-start text-slate-700 dark:text-slate-300 mb-2">
                                    <PlaneTakeoff className={`w-5 h-5 mr-2 ${runwayColor}`} />
                                    <span className="font-semibold text-xs xl:text-sm uppercase tracking-wide">Indice di Sopravvivenza</span>
                                </div>
                                {loading ? <Skeleton className="h-9 w-28 rounded-xl mt-2" /> : (
                                    <>
                                        <div className="mt-2 text-2xl xl:text-3xl font-extrabold text-slate-900 dark:text-slate-100">{survivalMonths.toFixed(1)} <span className="text-lg xl:text-xl text-slate-500 font-medium">mesi</span></div>
                                        <div className={`text-[10px] xl:text-xs mt-2 font-bold px-2 py-1 rounded-full inline-block ${runwayBg}`}>{runwayText}</div>
                                    </>
                                )}
                            </div>
                            <div className="mt-4 pt-3 border-t border-slate-100/50">
                                <Label className="text-[9px] xl:text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5 block">Spese Mensili (dal Profilo)</Label>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 text-center xl:text-left">{formatEuro(monthlyExpenses)}/mese</div>
                                <p className="text-[8px] xl:text-[9px] text-slate-400 dark:text-slate-400 mt-1.5 leading-tight">Quanti mesi puoi vivere con liquidità e fondo emergenza. Modifica le spese nel Profilo Finanziario sopra.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bitcoin Live */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 text-center xl:text-left">
                        <CardContent className="p-4 xl:p-6 flex flex-col justify-center h-full">
                            <div className="flex items-center justify-center xl:justify-start text-slate-700 dark:text-slate-300 mb-2">
                                <Bitcoin className="w-5 h-5 mr-2 text-amber-500" />
                                <span className="font-semibold text-xs xl:text-sm uppercase tracking-wide">Bitcoin Live</span>
                            </div>
                            {loading ? <Skeleton className="h-9 w-36 rounded-xl" /> : (
                                <>
                                    <div className="text-2xl xl:text-3xl font-bold text-slate-900 dark:text-slate-100">{formatEuro(bitcoinAmount * currentBtcPrice)}</div>
                                    <div className="text-[10px] xl:text-xs text-slate-500 mt-1 font-medium">{bitcoinAmount} BTC @ {formatEuro(currentBtcPrice)}</div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Cashflow */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 rounded-3xl overflow-hidden group hover:shadow-lg shadow-md transition-all duration-500 text-center xl:text-left">
                        <CardContent className="p-4 xl:p-6 flex flex-col justify-center h-full">
                            <div className="flex items-center justify-center xl:justify-start text-slate-700 dark:text-slate-300 mb-3">
                                <TrendingUp className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                <span className="font-semibold text-xs xl:text-sm uppercase tracking-wide">Cashflow Atteso</span>
                            </div>
                            {loading ? <Skeleton className="h-9 w-32 rounded-xl mb-2" /> : (
                                <>
                                    <div className={`text-3xl font-bold ${monthlyCashflow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} mb-2`}>
                                        {monthlyCashflow >= 0 ? '+' : ''}{formatEuro(monthlyCashflow)}
                                    </div>
                                    <div className="flex flex-col gap-1.5 text-[10px] xl:text-xs font-medium border-t border-slate-100/50 pt-2">
                                        <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 px-1"><span>Reddito:</span><span>+{formatEuro(grossIncome)}/m</span></div>
                                        {realEstateRent > 0 && <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 px-1"><span>Affitti (Lordo):</span><span>+{formatEuro(realEstateRent / 12)}/m</span></div>}
                                        {manualExpenses > 0 && <div className="flex justify-between items-center text-rose-500 px-1"><span>Spese Personali:</span><span>-{formatEuro(manualExpenses)}/m</span></div>}
                                        {realEstateCosts > 0 && <div className="flex justify-between items-center text-rose-500 px-1"><span>Costi Immobili:</span><span>-{formatEuro(realEstateCosts / 12)}/m</span></div>}
                                        {calculatedExistingInstallment > 0 && <div className="flex justify-between items-center text-rose-500 px-1"><span>Rate Prestiti:</span><span>-{formatEuro(calculatedExistingInstallment)}/m</span></div>}
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Profilo Finanziario */}
            <FinancialProfile
                person1Name={person1Name} person1Income={person1Income}
                person2Name={person2Name} person2Income={person2Income}
                expensesList={expensesList}
                autoMonthlyRealEstateCosts={autoMonthlyRealEstateCosts}
                autoMonthlyLoanPayments={autoMonthlyLoanPayments}
                totalAutoExpenses={totalAutoExpenses}
                manualExpenses={manualExpenses} totalExpenses={totalExpenses}
                grossIncome={grossIncome} netIncome={netIncome}
                onPerson1NameChange={setPerson1Name} onPerson1IncomeChange={setPerson1Income}
                onPerson2NameChange={setPerson2Name} onPerson2IncomeChange={setPerson2Income}
                onExpensesListChange={setExpensesList}
                onBlur={() => savePreferences(existingLoansList)}
            />

            {/* CHARTS SECTION */}
            <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-xl overflow-hidden rounded-3xl">
                <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 pb-8 pt-8 px-8">
                    <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
                        <LineChartIcon className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" /> Andamento nel Tempo
                    </CardTitle>
                    <CardDescription className="text-base text-slate-500">
                        Traccia la crescita del tuo patrimonio netto inserendo periodicamente dei nuovi Snapshot.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-2 md:p-8 pt-8">
                    {loading ? (
                        <Skeleton className="w-full h-[400px] rounded-2xl bg-white/50 dark:bg-slate-800/50" />
                    ) : history.length === 0 ? (
                        <div role="status" className="h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 dark:bg-slate-800/50">
                            <LineChartIcon className="w-12 h-12 mb-4 opacity-50 text-slate-400" aria-hidden="true" />
                            <p className="font-medium text-slate-700 dark:text-slate-300">Nessun dato storico.</p>
                            <p className="text-sm">Salva il tuo primo Snapshot per iniziare il tracciamento!</p>
                        </div>
                    ) : (
                        <div className="h-[450px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorDebiti" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis tickFormatter={(val) => `€${Math.round(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)', borderRadius: '1rem', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                                        itemStyle={{ color: '#334155', border: 'none' }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(value: any) => [formatEuro(Number(value)), undefined]}
                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                    />
                                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#475569', paddingBottom: '20px' }} />
                                    <Area type="monotone" dataKey="Patrimonio" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPatrimonio)" activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981', filter: 'drop-shadow(0 0 10px rgba(16,185,129,0.4))' }} />
                                    <Area type="monotone" dataKey="Debiti" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebiti)" activeDot={false} />
                                    <Line type="monotone" dataKey="Immobili" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Liquidità" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Altre Attività" stroke="#64748b" strokeWidth={2} dot={false} />
                                    <Line type="monotone" dataKey="Bitcoin" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* INPUT FORMS FOR SNAPSHOT */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* LEFT: Real Estate, Stocks, Other Assets */}
                <div className="space-y-8">
                    <RealEstateSection
                        realEstateList={realEstateList}
                        existingLoansList={existingLoansList}
                        realEstateGrossValue={realEstateGrossValue}
                        realEstateNetValue={realEstateNetValue}
                        onListChange={setRealEstateList}
                        onTriggerSave={triggerSave}
                    />

                    <StockPortfolioSection
                        customStocksList={customStocksList}
                        liquidStockValue={liquidStockValue}
                        emergencyFund={emergencyFund}
                        searchResults={searchResults}
                        activeSearchIdx={activeSearchIdx}
                        isSearching={isSearching}
                        portfolioHistory={portfolioHistory}
                        isFetchingHistory={isFetchingHistory}
                        onStocksListChange={setCustomStocksList}
                        onLiquidStockValueChange={setLiquidStockValue}
                        onEmergencyFundChange={setEmergencyFund}
                        onSearchStocks={handleSearchStocks}
                        onSelectStock={handleSelectStock}
                        onTriggerSave={triggerSave}
                    />

                    {/* Other Assets */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-6">
                            <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100">
                                <Gem className="w-5 h-5 mr-3 text-indigo-600 dark:text-indigo-400" /> Altre Attività
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider">Beni Rifugio (Oro / Orologi / Arte)</Label>
                                <Input type="number" value={safeHavens} onChange={e => setSafeHavens(Number(e.target.value))} onBlur={triggerSave} className="text-lg bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500" />
                            </div>
                            <div className="space-y-2 pt-2">
                                <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider flex items-center">
                                    <Landmark className="w-4 h-4 mr-1 text-slate-500" /> TFR / Fondo Pensione
                                </Label>
                                <Input type="number" value={pensionFund} onChange={e => setPensionFund(Number(e.target.value))} onBlur={triggerSave} className="text-lg bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT: Bitcoin, Debts */}
                <div className="space-y-8">
                    {/* Bitcoin */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-6">
                            <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100">
                                <Bitcoin className="w-5 h-5 mr-3 text-amber-500" /> Crypto
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 rounded-2xl border border-amber-200 dark:border-amber-900 mb-4 shadow-sm">
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Inserisci solo quanti Bitcoin possiedi. Calcoleremo noi automaticamente il controvalore al prezzo di mercato live!</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider">Quantità Bitcoin Posseduta</Label>
                                <div className="relative">
                                    <Input type="number" step="0.001" value={bitcoinAmount} onChange={e => setBitcoinAmount(Number(e.target.value))} onBlur={triggerSave} className="text-xl bg-white/70 dark:bg-slate-900/70 border-slate-200 pl-14 text-slate-900 dark:text-slate-100 focus-visible:ring-amber-500" />
                                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-600 dark:text-amber-400 font-bold">BTC</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Debts */}
                    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white dark:border-slate-800 shadow-md rounded-3xl overflow-hidden group hover:shadow-lg transition-all duration-500">
                        <CardHeader className="bg-white/50 dark:bg-slate-800/50 border-b border-white dark:border-slate-800 p-6">
                            <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100">
                                <CreditCard className="w-5 h-5 mr-3 text-rose-600 dark:text-rose-400" /> Passività (Debiti)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-900 mb-4 shadow-sm">
                                <p className="text-sm font-medium text-rose-700 dark:text-rose-300">Gestisci qui i tuoi mutui, finanziamenti auto e altri debiti. Il debito residuo viene sottratto automaticamente dal tuo Patrimonio Netto.</p>
                            </div>
                            <div className="space-y-3">
                                {existingLoansList.map((loan) => (
                                    <div key={loan.id} className="p-3 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 flex items-center justify-between group-hover:border-slate-300 transition-all hover:shadow-md">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{loan.name}</span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">{loan.category}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                                <span>Rata: <strong className="text-rose-600 dark:text-rose-400">{formatEuro(loan.installment)}</strong></span>
                                                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {loan.endDate}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 px-3 border-l border-slate-100">
                                            <div className="text-[10px] text-slate-400 dark:text-slate-400 uppercase font-bold tracking-wider">Debito Residuo</div>
                                            <div className="text-sm font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(calculateRemainingDebt(loan))}</div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 dark:text-slate-400 hover:text-blue-600 dark:text-blue-400" onClick={() => { setEditingLoan(loan); setIsLoanModalOpen(true); }}>
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:text-rose-600 dark:text-rose-400" onClick={() => handleRemoveLoan(loan.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full border-dashed border-2 py-6 text-slate-500 hover:text-rose-600 dark:text-rose-400 hover:border-rose-300 hover:bg-rose-50 dark:bg-rose-950/50 transition-colors" onClick={() => { setEditingLoan(null); setNewLoan(initialLoanState); setIsLoanModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> Aggiungi Debito / Mutuo
                                </Button>
                            </div>
                            <div className="pt-4 border-t border-slate-200 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-500 text-xs uppercase font-bold tracking-wider">Altre Passività (Manuali)</Label>
                                    <Input type="number" value={debtsTotal} onChange={e => setDebtsTotal(Number(e.target.value))} onBlur={triggerSave} className="text-xl bg-white/70 dark:bg-slate-900/70 border-slate-200 text-slate-900 dark:text-slate-100 focus-visible:ring-rose-500" />
                                </div>
                                <div className="flex justify-between items-center bg-rose-50 dark:bg-rose-950/50 p-3 rounded-2xl border border-rose-100">
                                    <span className="font-bold text-slate-600 dark:text-slate-400 text-sm uppercase">Totale Passività</span>
                                    <span className="font-extrabold text-xl text-rose-600 dark:text-rose-400">{formatEuro(totalPassivita)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* PORTFOLIO REBALANCE */}
            <PortfolioRebalance
                stockValue={customStocksList.reduce((acc, s) => acc + ((s.currentPrice || 0) * s.shares), 0)}
                realEstateValue={realEstateList.reduce((acc, p) => acc + p.value, 0)}
                cryptoValue={bitcoinAmount * currentBtcPrice}
                cashValue={liquidStockValue + emergencyFund}
                bondValue={safeHavens + pensionFund}
            />

            {/* HISTORY TABLE */}
            <SnapshotHistoryTable history={history} onEdit={editSnapshot} onDelete={handleDelete} />

            {/* LOAN MODAL */}
            <LoanManagerModal
                isOpen={isLoanModalOpen}
                onOpenChange={setIsLoanModalOpen}
                editingLoan={editingLoan}
                newLoan={newLoan}
                onEditingLoanChange={setEditingLoan}
                onNewLoanChange={setNewLoan}
                onAdd={handleAddLoan}
                onUpdate={handleUpdateLoan}
            />
        </div>
    );
}
