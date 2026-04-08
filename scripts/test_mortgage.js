const P = 110000;
const i = (2.5 / 100) / 12;
const n = 360; // 30 years
const k = 56; // months passed

const factorN = Math.pow(1 + i, n);
const factorK = Math.pow(1 + i, k);
const debtRemaining = P * ((factorN - factorK) / (factorN - 1));
const payment = (P * i * factorN) / (factorN - 1);

console.log("Payment:", Math.round(payment));
console.log("Remaining Debt:", Math.round(debtRemaining));
