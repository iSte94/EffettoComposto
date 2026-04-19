import { describe, it, expect } from 'vitest';
import { calculateNetSalary } from './irpef';

describe('Calcolatore Stipendio Netto 2026', () => {
    
  // ===== TEST INPS =====
  
  it('INPS standard 9.19% (Privato <15 dipendenti)', () => {
    const res = calculateNetSalary({ ral: 30000, contractType: 'standard', applyCuneoFiscale: false });
    expect(res.inpsDipendente).toBeCloseTo(2757, 0); // 30000 * 0.0919
  });

  it('INPS apprendistato 5.84%', () => {
    const res = calculateNetSalary({ ral: 25000, contractType: 'apprendistato', applyCuneoFiscale: false });
    expect(res.inpsDipendente).toBeCloseTo(1460, 0); // 25000 * 0.0584
  });

  it('INPS pubblico 8.80%', () => {
    const res = calculateNetSalary({ ral: 35000, contractType: 'pubblico', applyCuneoFiscale: false });
    expect(res.inpsDipendente).toBeCloseTo(3080, 0); // 35000 * 0.088
  });

  it('INPS azienda >15 dipendenti 9.49%', () => {
    const res = calculateNetSalary({ ral: 50000, contractType: 'over15', applyCuneoFiscale: false });
    expect(res.inpsDipendente).toBeCloseTo(4745, 0); // 50000 * 0.0949
  });

  // ===== TEST SCAGLIONI IRPEF 2026 (23% / 33% / 43%) =====

  it('IRPEF primo scaglione: 23% su imponibile ≤ 28k', () => {
    // RAL 30k standard → imponibile 27.243 < 28k → tutto al 23%
    const res = calculateNetSalary({ ral: 30000, contractType: 'standard', applyCuneoFiscale: false });
    expect(res.irpefLorda).toBeCloseTo(6265.89, 0); // 27243 * 0.23
  });

  it('IRPEF secondo scaglione 2026: 33% (NON 35%)', () => {
    // RAL 50k over15 → imponibile 45.255
    // 28000*0.23 + (45255-28000)*0.33 = 6440 + 5694.15 = 12134.15
    const res = calculateNetSalary({ ral: 50000, contractType: 'over15', applyCuneoFiscale: false });
    expect(res.irpefLorda).toBeCloseTo(12134, 0);
  });

  it('IRPEF terzo scaglione: 43% su imponibile > 50k', () => {
    // RAL 60k standard → imponibile 54.486
    // 28000*0.23 + 22000*0.33 + (54486-50000)*0.43 = 6440 + 7260 + 1928.98 = 15628.98
    const res = calculateNetSalary({ ral: 60000, contractType: 'standard', applyCuneoFiscale: false });
    expect(res.irpefLorda).toBeCloseTo(15629, 0);
  });

  // ===== TEST CUNEO FISCALE 2026 =====

  it('riduzione INPS 7 punti per RAL ≤ 20k', () => {
    const res = calculateNetSalary({ ral: 20000, contractType: 'standard', applyCuneoFiscale: true });
    // INPS senza cuneo: 20000*0.0919 = 1838
    // Con cuneo: 20000*(0.0919-0.07) = 20000*0.0219 = 438
    expect(res.inpsDipendente).toBeCloseTo(438, 0);
  });

  it('detrazione cuneo piena 1.000€ per RAL tra 20k e 32k', () => {
    const res = calculateNetSalary({ ral: 30000, applyCuneoFiscale: true });
    expect(res.detrazioneCuneo).toBeCloseTo(1000, 0);
  });

  it('detrazione cuneo decrescente per RAL tra 32k e 40k', () => {
    // 36000 → 1000 * (40000-36000)/8000 = 500
    const res = calculateNetSalary({ ral: 36000, applyCuneoFiscale: true });
    expect(res.detrazioneCuneo).toBeCloseTo(500, 0);
  });

  it('detrazione cuneo zero per RAL > 40k', () => {
    const res = calculateNetSalary({ ral: 45000, applyCuneoFiscale: true });
    expect(res.detrazioneCuneo).toBe(0);
  });

  // ===== TEST DETRAZIONI LAVORO DIPENDENTE =====

  it('detrazioni massime per reddito ≤ 15k', () => {
    const res = calculateNetSalary({ ral: 10000, applyCuneoFiscale: true });
    expect(res.detrazioniLavoro).toBe(1955);
  });

  it('detrazioni decrescenti nella fascia 15k-28k', () => {
    // RAL 30k standard senza cuneo → imponibile 27.243
    const res = calculateNetSalary({ ral: 30000, contractType: 'standard', applyCuneoFiscale: false });
    // 1910 + 1190 * (28000-27243)/13000 + 65 = 1910 + 69.27 + 65 = 2044.27
    expect(res.detrazioniLavoro).toBeCloseTo(2044, 0);
  });

  it('detrazioni zero per imponibile > 50k', () => {
    const res = calculateNetSalary({ ral: 60000, contractType: 'standard', applyCuneoFiscale: false });
    expect(res.detrazioniLavoro).toBe(0);
  });

  // ===== TEST TRATTAMENTO INTEGRATIVO (Bonus 100€) =====

  it('bonus 100€ per imponibile ≤ 15k con capienza IRPEF', () => {
    // RAL 15k standard → cuneo riduce INPS, imponibile potrebbe salire
    // Ma se cuneo spento → 15000 * 0.9081 = 13621.5 → IRPEF lorda 3132.95, detr. 1955 → capienza ok
    const res = calculateNetSalary({ ral: 15000, contractType: 'standard', applyCuneoFiscale: false, applyBonus100: true });
    expect(res.trattamentoIntegrativo).toBe(1200);
  });

  it('no bonus 100€ per imponibile > 15k', () => {
    const res = calculateNetSalary({ ral: 30000, applyBonus100: true });
    expect(res.trattamentoIntegrativo).toBe(0);
  });

  // ===== TEST QUADRO COMPLETO (confronto con Stipendee 2026) =====

  it('caso completo: RAL 30k, 14 men, standard (benchmark Stipendee)', () => {
    const res = calculateNetSalary({
      ral: 30000, mensilita: 14, contractType: 'standard',
      applyCuneoFiscale: true, applyBonus100: true
      // Addizionali non impostate → 0, per isolare dal fattore regione
    });
    
    expect(res.inpsDipendente).toBeCloseTo(2757, 0);
    expect(res.imponibileIrpef).toBeCloseTo(27243, 0);
    expect(res.irpefLorda).toBeCloseTo(6266, 0);
    expect(res.detrazioneCuneo).toBeCloseTo(1000, 0);
    expect(res.detrazioniLavoro).toBeCloseTo(2044, 0);
    // Netto senza addizionali: 27243 - (6266 - 2044 - 1000) - 0 + 0 = 24021
    expect(res.nettoAnnuale).toBeCloseTo(24021, 0);
    expect(res.nettoMensile).toBeCloseTo(1716, 0);
  });

  it('caso completo: RAL 50k, 13 men, over15 (benchmark Stipendee)', () => {
    const res = calculateNetSalary({
      ral: 50000, mensilita: 13, contractType: 'over15',
      applyCuneoFiscale: true, applyBonus100: true
    });
    
    expect(res.inpsDipendente).toBeCloseTo(4745, 0);
    expect(res.imponibileIrpef).toBeCloseTo(45255, 0);
    expect(res.irpefLorda).toBeCloseTo(12134, 0); // 33% secondo scaglione 2026
    expect(res.detrazioneCuneo).toBe(0);          // RAL > 40k
  });

  // ===== TEST MENSILITA =====

  it('mensilita 12 divide correttamente il netto', () => {
    const res12 = calculateNetSalary({ ral: 30000, mensilita: 12 });
    const res14 = calculateNetSalary({ ral: 30000, mensilita: 14 });
    // Stesso netto annuo, diverse rate mensili
    expect(res12.nettoAnnuale).toBeCloseTo(res14.nettoAnnuale, 0);
    expect(res12.nettoMensile).toBeGreaterThan(res14.nettoMensile);
    expect(res12.nettoMensile).toBeCloseTo(res12.nettoAnnuale / 12, 2);
    expect(res14.nettoMensile).toBeCloseTo(res14.nettoAnnuale / 14, 2);
  });

  // ===== TEST ADDIZIONALI =====

  it('addizionali calcolate correttamente sull\'imponibile', () => {
    const res = calculateNetSalary({
      ral: 30000, contractType: 'standard', applyCuneoFiscale: false,
      aliquotaAddizionaleRegionale: 0.015,
      aliquotaAddizionaleComunale: 0.008
    });
    // Imponibile: 27243, addizionali: 27243 * (0.015 + 0.008) = 27243 * 0.023 = 626.59
    expect(res.addizionali).toBeCloseTo(626.59, 0);
  });

  it('zero addizionali se non specificate', () => {
    const res = calculateNetSalary({ ral: 30000, contractType: 'standard' });
    expect(res.addizionali).toBe(0);
  });

  // ===== REGRESSION: nessun "cliff" al confine 28k tra secondo e terzo scaglione =====

  it('REGRESSION: nessun cliff di detrazioni al confine 28k — il reddito netto non cala attraversando la soglia', () => {
    // RAL che porta imponibile appena sotto 28k vs appena sopra 28k (senza cuneo, senza bonus)
    // imponibileIrpef = RAL * (1 - 0.0919) → RAL ≈ 30833 dà imponibile ≈ 28000
    const justBelow = calculateNetSalary({ ral: 30830, contractType: 'standard', applyCuneoFiscale: false, applyBonus100: false });
    const justAbove = calculateNetSalary({ ral: 30840, contractType: 'standard', applyCuneoFiscale: false, applyBonus100: false });

    // justBelow.imponibileIrpef < 28000 (secondo scaglione detrazioni)
    // justAbove.imponibileIrpef > 28000 (terzo scaglione detrazioni)
    expect(justBelow.imponibileIrpef).toBeLessThan(28000);
    expect(justAbove.imponibileIrpef).toBeGreaterThan(28000);

    // Il reddito netto deve crescere (o restare stabile) al crescere del reddito lordo.
    // Un cliff negativo (nettoAnnuale che cala) indica che le detrazioni hanno una
    // discontinuità al confine: il terzo scaglione usa 1910 come coefficiente mentre
    // il secondo scaglione termina a 1975 (1910 + 65), causando un salto brusco.
    expect(justAbove.nettoAnnuale).toBeGreaterThanOrEqual(justBelow.nettoAnnuale);
  });

});
