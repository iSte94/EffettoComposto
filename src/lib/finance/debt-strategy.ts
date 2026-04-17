export interface Debt {
    id: string;
    name: string;
    balance: number;
    rate: number;
    minPayment: number;
}

export interface PayoffResult {
    months: number;
    totalInterest: number;
    order: string[];
}

export function simulatePayoff(debts: Debt[], strategy: "snowball" | "avalanche", extraMonthly: number): PayoffResult {
    const validDebts = debts.filter((d) => d.balance > 0);
    if (validDebts.length === 0) return { months: 0, totalInterest: 0, order: [] };

    const sorted = [...validDebts].sort((a, b) => (strategy === "snowball" ? a.balance - b.balance : b.rate - a.rate));
    const order = sorted.map((debt) => debt.name);

    const balances = new Map(sorted.map((debt) => [debt.id, debt.balance]));
    const rates = new Map(sorted.map((debt) => [debt.id, Math.max(0, debt.rate) / 100 / 12]));
    const mins = new Map(sorted.map((debt) => [debt.id, Math.max(0, debt.minPayment)]));

    const totalMinimums = sorted.reduce((sum, debt) => sum + (mins.get(debt.id) || 0), 0);
    const hasBudget = totalMinimums + extraMonthly > 0;
    if (!hasBudget) {
        return { months: 600, totalInterest: 0, order };
    }

    let totalInterest = 0;
    let months = 0;
    const maxMonths = 600;

    while (months < maxMonths) {
        const activeDebts = sorted.filter((debt) => (balances.get(debt.id) || 0) > 0.005);
        if (activeDebts.length === 0) break;

        months++;

        for (const debt of activeDebts) {
            const balance = balances.get(debt.id) || 0;
            const interest = balance * (rates.get(debt.id) || 0);
            totalInterest += interest;
            balances.set(debt.id, balance + interest);
        }

        let budget = totalMinimums + extraMonthly;
        for (const debt of activeDebts) {
            const balance = balances.get(debt.id) || 0;
            const minimum = Math.min(mins.get(debt.id) || 0, balance);
            balances.set(debt.id, balance - minimum);
            budget -= minimum;
        }

        if (budget > 0) {
            for (const debt of sorted) {
                const balance = balances.get(debt.id) || 0;
                if (balance <= 0.005) continue;
                const payment = Math.min(budget, balance);
                balances.set(debt.id, balance - payment);
                budget -= payment;
                if (budget <= 0) break;
            }
        }
    }

    return { months, totalInterest, order };
}
