// === Tipi condivisi per l'intera applicazione ===

// Re-export ExistingLoan dalla libreria finance (source of truth)
export type { ExistingLoan } from '@/lib/finance/loans';

export interface AssetRecord {
    id: string;
    date: string;
    realEstateValue: number;
    realEstateCosts: number;
    realEstateRent: number;
    liquidStockValue: number;
    stocksSnapshotValue: number;
    safeHavens: number;
    emergencyFund: number;
    pensionFund: number;
    debtsTotal: number;
    bitcoinAmount: number;
    bitcoinPrice: number;
    realEstateList?: string;
    customStocksList?: string;
    totalNetWorth?: number; // Calcolato lato client
}

export type AssetOwner = "person1" | "person2";

export interface RealEstateProperty {
    id: string;
    name: string;
    value: number;
    costs: number; // Condominio e spese fisse
    imu?: number;
    isPrimaryResidence?: boolean;
    rent: number;
    isRented?: boolean;
    rentStartDate?: string; // YYYY-MM
    linkedLoanId?: string;
    owner?: AssetOwner;
}

export interface CustomStock {
    id: string;
    ticker: string;
    shares: number;
    currentPrice?: number;
    manualValue?: number;
    dividendYield?: number;
    annualDividend?: number;
    isLoading?: boolean;
    owner?: AssetOwner;
}

export interface MonthlyExpense {
    id: string;
    name: string;
    amount: number;
    isAnnual?: boolean;
}

export interface FinancialSnapshot {
    totalAssets: number;
    totalDebts: number;
    netWorth: number;
    liquidAssets: number;
    emergencyFund: number;
    monthlyIncome: number;
    realEstateValue: number;
    // Patrimonio al netto degli immobili (quello realmente "investibile"/mobilizzabile)
    investableAssets: number;         // totalAssets - realEstateValue
    investableNetWorth: number;       // investableAssets - totalDebts
    // Dati estesi per Consulente (calcolati dal resto dell'app)
    monthlyExpenses: number;          // Somma expensesList (mensilizzata)
    monthlySavings: number;           // netIncome - expenses - rate prestiti esistenti
    existingLoansMonthlyPayment: number; // Totale rate prestiti esistenti
    currentDTI: number;               // Rata esistente / reddito (0-1)
    existingLoansCount: number;       // Numero prestiti in corso (per pesatura verdetto)
    // FIRE context
    birthYear: number | null;
    currentAge: number | null;
    retirementAge: number;
    expectedMonthlyExpensesAtFire: number;
    fireWithdrawalRate: number;       // %
    fireExpectedReturn: number;       // %
    expectedInflation: number;        // %
}

export type PurchaseCategory = "auto" | "immobile" | "arredamento" | "altro";

export interface PurchaseSimulation {
    category: PurchaseCategory;
    itemName: string;
    totalPrice: number;
    downPayment: number;
    financingRate: number;
    financingYears: number;
    isFinanced: boolean;
    // Auto-specific
    annualInsurance: number;
    annualMaintenance: number;
    monthlyFuel: number;
    depreciationRate: number;
    // Immobile-specific
    monthlyRent: number;
    condominiumFees: number;
    imuTax: number;
    // Arredamento-specific
    usefulLifeYears: number;
}

export interface Advice {
    type: "success" | "warning" | "danger" | "info";
    title: string;
    message: string;
    icon: React.ReactNode;
}

export interface AcceptedPurchase {
    id: string;
    acceptedAt: string; // ISO date
    category: PurchaseCategory;
    itemName: string;
    totalPrice: number;
    downPayment: number;
    isFinanced: boolean;
    financingRate: number;
    financingYears: number;
    monthlyPayment: number;
    totalInterest: number;
    totalTCO: number;
    // Linked loan ID (if financed, auto-created in existingLoansList)
    linkedLoanId?: string;
}
