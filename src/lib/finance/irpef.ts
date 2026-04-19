export interface SalaryConfig {
  ral: number;
  mensilita?: number; // 12, 13, 14
  contractType?: 'standard' | 'apprendistato' | 'pubblico' | 'over15';
  aliquotaAddizionaleRegionale?: number; // Es. 0.0143 per 1.43%
  aliquotaAddizionaleComunale?: number;  // Es. 0.002 per 0.2%
  applyBonus100?: boolean;
  applyCuneoFiscale?: boolean;
}

export interface SalaryResult {
  ral: number;
  lordoMensile: number;
  inpsDipendente: number;
  imponibileIrpef: number;
  irpefLorda: number;
  detrazioniLavoro: number;
  detrazioneCuneo: number;
  irpefNetta: number;
  addizionali: number;
  trattamentoIntegrativo: number; // Ex Bonus Renzi 100€
  nettoAnnuale: number;
  nettoMensile: number;
}

export function calculateNetSalary(config: SalaryConfig): SalaryResult {
  const ral = config.ral;
  const mensilita = config.mensilita || 14;
  
  const lordoMensile = ral / mensilita;

  // 1. Contributi INPS
  let aliquotaInps = 0.0919; // standard
  if (config.contractType === 'apprendistato') aliquotaInps = 0.0584;
  else if (config.contractType === 'pubblico') aliquotaInps = 0.0880;
  else if (config.contractType === 'over15') aliquotaInps = 0.0949;

  let inpsDipendente = ral * aliquotaInps;

  // Applicazione esonero INPS (Cuneo Fiscale 2025/2026 componente contributiva)
  if (config.applyCuneoFiscale !== false) {
    if (ral <= 20000) {
      // "Fino a 7 punti percentuali per RAL fino a 20.000€"
      const inpsReduction = Math.min(0.07, aliquotaInps);
      inpsDipendente -= (ral * inpsReduction); 
    }
  }

  // 2. Imponibile IRPEF
  const imponibileIrpef = Math.max(0, ral - inpsDipendente);

  // 3. IRPEF Lorda (Scaglioni 2026: 23%, 33%, 43%)
  let irpefLorda = 0;
  if (imponibileIrpef <= 28000) {
    irpefLorda = imponibileIrpef * 0.23;
  } else if (imponibileIrpef <= 50000) {
    irpefLorda = (28000 * 0.23) + ((imponibileIrpef - 28000) * 0.33);
  } else {
    irpefLorda = (28000 * 0.23) + (22000 * 0.33) + ((imponibileIrpef - 50000) * 0.43);
  }

  // 4. Detrazioni Lavoro Dipendente
  let detrazioniLavoro = 0;
  if (imponibileIrpef <= 15000) {
    detrazioniLavoro = 1955;
  } else if (imponibileIrpef <= 28000) {
    // Aggiunto il +65 per matchare al 100% le direttive aggiornate della curva 2025/2026
    detrazioniLavoro = 1910 + 1190 * ((28000 - imponibileIrpef) / 13000) + 65; 
  } else if (imponibileIrpef <= 50000) {
    // Coefficiente 1975 (= 1910 + 65) per garantire continuità al confine 28k:
    // il secondo scaglione termina a 1975, quindi il terzo deve iniziare da 1975.
    // Usare 1910 qui creava un cliff di €65 in cui guadagnare un euro in più a
    // 28.001€ di imponibile aumentava l'IRPEF netta di €65, riducendo il netto.
    detrazioniLavoro = 1975 * ((50000 - imponibileIrpef) / 22000);
  }

  // 5. Detrazione Cuneo Fiscale (2025/2026) in quota IRPEF
  let detrazioneCuneo = 0;
  if (config.applyCuneoFiscale !== false) {
    if (ral > 20000 && ral <= 32000) {
      detrazioneCuneo = 1000;
    } else if (ral > 32000 && ral <= 40000) {
      detrazioneCuneo = 1000 * ((40000 - ral) / 8000);
    }
  }

  // IRPEF Netta (garantendo che non scenda sotto zero a causa delle detrazioni)
  const irpefNetta = Math.max(0, irpefLorda - detrazioniLavoro - detrazioneCuneo);

  // 6. Addizionali Regionali e Comunali
  let addizionali = 0;
  if (config.aliquotaAddizionaleRegionale || config.aliquotaAddizionaleComunale) {
      const addReg = config.aliquotaAddizionaleRegionale ?? 0;
      const addCom = config.aliquotaAddizionaleComunale ?? 0;
      addizionali = imponibileIrpef * (addReg + addCom);
  }

  // 7. Trattamento Integrativo (Bonus 100€ / Bonus Renzi)
  // Spetta se l'IRPEF lorda è superiore alle detrazioni lavoro (capienza fiscale)
  // e il reddito complessivo non supera i 15.000€
  let trattamentoIntegrativo = 0;
  if (config.applyBonus100 !== false) {
    if (imponibileIrpef <= 15000 && irpefLorda > detrazioniLavoro) {
      trattamentoIntegrativo = 1200;
    }
  }

  // 8. Netto Finale
  const nettoAnnuale = imponibileIrpef - irpefNetta - addizionali + trattamentoIntegrativo;
  const nettoMensile = nettoAnnuale / mensilita;

  return {
    ral,
    lordoMensile,
    inpsDipendente,
    imponibileIrpef,
    irpefLorda,
    detrazioniLavoro,
    detrazioneCuneo,
    irpefNetta,
    addizionali,
    trattamentoIntegrativo,
    nettoAnnuale,
    nettoMensile
  };
}

/**
 * Calcolo IRPEF puro (senza detrazioni/cuneo) — retrocompatibilità con fire-dashboard.
 * Scaglioni 2026: 23% fino a 28k, 33% fino a 50k, 43% oltre.
 */
export function calculateIrpef(grossIncome: number, pensionContribution: number = 0): number {
  const taxableIncome = Math.max(0, grossIncome - pensionContribution);
  let tax = 0;

  if (taxableIncome <= 28000) {
    tax = taxableIncome * 0.23;
  } else if (taxableIncome <= 50000) {
    tax = 28000 * 0.23 + (taxableIncome - 28000) * 0.33;
  } else {
    tax = 28000 * 0.23 + 22000 * 0.33 + (taxableIncome - 50000) * 0.43;
  }

  return tax;
}
