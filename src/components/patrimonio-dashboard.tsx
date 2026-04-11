"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
    ArrowRight,
    Bitcoin,
    Calendar,
    CreditCard,
    Gem,
    History,
    HomeIcon,
    Landmark,
    LayoutDashboard,
    LineChart as LineChartIcon,
    Pencil,
    PiggyBank,
    PlaneTakeoff,
    Plus,
    Save,
    Trash2,
    TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { BankImportModal } from "@/components/patrimonio/bank-import-modal";
import { FinancialProfile } from "@/components/patrimonio/financial-profile";
import { LoanManagerModal } from "@/components/patrimonio/loan-manager-modal";
import { OwnerFilterBar, OwnerBadgeSelect, type OwnerFilter } from "@/components/patrimonio/owner-filter";
import { PortfolioRebalance } from "@/components/patrimonio/portfolio-rebalance";
import { RealEstateSection } from "@/components/patrimonio/real-estate-section";
import { SnapshotHistoryTable } from "@/components/patrimonio/snapshot-history-table";
import { StockPortfolioSection } from "@/components/patrimonio/stock-portfolio-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatEuro } from "@/lib/format";
import { calculateRemainingDebt, getInstallmentAmountForMonth } from "@/lib/finance/loans";
import { cn } from "@/lib/utils";
import type { AssetOwner, AssetRecord, CustomStock, ExistingLoan, MonthlyExpense, RealEstateProperty } from "@/types";

type PatrimonioTab = "overview" | "asset" | "cashflow" | "history";
type AssetSubTab = "realestate" | "investments" | "other";

/** Compute effective total value for a stock, preferring manualValue over price*shares */
function effectiveStockValue(s: CustomStock): number {
    if (s.manualValue !== undefined && s.manualValue > 0) return s.manualValue;
    return (s.currentPrice || 0) * s.shares;
}

interface PatrimonioDashboardProps {
    user: { username: string } | null;
}

