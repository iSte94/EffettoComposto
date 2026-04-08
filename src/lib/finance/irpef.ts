export function calculateIrpef(grossIncome: number, pensionContribution: number = 0) {
  // 2024/2025 brackets
  const taxableIncome = Math.max(0, grossIncome - pensionContribution);
  let tax = 0;

  if (taxableIncome <= 28000) {
    tax = taxableIncome * 0.23;
  } else if (taxableIncome <= 50000) {
    tax = 28000 * 0.23 + (taxableIncome - 28000) * 0.35;
  } else {
    tax = 28000 * 0.23 + 22000 * 0.35 + (taxableIncome - 50000) * 0.43;
  }

  return tax;
}

