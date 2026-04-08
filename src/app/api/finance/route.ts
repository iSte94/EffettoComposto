import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, payload } = body;

        if (action === 'calculate_mortgage') {
            const { principal, rate, years, monthlyIncome } = payload;

            const P = Number(principal);
            const r = (Number(rate) / 100) / 12;
            const n = Number(years) * 12;

            // Calculate monthly payment
            const payment = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

            // Calculate DTI
            const dtiRatio = (payment / Number(monthlyIncome)) * 100;

            // Amortization logic (heavy compute can be deferred to server)
            let balance = P;
            const schedule = [];
            for (let month = 1; month <= n; month++) {
                const interest = balance * r;
                const principalPaid = payment - interest;
                balance -= principalPaid;

                schedule.push({
                    month,
                    payment,
                    principalPaid,
                    interest,
                    balance: Math.max(0, balance)
                });
            }

            return NextResponse.json({
                success: true,
                data: {
                    monthlyPayment: payment,
                    dtiRatio,
                    schedule, // Fully generated schedule
                }
            });
        }

        if (action === 'calculate_fire') {
            const { currentAge, currentSavings, monthlyContribution, annualReturn, targetExpenses, withdrawalRate } = payload;

            const targetFIRE = (Number(targetExpenses) * 12) / (Number(withdrawalRate) / 100);

            let balance = Number(currentSavings);
            let age = Number(currentAge);
            let hitFire = false;
            let fireAge = null;
            const projections = [];

            // 60-year Monte-Carlo or standard projection
            for (let i = 0; i <= 60; i++) {
                projections.push({
                    age,
                    balance: Math.round(balance),
                    fireTarget: targetFIRE
                });

                if (balance >= targetFIRE && !hitFire) {
                    hitFire = true;
                    fireAge = age;
                }

                const yearlyContribution = Number(monthlyContribution) * 12;
                balance = (balance + yearlyContribution) * (1 + Number(annualReturn) / 100);
                age++;
            }

            return NextResponse.json({
                success: true,
                data: {
                    fireNumber: targetFIRE,
                    fireAge,
                    projections
                }
            });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Errore server' }, { status: 500 });
    }
}