export function PatrimonioDashboard({ user }: PatrimonioDashboardProps) {
    const [history, setHistory] = useState<AssetRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activePatrimonioTab, setActivePatrimonioTab] = useState<PatrimonioTab>("overview");
    const [activeAssetSubTab, setActiveAssetSubTab] = useState<AssetSubTab>("realestate");
    const [loadedSnapshotLabel, setLoadedSnapshotLabel] = useState<string | null>(null);
    const [debtOwnerFilter, setDebtOwnerFilter] = useState<OwnerFilter>("all");
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
    const [saveTrigger, setSaveTrigger] = useState<number>(0);

    const triggerSave = () => setSaveTrigger(Date.now());

    useEffect(() => {
        if (saveTrigger > 0) {
            performAutoSave();
        }
    }, [saveTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

    const performAutoSave = async () => {
        if (!user) return;
        setSaveStatus("saving");
        try {
            const res = await fetch("/api/patrimonio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    realEstateValue: realEstateGrossValue,
                    realEstateCosts,
                    realEstateRent,
                    realEstateList: JSON.stringify(realEstateList),
                    liquidStockValue,
                    stocksSnapshotValue: customStocksList.reduce((acc, stock) => acc + effectiveStockValue(stock), 0),
                    customStocksList: JSON.stringify(customStocksList),
                    safeHavens,
                    emergencyFund: separateEmergencyFund ? emergencyFund : 0,
                    pensionFund,
                    debtsTotal: totalPassivita,
                    bitcoinAmount,
                    bitcoinPrice: currentBtcPrice,
                    otherAssetsOwnership: JSON.stringify({
                        safeHavensP1, safeHavensP2,
                        pensionFundP1, pensionFundP2,
                        bitcoinAmountP1, bitcoinAmountP2,
                    }),
                }),
            });

            if (res.ok) {
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 2500);
            } else {
                setSaveStatus("idle");
            }
        } catch {
            setSaveStatus("idle");
        }
    };

    const [currentBtcPrice, setCurrentBtcPrice] = useState<number>(0);

    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [editingLoan, setEditingLoan] = useState<ExistingLoan | null>(null);
    const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
    const [editingDebtValue, setEditingDebtValue] = useState<string>("");

    const initialLoanState: ExistingLoan = {
        id: "",
        name: "",
        category: "Auto",
        installment: 0,
        startDate: format(new Date(), "yyyy-MM"),
        endDate: format(new Date(new Date().setFullYear(new Date().getFullYear() + 1)), "yyyy-MM"),
        originalAmount: 0,
        interestRate: 0,
        currentRemainingDebt: 0,
        isVariable: false,
        owner: "person1",
    };

    const [newLoan, setNewLoan] = useState<ExistingLoan>(initialLoanState);
    const [realEstateList, setRealEstateList] = useState<RealEstateProperty[]>([]);
    const [existingLoansList, setExistingLoansList] = useState<ExistingLoan[]>([]);

    const totalRemainingDebt = existingLoansList.reduce((acc, curr) => acc + calculateRemainingDebt(curr), 0);
    const calculatedExistingInstallment = existingLoansList.reduce((acc, loan) => {
        if (!loan.startDate || !loan.endDate) return acc + (Number(loan.installment) || 0);
        const start = new Date(`${loan.startDate}-01`);
        const end = new Date(`${loan.endDate}-01`);
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        const now = new Date();
        const currentMonthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        return acc + getInstallmentAmountForMonth(loan, currentMonthsPassed, totalMonths, currentMonthsPassed);
    }, 0);

    const realEstateGrossValue = realEstateList.reduce((acc, curr) => acc + (curr.value || 0), 0);
    const realEstateNetValue = realEstateList.reduce((acc, curr) => {
        let net = curr.value || 0;
        if (curr.linkedLoanId) {
            const loan = existingLoansList.find((item) => item.id === curr.linkedLoanId);
            if (loan) net -= calculateRemainingDebt(loan);
        }
        return acc + Math.max(0, net);
    }, 0);
    const realEstateCosts = realEstateList.reduce((acc, curr) => {
        let total = curr.costs || 0;
        if (!curr.isPrimaryResidence) total += curr.imu || 0;
        return acc + total;
    }, 0);
    const realEstateRent = realEstateList.reduce((acc, curr) => {
        let isCurrentlyRented = !!curr.isRented;
        if (!isCurrentlyRented && curr.rentStartDate) {
            if (format(new Date(), "yyyy-MM") >= curr.rentStartDate) isCurrentlyRented = true;
        }
        return acc + (isCurrentlyRented ? (curr.rent || 0) : 0);
    }, 0);

    const [customStocksList, setCustomStocksList] = useState<CustomStock[]>([]);
    const [liquidStockValue, setLiquidStockValue] = useState<number>(0);
    const [safeHavensP1, setSafeHavensP1] = useState<number>(0);
    const [safeHavensP2, setSafeHavensP2] = useState<number>(0);
    const safeHavens = safeHavensP1 + safeHavensP2;
    const [emergencyFund, setEmergencyFund] = useState<number>(0);
    const [separateEmergencyFund, setSeparateEmergencyFund] = useState<boolean>(false);
    const [pensionFundP1, setPensionFundP1] = useState<number>(0);
    const [pensionFundP2, setPensionFundP2] = useState<number>(0);
    const pensionFund = pensionFundP1 + pensionFundP2;
    const totalPassivita = totalRemainingDebt;
    const [bitcoinAmountP1, setBitcoinAmountP1] = useState<number>(0);
    const [bitcoinAmountP2, setBitcoinAmountP2] = useState<number>(0);
    const bitcoinAmount = bitcoinAmountP1 + bitcoinAmountP2;

    const [person1Name, setPerson1Name] = useState<string>("Persona 1");
    const [person1Income, setPerson1Income] = useState<number>(2000);
    const [person2Name, setPerson2Name] = useState<string>("Persona 2");
    const [person2Income, setPerson2Income] = useState<number>(2000);
    const [expensesList, setExpensesList] = useState<MonthlyExpense[]>([]);
    const manualExpenses = expensesList.reduce((acc, expense) => acc + ((expense.amount || 0) / (expense.isAnnual ? 12 : 1)), 0);
    const autoMonthlyRealEstateCosts = realEstateCosts / 12;
    const autoMonthlyLoanPayments = calculatedExistingInstallment;
    const totalAutoExpenses = autoMonthlyRealEstateCosts + autoMonthlyLoanPayments;
    const totalExpenses = manualExpenses + totalAutoExpenses;
    const grossIncome = person1Income + person2Income;
    const netIncome = grossIncome - totalExpenses;
    const monthlyExpenses = totalExpenses > 0 ? totalExpenses : 2500;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [portfolioHistory, setPortfolioHistory] = useState<any[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    const handleSearchStocks = async (query: string, index: number) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setActiveSearchIdx(null);
            return;
        }

        setIsSearching(true);
        setActiveSearchIdx(index);
        try {
            const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data.suggestions) setSearchResults(data.suggestions);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const savePreferences = async (newLoans: ExistingLoan[]) => {
        if (!user) return;
        try {
            await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    existingLoansList: JSON.stringify(newLoans),
                    netIncome,
                    person1Name,
                    person1Income,
                    person2Name,
                    person2Income,
                    expensesList: JSON.stringify(expensesList),
                    separateEmergencyFund,
                }),
            });
        } catch (error) {
            console.error("Failed to save preferences", error);
        }
    };

    const handleToggleSeparateEmergencyFund = async (value: boolean) => {
        setSeparateEmergencyFund(value);
        if (!value) {
            setEmergencyFund(0);
        }
        if (!user) return;

        try {
            await fetch("/api/preferences", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ separateEmergencyFund: value }),
            });
        } catch (error) {
            console.error("Failed to save preference", error);
        }

        triggerSave();
    };

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
        const updatedList = existingLoansList.map((loan) => (loan.id === editingLoan.id ? editingLoan : loan));
        setExistingLoansList(updatedList);
        savePreferences(updatedList);
        setEditingLoan(null);
        toast.success("Prestito aggiornato");
    };

    const handleRemoveLoan = (id: string) => {
        const updatedList = existingLoansList.filter((loan) => loan.id !== id);
        setExistingLoansList(updatedList);
        savePreferences(updatedList);
        setRealEstateList((prev) => prev.map((property) => (property.linkedLoanId === id ? { ...property, linkedLoanId: undefined } : property)));
        toast.success("Prestito rimosso");
    };

    const hasInitialData = useRef(false);

    useEffect(() => {
        if (user) {
            // Fetch BTC price and history in parallel, then auto-save with fresh prices
            Promise.all([fetchBtcPrice(), fetchHistory()]).then(() => {
                if (hasInitialData.current) triggerSave();
            });
        } else {
            fetchBtcPrice();
            setLoading(false);
        }
    }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchBtcPrice = async () => {
        try {
            const res = await fetch("/api/bitcoin");
            const data = await res.json();
            if (data.price) setCurrentBtcPrice(data.price);
        } catch (error) {
            console.error(error);
        }
    };

    const updateStockPrices = async (stocksToFetch: CustomStock[]) => {
        const fetchedStocks = await Promise.all(stocksToFetch.map(async (stock) => {
            if (!stock.ticker) return stock;

            try {
                const res = await fetch(`/api/stocks?ticker=${encodeURIComponent(stock.ticker)}`);
                if (res.ok) {
                    const data = await res.json();
                    return {
                        ...stock,
                        currentPrice: data.price,
                        dividendYield: data.dividendYield || 0,
                        annualDividend: data.annualDividend || 0,
                        isLoading: false,
                    };
                }
            } catch {
                console.error("Error fetching", stock.ticker);
            }

            return { ...stock, isLoading: false };
        }));

        setCustomStocksList((prevList) => {
            const newList = prevList.map((oldStock) => {
                const fetched = fetchedStocks.find((item) => item.id === oldStock.id);
                return fetched
                    ? {
                        ...oldStock,
                        currentPrice: fetched.currentPrice,
                        dividendYield: fetched.dividendYield,
                        annualDividend: fetched.annualDividend,
                        isLoading: false,
                    }
                    : oldStock;
            });

            setTimeout(() => {
                if (newList.filter((item) => item.ticker).length > 0) fetchPortfolioHistory(newList);
            }, 0);

            return newList;
        });
    };

    const fetchPortfolioHistory = async (stocks: CustomStock[]) => {
        const activeStocks = stocks.filter((stock) => stock.ticker && stock.shares > 0);
        if (activeStocks.length === 0) {
            setPortfolioHistory([]);
            return;
        }

        setIsFetchingHistory(true);
        try {
            const histories = await Promise.all(activeStocks.map(async (stock) => {
                const res = await fetch(`/api/stocks/history?ticker=${encodeURIComponent(stock.ticker!)}&range=5y&interval=1mo`);
                if (!res.ok) return null;
                const data = await res.json();
                return { stock, history: data.history || [] };
            }));

            const aggregated: Record<string, number> = {};
            histories.forEach((item) => {
                if (!item) return;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item.history.forEach((point: any) => {
                    const monthKey = point.date.substring(0, 7);
                    if (!aggregated[monthKey]) aggregated[monthKey] = 0;
                    aggregated[monthKey] += point.price * item.stock.shares;
                });
            });

            const aggregatedChartData = Object.entries(aggregated)
                .map(([monthKey, value]) => ({
                    dateStr: monthKey,
                    monthObj: parseISO(`${monthKey}-01`),
                    label: format(parseISO(`${monthKey}-01`), "MMM yy", { locale: it }),
                    fullDate: format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: it }),
                    Valore: value,
                }))
                .sort((a, b) => a.monthObj.getTime() - b.monthObj.getTime());

            setPortfolioHistory(aggregatedChartData);
        } catch (error) {
            console.error("Failed to fetch portfolio history", error);
        } finally {
            setIsFetchingHistory(false);
        }
    };

    const fetchHistory = async (prepopulateForms: boolean = true) => {
        setLoading(true);
        setLoadedSnapshotLabel(null);
        try {
            const prefRes = await fetch("/api/preferences");
            const prefData = await prefRes.json();
            let loadedLoans: ExistingLoan[] = [];

            if (prefData.preferences) {
                if (prefData.preferences.person1Name) setPerson1Name(prefData.preferences.person1Name);
                if (prefData.preferences.person1Income != null) setPerson1Income(prefData.preferences.person1Income);
                if (prefData.preferences.person2Name) setPerson2Name(prefData.preferences.person2Name);
                if (prefData.preferences.person2Income != null) setPerson2Income(prefData.preferences.person2Income);
                if (prefData.preferences.expensesList) {
                    try {
                        setExpensesList(JSON.parse(prefData.preferences.expensesList));
                    } catch (error) {
                        console.error("Failed to parse expensesList", error);
                    }
                }
                if (prefData.preferences.existingLoansList) {
                    try {
                        loadedLoans = JSON.parse(prefData.preferences.existingLoansList);
                        setExistingLoansList(loadedLoans);
                    } catch (error) {
                        console.error("Failed to parse existing loans", error);
                    }
                }
                if (prefData.preferences.separateEmergencyFund != null) setSeparateEmergencyFund(prefData.preferences.separateEmergencyFund);
            }

            const res = await fetch("/api/patrimonio");
            const data = await res.json();

            if (data.history) {
                const processedHistory = data.history.map((record: AssetRecord) => {
                    const totalAssets = record.liquidStockValue
                        + (record.stocksSnapshotValue || 0)
                        + (record.bitcoinAmount * record.bitcoinPrice)
                        + (record.safeHavens || 0)
                        + (record.emergencyFund || 0)
                        + (record.pensionFund || 0);

                    return { ...record, totalNetWorth: totalAssets - (record.debtsTotal || 0) };
                });

                setHistory(processedHistory);

                if (prepopulateForms && processedHistory.length > 0) {
                    hasInitialData.current = true;
                    const last = processedHistory[processedHistory.length - 1];
                    let parsedList: RealEstateProperty[] = [];
                    try {
                        if (last.realEstateList) parsedList = JSON.parse(last.realEstateList);
                    } catch {
                        // noop
                    }
                    if (parsedList.length === 0 && last.realEstateValue > 0) {
                        parsedList = [{
                            id: "legacy",
                            name: "Patrimonio Storico Copiato",
                            value: last.realEstateValue,
                            costs: last.realEstateCosts,
                            rent: last.realEstateRent,
                        }];
                    }

                    let parsedStocks: CustomStock[] = [];
                    try {
                        if ((last as unknown as { customStocksList?: string }).customStocksList) {
                            parsedStocks = JSON.parse((last as unknown as { customStocksList?: string }).customStocksList || "[]");
                        }
                    } catch {
                        // noop
                    }

                    setRealEstateList(parsedList);
                    setCustomStocksList(parsedStocks);
                    if (parsedStocks.length > 0) await updateStockPrices(parsedStocks.map((stock) => ({ ...stock, isLoading: true })));

                    setLiquidStockValue(last.liquidStockValue);
                    // Per-person split: carica da snapshot se disponibile, altrimenti tutto in P1 (retrocompat)
                    const otherOwn = last.otherAssetsOwnership ? (typeof last.otherAssetsOwnership === "string" ? JSON.parse(last.otherAssetsOwnership) : last.otherAssetsOwnership) : null;
                    setSafeHavensP1(otherOwn?.safeHavensP1 ?? (last.safeHavens || 0));
                    setSafeHavensP2(otherOwn?.safeHavensP2 ?? 0);
                    setEmergencyFund(last.emergencyFund || 0);
                    setPensionFundP1(otherOwn?.pensionFundP1 ?? (last.pensionFund || 0));
                    setPensionFundP2(otherOwn?.pensionFundP2 ?? 0);
                    setBitcoinAmountP1(otherOwn?.bitcoinAmountP1 ?? (last.bitcoinAmount || 0));
                    setBitcoinAmountP2(otherOwn?.bitcoinAmountP2 ?? 0);
                }
            }
        } catch {
            toast.error("Errore nel caricamento storico");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Sicuro di voler eliminare questo record storico?")) return;

        try {
            const res = await fetch("/api/patrimonio", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (res.ok) {
                toast.success("Record eliminato");
                fetchHistory(false);
            }
        } catch {
            toast.error("Errore eliminazione");
        }
    };

    const editSnapshot = (item: AssetRecord) => {
        let parsedList: RealEstateProperty[] = [];
        try {
            if (item.realEstateList) parsedList = JSON.parse(item.realEstateList);
        } catch {
            // noop
        }

        if (parsedList.length === 0 && item.realEstateValue > 0) {
            parsedList = [{
                id: "legacy",
                name: "Patrimonio Storico Copiato",
                value: item.realEstateValue,
                costs: item.realEstateCosts,
                imu: 0,
                isPrimaryResidence: false,
                rent: item.realEstateRent,
            }];
        }

        let parsedStocks: CustomStock[] = [];
        try {
            if ((item as unknown as { customStocksList?: string }).customStocksList) {
                parsedStocks = JSON.parse((item as unknown as { customStocksList?: string }).customStocksList || "[]");
            }
        } catch {
            // noop
        }

        setRealEstateList(parsedList);
        setCustomStocksList(parsedStocks);
        if (parsedStocks.length > 0) updateStockPrices(parsedStocks.map((stock) => ({ ...stock, isLoading: true })));
        setLiquidStockValue(item.liquidStockValue || 0);
        // Per-person split: carica da snapshot se disponibile, altrimenti tutto in P1
        const otherOwn = (item as unknown as { otherAssetsOwnership?: string }).otherAssetsOwnership
            ? JSON.parse((item as unknown as { otherAssetsOwnership?: string }).otherAssetsOwnership || "{}")
            : null;
        setSafeHavensP1(otherOwn?.safeHavensP1 ?? (item.safeHavens || 0));
        setSafeHavensP2(otherOwn?.safeHavensP2 ?? 0);
        setEmergencyFund(item.emergencyFund || 0);
        setPensionFundP1(otherOwn?.pensionFundP1 ?? (item.pensionFund || 0));
        setPensionFundP2(otherOwn?.pensionFundP2 ?? 0);
        setBitcoinAmountP1(otherOwn?.bitcoinAmountP1 ?? (item.bitcoinAmount || 0));
        setBitcoinAmountP2(otherOwn?.bitcoinAmountP2 ?? 0);

        toast.success(`Dati caricati per modifica: ${format(parseISO(item.date), "MMM yyyy")}. Una volta fatte le modifiche, clicca semplicemente nel vuoto per attivare l'auto-salvataggio o aspetta qualche istante!`, { duration: 5000 });
        setLoadedSnapshotLabel(format(parseISO(item.date), "dd MMMM yyyy", { locale: it }));
        setActivePatrimonioTab("asset");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 px-4 py-24 text-center">
                <div className="rounded-full bg-slate-100 p-6">
                    <LineChartIcon className="h-12 w-12 text-slate-400 dark:text-slate-400" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-200">Il Mio Patrimonio</h2>
                <p className="max-w-md text-slate-500">
                    Accedi o crea un account gratuito per sbloccare la dashboard del Patrimonio Netto, tracciare i tuoi investimenti, gli immobili e i tuoi Bitcoin nel tempo con grafici interattivi.
                </p>
            </div>
        );
    }

    const activeStocksValue = customStocksList.reduce((acc, stock) => acc + effectiveStockValue(stock), 0);
    const activeLiquidValue = activeStocksValue + liquidStockValue;
    const effectiveEmergencyFund = separateEmergencyFund ? emergencyFund : 0;
    const totalGrossAssets = activeLiquidValue + safeHavens + effectiveEmergencyFund + pensionFund + (bitcoinAmount * currentBtcPrice);
    const currentNetWorth = totalGrossAssets - totalPassivita;
    const monthlyCashflow = grossIncome + ((realEstateRent - realEstateCosts) / 12) - calculatedExistingInstallment - manualExpenses;
    const totalFinancialInvestments = activeLiquidValue + effectiveEmergencyFund + (bitcoinAmount * currentBtcPrice);
    const totalLiquidForSurvival = separateEmergencyFund ? liquidStockValue + emergencyFund : liquidStockValue;
    const survivalMonths = monthlyExpenses > 0 ? totalLiquidForSurvival / monthlyExpenses : 0;
    const debtWeightPercent = totalGrossAssets > 0 ? (totalPassivita / totalGrossAssets) * 100 : 0;
    const latestSnapshot = history.length > 0 ? history[history.length - 1] : null;
    const latestSnapshotLabel = latestSnapshot ? format(parseISO(latestSnapshot.date), "dd MMM yyyy", { locale: it }) : null;

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

    const chartData = history.map((item) => ({
        name: format(parseISO(item.date), "MMM yy", { locale: it }),
        fullDate: format(parseISO(item.date), "dd MMMM yyyy", { locale: it }),
        Patrimonio: item.totalNetWorth,
        Immobili: item.realEstateValue,
        Liquidita: (item.liquidStockValue || 0) + (item.stocksSnapshotValue || 0) + (item.emergencyFund || 0),
        AltreAttivita: (item.safeHavens || 0) + (item.pensionFund || 0),
        Bitcoin: item.bitcoinAmount * item.bitcoinPrice,
        Debiti: -(item.debtsTotal || 0),
    }));

    const handleSelectStock = (stock: CustomStock, suggestion: { symbol: string }) => {
        setCustomStocksList((prev) => prev.map((item) => (item.id === stock.id ? { ...item, ticker: suggestion.symbol } : item)));
        setSearchResults([]);
        setActiveSearchIdx(null);
        updateStockPrices([{ ...stock, ticker: suggestion.symbol }]);
        triggerSave();
    };

    const mainSectionTriggerClass =
        "h-auto min-h-[56px] min-w-0 justify-start overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-left shadow-sm transition-all duration-200 data-[state=active]:border-slate-900 data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg dark:border-slate-700 dark:bg-slate-800/70 dark:data-[state=active]:border-slate-100 dark:data-[state=active]:bg-slate-100 dark:data-[state=active]:text-slate-900";
    const assetSectionTriggerClass =
        "h-auto min-h-11 justify-start rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-all duration-200 data-[state=active]:border-blue-200 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300 dark:data-[state=active]:border-blue-900 dark:data-[state=active]:bg-blue-950/50 dark:data-[state=active]:text-blue-300";
    const quickActionClass =
        "group h-auto min-h-14 min-w-0 justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-slate-600";

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            <div className="relative space-y-4 pt-6 text-center">
                <div
                    className={cn(
                        "absolute top-4 right-4 flex items-center rounded-full border bg-white px-3 py-1.5 shadow-sm transition-all duration-500 md:right-8",
                        saveStatus === "saved"
                            ? "translate-y-0 border-emerald-200 text-emerald-600 opacity-100 dark:border-emerald-900 dark:text-emerald-400"
                            : saveStatus === "saving"
                                ? "translate-y-0 border-amber-200 text-amber-600 opacity-100 dark:border-amber-900 dark:text-amber-400"
                                : "pointer-events-none -translate-y-4 opacity-0",
                    )}
                >
                    {saveStatus === "saving" ? (
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                            <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
                            Salvataggio...
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs font-bold">
                            <Save className="h-3.5 w-3.5 fill-emerald-100" /> Salvato
                        </div>
                    )}
                </div>

                <h2 className="flex items-center justify-center text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
                    Il Mio <span className="ml-3 text-blue-600 dark:text-blue-400">Patrimonio</span>
                </h2>

                <div className="flex justify-center">
                    <BankImportModal
                        onImportBalance={(balance) => {
                            setEmergencyFund(balance);
                            triggerSave();
                        }}
                        onImportMonthlySavings={() => {}}
                    />
                </div>

                <div className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                        <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center xl:p-8">
                            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 xl:text-sm">Net Worth Globale Attuale</div>
                            {loading ? <Skeleton className="h-12 w-48 rounded-xl" /> : <div className="text-3xl font-extrabold tracking-tighter text-emerald-600 tabular-nums dark:text-emerald-400 lg:text-4xl xl:text-5xl">{formatEuro(currentNetWorth)}</div>}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                        <CardHeader className="border-b border-slate-200/80 bg-white/60 p-4 text-center dark:border-slate-800 dark:bg-slate-800/60 xl:p-6 xl:text-left">
                            <CardTitle className="flex items-center justify-center text-sm text-slate-900 dark:text-slate-100 xl:justify-start xl:text-base">
                                <HomeIcon className="mr-3 hidden h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 sm:block" />
                                Totale Immobili (Netto)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-grow flex-col justify-center p-4 text-center xl:p-6 xl:text-left">
                            {loading ? <Skeleton className="mb-2 h-9 w-36 rounded-xl" /> : <div className="mb-2 text-2xl font-bold text-emerald-600 tabular-nums dark:text-emerald-400 xl:text-3xl">{formatEuro(realEstateNetValue)}</div>}
                            {loading ? <Skeleton className="h-5 w-40 rounded-lg" /> : <div className="mx-auto inline-flex items-center rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 xl:mx-0">Da base lorda: {formatEuro(realEstateGrossValue)}</div>}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col justify-center overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                        <CardHeader className="border-b border-slate-200/80 bg-white/60 p-4 text-center dark:border-slate-800 dark:bg-slate-800/60 xl:p-6 xl:text-left">
                            <CardTitle className="flex items-center justify-center text-sm text-slate-900 dark:text-slate-100 xl:justify-start xl:text-base">
                                <PiggyBank className="mr-3 hidden h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400 sm:block" />
                                Investimenti Finanziari
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-grow flex-col justify-center p-4 text-center xl:p-6 xl:text-left">
                            {loading ? <Skeleton className="mb-2 h-9 w-36 rounded-xl" /> : <div className="mb-2 text-2xl font-bold text-purple-600 tabular-nums dark:text-purple-400 xl:text-3xl">{formatEuro(totalFinancialInvestments)}</div>}
                            {loading ? <Skeleton className="h-5 w-44 rounded-lg" /> : <div className="mx-auto inline-flex items-center rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 xl:mx-0">Azioni, liquidita e criptovalute</div>}
                        </CardContent>
                    </Card>

                    <Card className="flex flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 text-center shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75 xl:text-left">
                        <div className={`h-1 w-full ${runwayBg.split(" ")[0]}`} />
                        <CardContent className="flex h-full flex-grow flex-col justify-between p-4 xl:p-6">
                            <div>
                                <div className="mb-2 flex items-center justify-center text-slate-700 dark:text-slate-300 xl:justify-start">
                                    <PlaneTakeoff className={`mr-2 h-5 w-5 ${runwayColor}`} />
                                    <span className="text-xs font-semibold uppercase tracking-wide xl:text-sm">Indice di Sopravvivenza</span>
                                </div>
                                {loading ? <Skeleton className="mt-2 h-9 w-28 rounded-xl" /> : <>
                                    <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100 xl:text-3xl">
                                        {survivalMonths.toFixed(1)} <span className="text-lg font-medium text-slate-500 xl:text-xl">mesi</span>
                                    </div>
                                    <div className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold xl:text-xs ${runwayBg}`}>{runwayText}</div>
                                </>}
                            </div>
                            <div className="mt-4 border-t border-slate-100/50 pt-3">
                                <Label className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-slate-500 xl:text-[10px]">Spese Mensili (dal Profilo)</Label>
                                <div className="text-center text-sm font-bold text-slate-700 dark:text-slate-300 xl:text-left">{formatEuro(monthlyExpenses)}/mese</div>
                                <p className="mt-1.5 text-[8px] leading-tight text-slate-400 dark:text-slate-400 xl:text-[9px]">Quanti mesi puoi vivere con liquidita e fondo emergenza. Modifica le spese nell&apos;area Passivita & Cashflow.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 text-center shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75 xl:text-left">
                        <CardContent className="flex h-full flex-col justify-center p-4 xl:p-6">
                            <div className="mb-2 flex items-center justify-center text-slate-700 dark:text-slate-300 xl:justify-start">
                                <Bitcoin className="mr-2 h-5 w-5 text-amber-500" />
                                <span className="text-xs font-semibold uppercase tracking-wide xl:text-sm">Bitcoin Live</span>
                            </div>
                            {loading ? <Skeleton className="h-9 w-36 rounded-xl" /> : <>
                                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 xl:text-3xl">{formatEuro(bitcoinAmount * currentBtcPrice)}</div>
                                <div className="mt-1 text-[10px] font-medium text-slate-500 xl:text-xs">{bitcoinAmount} BTC @ {formatEuro(currentBtcPrice)}</div>
                            </>}
                        </CardContent>
                    </Card>

                    <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 text-center shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75 xl:text-left">
                        <CardContent className="flex h-full flex-col justify-center p-4 xl:p-6">
                            <div className="mb-3 flex items-center justify-center text-slate-700 dark:text-slate-300 xl:justify-start">
                                <TrendingUp className="mr-2 h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-semibold uppercase tracking-wide xl:text-sm">Cashflow Atteso</span>
                            </div>
                            {loading ? <Skeleton className="mb-2 h-9 w-32 rounded-xl" /> : <>
                                <div className={cn("mb-2 text-3xl font-bold", monthlyCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                    {monthlyCashflow >= 0 ? "+" : ""}{formatEuro(monthlyCashflow)}
                                </div>
                                <div className="flex flex-col gap-1.5 border-t border-slate-100/50 pt-2 text-[10px] font-medium xl:text-xs">
                                    <div className="flex items-center justify-between px-1 text-emerald-600 dark:text-emerald-400"><span>Reddito:</span><span>+{formatEuro(grossIncome)}/m</span></div>
                                    {realEstateRent > 0 && <div className="flex items-center justify-between px-1 text-emerald-600 dark:text-emerald-400"><span>Affitti (lordo):</span><span>+{formatEuro(realEstateRent / 12)}/m</span></div>}
                                    {manualExpenses > 0 && <div className="flex items-center justify-between px-1 text-rose-500"><span>Spese personali:</span><span>-{formatEuro(manualExpenses)}/m</span></div>}
                                    {realEstateCosts > 0 && <div className="flex items-center justify-between px-1 text-rose-500"><span>Costi immobili:</span><span>-{formatEuro(realEstateCosts / 12)}/m</span></div>}
                                    {calculatedExistingInstallment > 0 && <div className="flex items-center justify-between px-1 text-rose-500"><span>Rate prestiti:</span><span>-{formatEuro(calculatedExistingInstallment)}/m</span></div>}
                                </div>
                            </>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Tabs value={activePatrimonioTab} onValueChange={(value) => setActivePatrimonioTab(value as PatrimonioTab)} className="gap-6">
                <div className="z-20 md:sticky md:top-4">
                    <div className="rounded-[2rem] border border-slate-200/80 bg-white/80 p-3 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Navigazione Patrimonio</p>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    <span>Scegli l&apos;area da aggiornare o consultare senza perdere il contesto.</span>
                                    {latestSnapshotLabel && <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Ultimo snapshot: {latestSnapshotLabel}</span>}
                                </div>
                            </div>

                            <TabsList className="grid w-full grid-cols-2 gap-2 border-none bg-transparent p-0 md:w-auto md:grid-cols-4">
                                <TabsTrigger value="overview" className={mainSectionTriggerClass}><div className="flex min-w-0 flex-col items-start gap-1"><span className="flex items-center gap-2 text-sm font-semibold"><LayoutDashboard className="size-4 shrink-0" /> <span className="truncate">Panoramica</span></span><span className="hidden truncate text-xs opacity-80 md:block">Salute finanziaria e azioni rapide</span></div></TabsTrigger>
                                <TabsTrigger value="asset" className={mainSectionTriggerClass}><div className="flex min-w-0 flex-col items-start gap-1"><span className="flex items-center gap-2 text-sm font-semibold"><HomeIcon className="size-4 shrink-0" /> <span className="truncate">Asset</span></span><span className="hidden truncate text-xs opacity-80 md:block">Immobili, investimenti e altre attivita</span></div></TabsTrigger>
                                <TabsTrigger value="cashflow" className={mainSectionTriggerClass}><div className="flex min-w-0 flex-col items-start gap-1"><span className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="size-4 shrink-0" /> <span className="truncate">Passivita & Cashflow</span></span><span className="hidden truncate text-xs opacity-80 md:block">Debiti, entrate, uscite e risparmio</span></div></TabsTrigger>
                                <TabsTrigger value="history" className={mainSectionTriggerClass}><div className="flex min-w-0 flex-col items-start gap-1"><span className="flex items-center gap-2 text-sm font-semibold"><History className="size-4 shrink-0" /> <span className="truncate">Storico</span></span><span className="hidden truncate text-xs opacity-80 md:block">Grafico e snapshot salvati</span></div></TabsTrigger>
                            </TabsList>
                        </div>
                    </div>
                </div>

                <TabsContent value="overview" className="mt-0 animate-in fade-in-50 duration-300">
                    <div className="space-y-6">
                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                            <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                                <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                    <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100"><LayoutDashboard className="size-5 text-blue-600 dark:text-blue-400" /> Cabina di Regia</CardTitle>
                                    <CardDescription className="text-sm text-slate-500">Le metriche in alto restano sempre visibili. Qui sotto trovi le scorciatoie per entrare subito nell&apos;area giusta.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5 p-6">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <Button variant="ghost" className={quickActionClass} onClick={() => { setActivePatrimonioTab("asset"); setActiveAssetSubTab("realestate"); }}><span className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-2xl bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"><HomeIcon className="size-4" /></span><span className="flex min-w-0 flex-col items-start"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Aggiorna immobili</span><span className="truncate text-xs text-slate-500 dark:text-slate-400">Valori, costi, affitti e mutui collegati</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" /></Button>
                                        <Button variant="ghost" className={quickActionClass} onClick={() => { setActivePatrimonioTab("asset"); setActiveAssetSubTab("investments"); }}><span className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-2xl bg-purple-50 p-2 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300"><PiggyBank className="size-4" /></span><span className="flex min-w-0 flex-col items-start"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Aggiorna investimenti</span><span className="truncate text-xs text-slate-500 dark:text-slate-400">ETF, azioni, liquidita e fondo emergenza</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" /></Button>
                                        <Button variant="ghost" className={quickActionClass} onClick={() => setActivePatrimonioTab("cashflow")}><span className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-2xl bg-rose-50 p-2 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><CreditCard className="size-4" /></span><span className="flex min-w-0 flex-col items-start"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Gestisci debiti</span><span className="truncate text-xs text-slate-500 dark:text-slate-400">Prestiti, rate e profilo di spesa familiare</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" /></Button>
                                        <Button variant="ghost" className={quickActionClass} onClick={() => setActivePatrimonioTab("history")}><span className="flex min-w-0 items-center gap-3"><span className="shrink-0 rounded-2xl bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"><History className="size-4" /></span><span className="flex min-w-0 flex-col items-start"><span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">Apri storico</span><span className="truncate text-xs text-slate-500 dark:text-slate-400">Grafico e modifica rapida degli snapshot salvati</span></span></span><ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" /></Button>
                                    </div>

                                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quadro rapido</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{latestSnapshotLabel ? `Hai ${history.length} snapshot salvati. L'ultimo e del ${latestSnapshotLabel}: usa lo Storico per ricaricarlo e continuare una revisione.` : "Non hai ancora uno storico completo: aggiorna gli Asset e lascia che il salvataggio automatico costruisca la tua traccia temporale."}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                                <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                    <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100"><TrendingUp className="size-5 text-blue-600 dark:text-blue-400" /> Salute Finanziaria</CardTitle>
                                    <CardDescription className="text-sm text-slate-500">Indicatori operativi per capire subito se intervenire su liquidita, spese o leva.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Cashflow Atteso</div><div className={cn("mt-3 text-2xl font-extrabold tabular-nums", monthlyCashflow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{monthlyCashflow >= 0 ? "+" : ""}{formatEuro(monthlyCashflow)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Entrate nette di affitti e redditi meno rate, immobili e spese personali.</p></div>
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Mesi di Sopravvivenza</div><div className="mt-3 flex items-end gap-2"><span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{survivalMonths.toFixed(1)}</span><span className="pb-1 text-sm text-slate-500 dark:text-slate-400">mesi</span></div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{runwayText}. Basato su liquidita e fondo emergenza utilizzabili.</p></div>
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Liquidita Utile</div><div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{formatEuro(totalLiquidForSurvival)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Disponibilita immediata per coprire spese ricorrenti o imprevisti.</p></div>
                                    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-800/60"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Peso Debiti</div><div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{debtWeightPercent.toFixed(1)}%</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Quota delle passivita rispetto agli asset che stai monitorando ora.</p></div>
                                </CardContent>
                            </Card>
                        </div>

                        <PortfolioRebalance stockValue={activeStocksValue} realEstateValue={realEstateList.reduce((acc, property) => acc + property.value, 0)} cryptoValue={bitcoinAmount * currentBtcPrice} cashValue={liquidStockValue + effectiveEmergencyFund} bondValue={safeHavens + pensionFund} />
                    </div>
                </TabsContent>

                <TabsContent value="asset" forceMount className={cn("mt-0 animate-in fade-in-50 duration-300", activePatrimonioTab !== "asset" && "hidden")}>
                    <div className="space-y-6">
                        {loadedSnapshotLabel && (
                            <div role="status" aria-live="polite" className="flex flex-col gap-3 rounded-[1.75rem] border border-blue-200 bg-blue-50/90 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/50 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-300">Snapshot in modifica</p>
                                    <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">Hai caricato lo snapshot del {loadedSnapshotLabel}. I campi qui sotto sono pronti per la revisione e il salvataggio automatico.</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-11 rounded-xl text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:text-blue-200 dark:hover:bg-blue-900/50" onClick={() => setLoadedSnapshotLabel(null)}>Nascondi</Button>
                            </div>
                        )}

                        <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                            <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                <CardTitle className="flex items-center gap-3 text-xl text-slate-900 dark:text-slate-100"><HomeIcon className="size-5 text-blue-600 dark:text-blue-400" /> Gestione Asset</CardTitle>
                                <CardDescription className="text-sm text-slate-500">Aggiorna una categoria alla volta per ridurre il rumore e mantenere il focus operativo.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 p-6">
                                <Tabs value={activeAssetSubTab} onValueChange={(value) => setActiveAssetSubTab(value as AssetSubTab)} className="gap-6">
                                    <TabsList className="grid w-full grid-cols-1 gap-2 border-none bg-transparent p-0 sm:grid-cols-3">
                                        <TabsTrigger value="realestate" className={assetSectionTriggerClass}><span className="flex items-center gap-2"><HomeIcon className="size-4" /> Immobili</span></TabsTrigger>
                                        <TabsTrigger value="investments" className={assetSectionTriggerClass}><span className="flex items-center gap-2"><PiggyBank className="size-4" /> Investimenti</span></TabsTrigger>
                                        <TabsTrigger value="other" className={assetSectionTriggerClass}><span className="flex items-center gap-2"><Gem className="size-4" /> Altri Asset</span></TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="realestate" forceMount className={cn("mt-0", activeAssetSubTab !== "realestate" && "hidden")}>
                                        <RealEstateSection realEstateList={realEstateList} existingLoansList={existingLoansList} realEstateGrossValue={realEstateGrossValue} realEstateNetValue={realEstateNetValue} person1Name={person1Name} person2Name={person2Name} onListChange={setRealEstateList} onTriggerSave={triggerSave} />
                                    </TabsContent>

                                    <TabsContent value="investments" forceMount className={cn("mt-0", activeAssetSubTab !== "investments" && "hidden")}>
                                        <StockPortfolioSection
                                            customStocksList={customStocksList}
                                            liquidStockValue={liquidStockValue}
                                            emergencyFund={emergencyFund}
                                            separateEmergencyFund={separateEmergencyFund}
                                            person1Name={person1Name}
                                            person2Name={person2Name}
                                            searchResults={searchResults}
                                            activeSearchIdx={activeSearchIdx}
                                            isSearching={isSearching}
                                            portfolioHistory={portfolioHistory}
                                            isFetchingHistory={isFetchingHistory}
                                            onStocksListChange={setCustomStocksList}
                                            onLiquidStockValueChange={setLiquidStockValue}
                                            onEmergencyFundChange={setEmergencyFund}
                                            onToggleSeparateEmergencyFund={handleToggleSeparateEmergencyFund}
                                            onSearchStocks={handleSearchStocks}
                                            onSelectStock={handleSelectStock}
                                            onTriggerSave={triggerSave}
                                        />
                                    </TabsContent>

                                    <TabsContent value="other" forceMount className={cn("mt-0", activeAssetSubTab !== "other" && "hidden")}>
                                        <div className="space-y-6">
                                            <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                                                <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                                    <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100"><Bitcoin className="mr-3 h-5 w-5 text-amber-500" /> Crypto</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-4 p-6">
                                                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/50">
                                                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Inserisci quanti Bitcoin possiede ciascuno. Il controvalore viene aggiornato con il prezzo live.</p>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{person1Name}</Label>
                                                            <div className="relative">
                                                                <Input type="number" step="0.001" value={bitcoinAmountP1} onChange={(e) => setBitcoinAmountP1(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-blue-200 bg-blue-50/50 pl-14 text-lg text-slate-900 focus-visible:ring-amber-500 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-100" />
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-600 dark:text-amber-400">BTC</div>
                                                            </div>
                                                            {currentBtcPrice > 0 && bitcoinAmountP1 > 0 && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{formatEuro(bitcoinAmountP1 * currentBtcPrice)}</p>}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{person2Name}</Label>
                                                            <div className="relative">
                                                                <Input type="number" step="0.001" value={bitcoinAmountP2} onChange={(e) => setBitcoinAmountP2(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-violet-200 bg-violet-50/50 pl-14 text-lg text-slate-900 focus-visible:ring-amber-500 dark:border-violet-900 dark:bg-violet-950/30 dark:text-slate-100" />
                                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-600 dark:text-amber-400">BTC</div>
                                                            </div>
                                                            {currentBtcPrice > 0 && bitcoinAmountP2 > 0 && <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{formatEuro(bitcoinAmountP2 * currentBtcPrice)}</p>}
                                                        </div>
                                                    </div>
                                                    {currentBtcPrice > 0 && bitcoinAmount > 0 && (
                                                        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-900 dark:bg-amber-950/40">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Totale BTC</span>
                                                            <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">{bitcoinAmount.toFixed(4)} BTC = {formatEuro(bitcoinAmount * currentBtcPrice)}</span>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>

                                            <Card className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/75 shadow-md backdrop-blur-xl transition-all duration-500 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/75">
                                                <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                                    <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100"><Gem className="mr-3 h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Altre Attivita</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-5 p-6">
                                                    <div className="space-y-3">
                                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Beni Rifugio (Oro / Orologi / Arte)</Label>
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{person1Name}</Label>
                                                                <Input type="number" value={safeHavensP1} onChange={(e) => setSafeHavensP1(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-blue-200 bg-blue-50/50 text-lg text-slate-900 focus-visible:ring-indigo-500 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-100" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{person2Name}</Label>
                                                                <Input type="number" value={safeHavensP2} onChange={(e) => setSafeHavensP2(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-violet-200 bg-violet-50/50 text-lg text-slate-900 focus-visible:ring-indigo-500 dark:border-violet-900 dark:bg-violet-950/30 dark:text-slate-100" />
                                                            </div>
                                                        </div>
                                                        {safeHavens > 0 && (
                                                            <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 dark:border-indigo-900 dark:bg-indigo-950/40">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Totale</span>
                                                                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{formatEuro(safeHavens)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                                                        <Label className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500"><Landmark className="mr-1 h-4 w-4 text-slate-500" /> TFR / Fondo Pensione</Label>
                                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">{person1Name}</Label>
                                                                <Input type="number" value={pensionFundP1} onChange={(e) => setPensionFundP1(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-blue-200 bg-blue-50/50 text-lg text-slate-900 focus-visible:ring-indigo-500 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-100" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">{person2Name}</Label>
                                                                <Input type="number" value={pensionFundP2} onChange={(e) => setPensionFundP2(Number(e.target.value))} onBlur={triggerSave} className="h-11 border-violet-200 bg-violet-50/50 text-lg text-slate-900 focus-visible:ring-indigo-500 dark:border-violet-900 dark:bg-violet-950/30 dark:text-slate-100" />
                                                            </div>
                                                        </div>
                                                        {pensionFund > 0 && (
                                                            <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 dark:border-indigo-900 dark:bg-indigo-950/40">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Totale</span>
                                                                <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{formatEuro(pensionFund)}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="cashflow" forceMount className={cn("mt-0 animate-in fade-in-50 duration-300", activePatrimonioTab !== "cashflow" && "hidden")}>
                    <div className="space-y-6">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Debito Residuo</div><div className="mt-3 text-2xl font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">{formatEuro(totalPassivita)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Somma dei debiti ancora aperti collegati a mutui e finanziamenti.</p></div>
                            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Rate Mensili Stimate</div><div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{formatEuro(calculatedExistingInstallment)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Impatto delle rate correnti sul cashflow familiare mensile.</p></div>
                            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Totale Spese</div><div className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{formatEuro(totalExpenses)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Somma di spese personali, costi immobiliari e rate automatiche.</p></div>
                            <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80"><div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Risparmio Netto</div><div className={cn("mt-3 text-2xl font-extrabold tabular-nums", netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{formatEuro(netIncome)}</div><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Reddito familiare meno spese e passivita ricorrenti ogni mese.</p></div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-start">
                            <div className="space-y-3">
                                <div className="px-1">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Profilo Familiare</p>
                                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Entrate, uscite e risparmio convivono qui per leggere subito l&apos;effetto delle tue decisioni.</p>
                                </div>
                                <FinancialProfile
                                    person1Name={person1Name}
                                    person1Income={person1Income}
                                    person2Name={person2Name}
                                    person2Income={person2Income}
                                    expensesList={expensesList}
                                    autoMonthlyRealEstateCosts={autoMonthlyRealEstateCosts}
                                    autoMonthlyLoanPayments={autoMonthlyLoanPayments}
                                    totalAutoExpenses={totalAutoExpenses}
                                    manualExpenses={manualExpenses}
                                    totalExpenses={totalExpenses}
                                    grossIncome={grossIncome}
                                    netIncome={netIncome}
                                    containerClassName="mx-0 max-w-none"
                                    onPerson1NameChange={setPerson1Name}
                                    onPerson1IncomeChange={setPerson1Income}
                                    onPerson2NameChange={setPerson2Name}
                                    onPerson2IncomeChange={setPerson2Income}
                                    onExpensesListChange={setExpensesList}
                                    onBlur={() => savePreferences(existingLoansList)}
                                />
                            </div>

                            <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/80 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                                <CardHeader className="border-b border-slate-200/80 bg-white/60 p-6 dark:border-slate-800 dark:bg-slate-800/60">
                                    <CardTitle className="flex items-center text-lg text-slate-900 dark:text-slate-100"><CreditCard className="mr-3 h-5 w-5 text-rose-600 dark:text-rose-400" /> Passivita (Debiti)</CardTitle>
                                    <CardDescription className="text-sm text-slate-500">Tutti i debiti restano qui, separati dagli asset ma sempre collegati alle metriche in alto.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 p-6">
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-900 dark:bg-rose-950/50"><p className="text-sm font-medium text-rose-700 dark:text-rose-300">Gestisci qui i tuoi mutui, finanziamenti auto e altri debiti. Il debito residuo viene sottratto automaticamente dal tuo Patrimonio Netto.</p></div>

                                    {existingLoansList.length > 0 && (
                                        <OwnerFilterBar
                                            value={debtOwnerFilter}
                                            onChange={setDebtOwnerFilter}
                                            person1Name={person1Name}
                                            person2Name={person2Name}
                                            person1Total={existingLoansList.filter(l => l.owner === "person1").reduce((acc, l) => acc + calculateRemainingDebt(l), 0)}
                                            person2Total={existingLoansList.filter(l => l.owner === "person2").reduce((acc, l) => acc + calculateRemainingDebt(l), 0)}
                                            formatValue={formatEuro}
                                            colorScheme="rose"
                                        />
                                    )}

                                    <div className="space-y-3">
                                        {existingLoansList.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">Nessun debito configurato. Se ne hai uno, aggiungilo qui per calcolare correttamente patrimonio netto e cashflow.</div>}

                                        {existingLoansList.filter(l => debtOwnerFilter === "all" || l.owner === debtOwnerFilter).map((loan) => (
                                            <div key={loan.id} className="rounded-2xl border border-slate-200/80 bg-white/70 p-3 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50">
                                                <div className="mb-2">
                                                    <OwnerBadgeSelect
                                                        value={loan.owner}
                                                        onChange={(owner: AssetOwner) => {
                                                            const updated = existingLoansList.map(l => l.id === loan.id ? { ...l, owner } : l);
                                                            setExistingLoansList(updated);
                                                            savePreferences(updated);
                                                        }}
                                                        person1Name={person1Name}
                                                        person2Name={person2Name}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-800 dark:text-slate-200">{loan.name}</span>
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:bg-slate-700 dark:text-slate-300">{loan.category}</span>
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                                        <span>Rata: <strong className="text-rose-600 dark:text-rose-400">{formatEuro(loan.installment)}</strong></span>
                                                        <span className="flex items-center"><Calendar className="mr-1 h-3 w-3" /> {loan.endDate}</span>
                                                    </div>
                                                </div>

                                                <div className="border-l border-slate-100 px-3 dark:border-slate-700">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Debito Residuo</div>
                                                    {editingDebtId === loan.id ? (
                                                        <Input
                                                            type="number"
                                                            autoFocus
                                                            value={editingDebtValue}
                                                            onChange={(e) => setEditingDebtValue(e.target.value)}
                                                            onBlur={() => {
                                                                const val = Number(editingDebtValue);
                                                                const updated = existingLoansList.map((item) => (item.id === loan.id ? { ...item, currentRemainingDebt: val || 0 } : item));
                                                                setExistingLoansList(updated);
                                                                savePreferences(updated);
                                                                setEditingDebtId(null);
                                                                if (val > 0) toast.success("Debito residuo aggiornato");
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                                                if (e.key === "Escape") setEditingDebtId(null);
                                                            }}
                                                            className="h-8 w-28 border-rose-200 bg-rose-50/60 text-right text-xs font-bold text-rose-600 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                                                        />
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="cursor-pointer text-sm font-extrabold text-rose-600 underline-offset-2 hover:underline dark:text-rose-400"
                                                            title="Clicca per modificare"
                                                            onClick={() => {
                                                                setEditingDebtId(loan.id);
                                                                setEditingDebtValue(loan.currentRemainingDebt ? String(loan.currentRemainingDebt) : String(Math.round(calculateRemainingDebt(loan))));
                                                            }}
                                                        >
                                                            {formatEuro(calculateRemainingDebt(loan))}
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="ml-2 flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-400 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300" onClick={() => { setEditingLoan(loan); setIsLoanModalOpen(true); }}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-rose-400 hover:text-rose-600 dark:text-rose-400" onClick={() => handleRemoveLoan(loan.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                </div>
                                            </div>
                                        ))}

                                        <Button variant="outline" className="w-full border-2 border-dashed py-6 text-slate-500 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-950/70" onClick={() => { setEditingLoan(null); setNewLoan(initialLoanState); setIsLoanModalOpen(true); }}>
                                            <Plus className="mr-2 h-4 w-4" /> Aggiungi Debito / Mutuo
                                        </Button>
                                    </div>

                                    <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
                                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/50">
                                            <span className="text-sm font-bold uppercase text-slate-600 dark:text-slate-400">Totale Passivita</span>
                                            <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{formatEuro(totalPassivita)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0 animate-in fade-in-50 duration-300">
                    <div className="space-y-6">
                        <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
                            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Storico Patrimonio</p>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Leggi il trend e poi agisci: da qui puoi riaprire uno snapshot per modificarlo senza perdere il sottotab asset che stavi usando.</p>
                        </div>

                        <Card className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/75 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/75">
                            <CardHeader className="border-b border-slate-200/80 bg-white/60 px-6 py-6 dark:border-slate-800 dark:bg-slate-800/60 md:px-8">
                                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div>
                                        <CardTitle className="flex items-center text-2xl font-bold text-slate-900 dark:text-slate-100"><LineChartIcon className="mr-3 h-6 w-6 text-blue-600 dark:text-blue-400" /> Andamento nel Tempo</CardTitle>
                                        <CardDescription className="mt-1 text-sm text-slate-500">Traccia la crescita del tuo patrimonio netto inserendo periodicamente dei nuovi snapshot.</CardDescription>
                                    </div>
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">{history.length > 0 ? `${history.length} snapshot salvati` : "Nessuno snapshot ancora salvato"}</div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-2 pt-8 md:p-8">
                                {loading ? (
                                    <Skeleton className="h-[400px] w-full rounded-2xl bg-slate-100/80 dark:bg-slate-800/50" />
                                ) : history.length === 0 ? (
                                    <div role="status" className="flex h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/80 text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
                                        <LineChartIcon className="mb-4 h-12 w-12 text-slate-400 opacity-50" aria-hidden="true" />
                                        <p className="font-medium text-slate-700 dark:text-slate-300">Nessun dato storico.</p>
                                        <p className="text-sm">Salva il tuo primo snapshot per iniziare il tracciamento!</p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="sr-only">Grafico storico del patrimonio con serie dedicate a patrimonio totale, debiti, immobili, liquidita, altre attivita e bitcoin.</p>
                                        <div className="h-[450px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                                                    <defs>
                                                        <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                                                        <linearGradient id="colorDebiti" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} /></linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                                                    <YAxis tickFormatter={(val) => `EUR ${Math.round(val / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dx={-10} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.96)", backdropFilter: "blur(16px)", borderRadius: "1rem", border: "1px solid rgba(148,163,184,0.18)", boxShadow: "0 20px 40px -10px rgba(0,0,0,0.12)", color: "#e2e8f0" }}
                                                        labelStyle={{ fontWeight: "bold", color: "#0f172a", marginBottom: "8px" }}
                                                        itemStyle={{ color: "#334155", border: "none" }}
                                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                        formatter={(value: any) => [formatEuro(Number(value)), undefined]}
                                                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                                                    />
                                                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: "12px", fontWeight: 600, color: "#475569", paddingBottom: "20px" }} />
                                                    <Area type="monotone" dataKey="Patrimonio" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPatrimonio)" activeDot={{ r: 8, strokeWidth: 0, fill: "#10b981", filter: "drop-shadow(0 0 10px rgba(16,185,129,0.4))" }} />
                                                    <Area type="monotone" dataKey="Debiti" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDebiti)" activeDot={false} />
                                                    <Line type="monotone" dataKey="Immobili" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="Liquidita" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="AltreAttivita" stroke="#64748b" strokeWidth={2} dot={false} />
                                                    <Line type="monotone" dataKey="Bitcoin" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <SnapshotHistoryTable history={history} onEdit={editSnapshot} onDelete={handleDelete} />
                    </div>
                </TabsContent>
            </Tabs>

            <LoanManagerModal
                isOpen={isLoanModalOpen}
                onOpenChange={setIsLoanModalOpen}
                editingLoan={editingLoan}
                newLoan={newLoan}
                person1Name={person1Name}
                person2Name={person2Name}
                onEditingLoanChange={setEditingLoan}
                onNewLoanChange={setNewLoan}
                onAdd={handleAddLoan}
                onUpdate={handleUpdateLoan}
            />
        </div>
    );
}
