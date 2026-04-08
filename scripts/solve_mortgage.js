const P0 = 112000;
const rate = 0.0037;
const i = rate / 12;
const total_months = 360;
const months_passed = 56;
const target_debt = 109505;
const target_rata = 126.08;

// Hypothesis 1: Fixed annual growth rate g. Inst = Inst_prev * (1+g) every 12 months.
function testHypothesis1() {
  let closestDist = Infinity;
  let bestG = 0;
  let bestInitialRata = 0;
  let bestSim = null;

  for (let g = 0; g <= 0.10; g += 0.0001) {
    // We need to find initial rata R0 such that debt reaches 0 at month 360
    // Actually, R0 is mathematically determined by g to pay off P0.
    // Sum from m=1 to 360 of (R_m / (1+i)^m) = P0
    let discountSum = 0;
    for (let m = 0; m < total_months; m++) {
      let year = Math.floor(m / 12);
      let r_factor = Math.pow(1 + g, year);
      discountSum += r_factor / Math.pow(1 + i, m + 1);
    }
    let R0 = P0 / discountSum;
    
    // Now simulate to month 56
    let currentDebt = P0;
    let currentRata = 0;
    for (let m = 0; m < months_passed; m++) {
      let year = Math.floor(m / 12);
      currentRata = R0 * Math.pow(1 + g, year);
      let interest = currentDebt * i;
      let principal = currentRata - interest;
      currentDebt -= principal;
    }
    
    // Check next rata (month 56)
    let year56 = Math.floor(months_passed / 12);
    let rata56 = R0 * Math.pow(1 + g, year56);
    
    let dist = Math.abs(currentDebt - target_debt) + Math.abs(rata56 - target_rata) * 100;
    if (dist < closestDist) {
      closestDist = dist;
      bestG = g;
      bestInitialRata = R0;
      bestSim = { currentDebt, rata56 };
    }
  }
  return { theory: "Annual % Growth", bestG, bestInitialRata, bestSim, closestDist };
}

// Hypothesis 2: Fixed amount growth D. Inst = Inst_prev + D every 12 months.
function testHypothesis2() {
  let closestDist = Infinity;
  let bestD = 0;
  let bestInitialRata = 0;
  let bestSim = null;

  for (let D = 0; D <= 20; D += 0.1) {
    let discountSumR0 = 0;
    let discountSumD = 0;
    for (let m = 0; m < total_months; m++) {
      let year = Math.floor(m / 12);
      discountSumR0 += 1 / Math.pow(1 + i, m + 1);
      discountSumD += year / Math.pow(1 + i, m + 1);
    }
    let R0 = (P0 - D * discountSumD) / discountSumR0;
    
    let currentDebt = P0;
    let currentRata = 0;
    for (let m = 0; m < months_passed; m++) {
      let year = Math.floor(m / 12);
      currentRata = R0 + D * year;
      let interest = currentDebt * i;
      let principal = currentRata - interest;
      currentDebt -= principal;
    }
    
    let year56 = Math.floor(months_passed / 12);
    let rata56 = R0 + D * year56;
    
    let dist = Math.abs(currentDebt - target_debt) + Math.abs(rata56 - target_rata) * 100;
    if (dist < closestDist) {
      closestDist = dist;
      bestD = D;
      bestInitialRata = R0;
      bestSim = { currentDebt, rata56 };
    }
  }
  return { theory: "Annual Amount Growth", bestD, bestInitialRata, bestSim, closestDist };
}

console.log("Hypothesis 1:", testHypothesis1());
console.log("Hypothesis 2:", testHypothesis2());
