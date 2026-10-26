/**
 * Rumus Kalkulasi Jadwal Rencana & Rencana Bero
 * Sesuai Simulasi Excel Rencana Lahan:
 * 1. Kolom Rencana Bero (input manual hari) & Rencana Chopper (input manual tanggal).
 * 2. Interval:
 *    - Dolomit: +5 hari
 *    - MB 5 BTR: +40 hari
 *    - SS1: +3 hari
 *    - Rotary FH 1: -7 hari (dari Ridger)
 *    - Ridger: -7 hari (dari Jalan & Sal)
 * 3. Dinamika:
 *    - Rencana Jalan & Sal = Rencana Chopper + Rencana Bero
 *    - Rencana Dolomit = IF(Real Chopper="", Rencana Chopper + 5, Real Chopper + 5)
 *    - Rencana MB 5 BTR = IF(Real Chopper="", Rencana Chopper + 40, Real Chopper + 40)
 *    - Rencana SS1 = IF(Real MB 5 BTR="", Rencana MB 5 BTR + 3, Real MB 5 BTR + 3)
 *    - Rencana Ridger = IF(Real Rotary FH 1="", Rencana Jalan & Sal - 7, Rencana Jalan & Sal - round((Rencana Jalan & Sal - Real Rotary FH 1) / 2))
 *    - Rencana Rotary FH 1 = Rencana Ridger - 7
 *    - Rencana Bero Bongkar = IF(Real Jalan & Sal="", Rencana Jalan & Sal - Real Chopper, Real Jalan & Sal - Real Chopper)
 * 4. Peringatan / Warning:
 *    - Jika Rencana Rotary FH 1 < Real SS1, muncul warning penyesuaian rencana bero.
 */

export const ENABLE_AUTO_CASCADE_RENCANA = true;

export const SCHEDULE_INTERVALS = {
  DOLOMIT_DAYS: 5,
  MB5BTR_DAYS: 40,
  SS1_DAYS: 3,
  ROTARY_FH1_FROM_RIDGER_DAYS: -7,
  RIDGER_FROM_JALAN_SAL_DAYS: -7,
  CHOPPER_LU_DAYS: 3,
  RH1_DAYS: 3,
};

// Backward compatibility alias
export const CASCADE_INTERVALS = {
  CHOPPER_TO_DOLOMIT_DAYS: 5,
  CHOPPER_TO_CHOPPER_LU_DAYS: 3,
  CHOPPER_LU_TO_RH1_DAYS: 3,
  CHOPPER_TO_BAJAK_DAYS: 40,
  BAJAK_TO_SUBSOIL_DAYS: 3,
  SUBSOIL_TO_ROTARY_DAYS: -7,
  ROTARY_TO_RIDGER_DAYS: -7,
  RIDGER_TO_JALAN_SAL_DAYS: -7,
};

export function parseDateFlexible(dStr: any): Date | null {
  if (!dStr) return null;
  if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
  const clean = String(dStr).trim();
  if (!clean || clean === '-' || clean === '0' || clean.toLowerCase() === 'null' || clean.toLowerCase() === 'undefined') {
    return null;
  }

  // Handle DD/MM/YYYY
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;
      if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
      } else {
        // DD-MM-YYYY
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
      }
    }
  }
  return null;
}

export function formatDateDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function diffDays(d1: Date, d2: Date): number {
  const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return Math.round((utc1 - utc2) / (1000 * 60 * 60 * 24));
}

export interface LandScheduleInputs {
  rencanaChopper?: string | null;       // M9 (Input manual)
  rencanaBero?: number | string | null; // V8 (Input manual hari)
  realChopper?: string | null;          // M10 (Input manual)
  realMb5Btr?: string | null;           // P10 (Input manual)
  realSs1?: string | null;              // Q10 (Input manual)
  realRotaryFh1?: string | null;        // S10 (Input manual)
  realJalanSal?: string | null;         // U10 (Input manual)
  // Fallback existing dates jika input parsial:
  existingRencanaJalanSal?: string | null;
  existingRencanaRidger?: string | null;
  existingRencanaRotaryFh1?: string | null;
  existingRencanaDolomit?: string | null;
  existingRencanaMb5Btr?: string | null;
  existingRencanaSs1?: string | null;
}

export interface LandScheduleOutputs {
  rencanaChopper: string | null;
  rencanaBero: number | null;
  rencanaJalanSal: string | null;
  rencanaDolomit: string | null;
  rencanaMb5Btr: string | null;
  rencanaSs1: string | null;
  rencanaRidger: string | null;
  rencanaRotaryFh1: string | null;
  rencanaChopperLu: string | null;
  rencanaRh1: string | null;
  rencanaBeroBongkar: number | null;
  hasBeroWarning: boolean;
  beroWarningMessage: string | null;
}

/**
 * Menghitung seluruh tanggal rencana, interval, rencana bero bongkar,
 * dan deteksi warning secara akurat berdasarkan SOP Excel Simulasi Rencana Lahan.
 */
export function calculateLandPlanSchedule(inputs: LandScheduleInputs): LandScheduleOutputs {
  const rencChopperDate = parseDateFlexible(inputs.rencanaChopper);
  const realChopperDate = parseDateFlexible(inputs.realChopper);
  const realMb5BtrDate = parseDateFlexible(inputs.realMb5Btr);
  const realSs1Date = parseDateFlexible(inputs.realSs1);
  const realRotaryFh1Date = parseDateFlexible(inputs.realRotaryFh1);
  const realJalanSalDate = parseDateFlexible(inputs.realJalanSal);

  const rawBero = inputs.rencanaBero;
  const rencanaBero =
    rawBero !== null && rawBero !== undefined && rawBero !== '' && !isNaN(Number(rawBero))
      ? Number(rawBero)
      : null;

  // 1. Rencana Jalan & Sal (U9) = M9 + V8 (Tgl Rencana Chopper + Rencana Bero hari)
  let rencJalanSalDate: Date | null = null;
  if (rencChopperDate && rencanaBero !== null) {
    rencJalanSalDate = addDays(rencChopperDate, rencanaBero);
  } else if (inputs.existingRencanaJalanSal) {
    rencJalanSalDate = parseDateFlexible(inputs.existingRencanaJalanSal);
  }

  // 2. Rencana Dolomit (N9) = IF(M10="", M9+5, M10+5)
  let rencDolomitDate: Date | null = null;
  if (realChopperDate) {
    rencDolomitDate = addDays(realChopperDate, SCHEDULE_INTERVALS.DOLOMIT_DAYS);
  } else if (rencChopperDate) {
    rencDolomitDate = addDays(rencChopperDate, SCHEDULE_INTERVALS.DOLOMIT_DAYS);
  } else if (inputs.existingRencanaDolomit) {
    rencDolomitDate = parseDateFlexible(inputs.existingRencanaDolomit);
  }

  // 3. Rencana MB 5 BTR (P9) = IF(M10="", M9+40, M10+40)
  let rencMb5BtrDate: Date | null = null;
  if (realChopperDate) {
    rencMb5BtrDate = addDays(realChopperDate, SCHEDULE_INTERVALS.MB5BTR_DAYS);
  } else if (rencChopperDate) {
    rencMb5BtrDate = addDays(rencChopperDate, SCHEDULE_INTERVALS.MB5BTR_DAYS);
  } else if (inputs.existingRencanaMb5Btr) {
    rencMb5BtrDate = parseDateFlexible(inputs.existingRencanaMb5Btr);
  }

  // 4. Rencana SS1 (Q9) = IF(P10="", P9+3, P10+3)
  let rencSs1Date: Date | null = null;
  if (realMb5BtrDate) {
    rencSs1Date = addDays(realMb5BtrDate, SCHEDULE_INTERVALS.SS1_DAYS);
  } else if (rencMb5BtrDate) {
    rencSs1Date = addDays(rencMb5BtrDate, SCHEDULE_INTERVALS.SS1_DAYS);
  } else if (inputs.existingRencanaSs1) {
    rencSs1Date = parseDateFlexible(inputs.existingRencanaSs1);
  }

  // 5. Rencana Ridger (T9) = IF(S10="", U9+T5, (U9-((U9-S10)/2))) (T5 = -7)
  let rencRidgerDate: Date | null = null;
  if (rencJalanSalDate) {
    if (!realRotaryFh1Date) {
      // Real Rotary FH 1 kosong -> Rencana Jalan & Sal - 7 hari
      rencRidgerDate = addDays(rencJalanSalDate, SCHEDULE_INTERVALS.RIDGER_FROM_JALAN_SAL_DAYS);
    } else {
      // Real Rotary FH 1 terisi -> Rencana Jalan & Sal - round((Rencana Jalan & Sal - Real Rotary FH 1) / 2)
      const diff = diffDays(rencJalanSalDate, realRotaryFh1Date);
      const half = Math.round(diff / 2);
      rencRidgerDate = addDays(rencJalanSalDate, -half);
    }
  } else if (inputs.existingRencanaRidger) {
    rencRidgerDate = parseDateFlexible(inputs.existingRencanaRidger);
  }

  // 6. Rencana Rotary FH 1 (S9) = T9 + S5 (S5 = -7)
  let rencRotaryFh1Date: Date | null = null;
  if (rencRidgerDate) {
    rencRotaryFh1Date = addDays(rencRidgerDate, SCHEDULE_INTERVALS.ROTARY_FH1_FROM_RIDGER_DAYS);
  } else if (inputs.existingRencanaRotaryFh1) {
    rencRotaryFh1Date = parseDateFlexible(inputs.existingRencanaRotaryFh1);
  }

  // Standard Pipeline Chopper Lu & RH1
  let rencChopperLuDate: Date | null = null;
  let rencRh1Date: Date | null = null;
  if (rencChopperDate) {
    rencChopperLuDate = addDays(rencChopperDate, SCHEDULE_INTERVALS.CHOPPER_LU_DAYS);
    rencRh1Date = addDays(rencChopperLuDate, SCHEDULE_INTERVALS.RH1_DAYS);
  }

  // 7. Rencana Bero Bongkar (W8) = IF(U10="", U9-M10, U10-M10)
  let rencanaBeroBongkar: number | null = null;
  if (realChopperDate) {
    if (realJalanSalDate) {
      rencanaBeroBongkar = diffDays(realJalanSalDate, realChopperDate);
    } else if (rencJalanSalDate) {
      rencanaBeroBongkar = diffDays(rencJalanSalDate, realChopperDate);
    }
  } else if (rencChopperDate && rencJalanSalDate) {
    // Fallback bila real chopper belum ada (atau sama dengan rencanaBero)
    rencanaBeroBongkar = diffDays(rencJalanSalDate, rencChopperDate);
  }

  // 8. Warning Peringatan: jika tanggal rencana rotary FH 1 < tanggal real SS1
  let hasBeroWarning = false;
  let beroWarningMessage: string | null = null;
  if (rencRotaryFh1Date && realSs1Date) {
    if (rencRotaryFh1Date.getTime() < realSs1Date.getTime()) {
      hasBeroWarning = true;
      beroWarningMessage = `Peringatan: Penyesuaian Rencana Bero (Tgl Rencana Rotary FH 1: ${formatDateDMY(rencRotaryFh1Date)} < Tgl Real SS1: ${formatDateDMY(realSs1Date)})`;
    }
  }

  return {
    rencanaChopper: rencChopperDate ? formatDateDMY(rencChopperDate) : (inputs.rencanaChopper || null),
    rencanaBero,
    rencanaJalanSal: rencJalanSalDate ? formatDateDMY(rencJalanSalDate) : null,
    rencanaDolomit: rencDolomitDate ? formatDateDMY(rencDolomitDate) : null,
    rencanaMb5Btr: rencMb5BtrDate ? formatDateDMY(rencMb5BtrDate) : null,
    rencanaSs1: rencSs1Date ? formatDateDMY(rencSs1Date) : null,
    rencanaRidger: rencRidgerDate ? formatDateDMY(rencRidgerDate) : null,
    rencanaRotaryFh1: rencRotaryFh1Date ? formatDateDMY(rencRotaryFh1Date) : null,
    rencanaChopperLu: rencChopperLuDate ? formatDateDMY(rencChopperLuDate) : null,
    rencanaRh1: rencRh1Date ? formatDateDMY(rencRh1Date) : null,
    rencanaBeroBongkar,
    hasBeroWarning,
    beroWarningMessage,
  };
}

export interface CascadeRencanaResult {
  chopper: string;
  dolomit: string;
  chopperLu: string;
  rh1: string;
  bajakMb5Btr: string;
  subsoilerSs1: string;
  finishingRotaryFh1: string;
  ridger: string;
  jalanSal: string;
}

/**
 * Menghitung seluruh tanggal rencana tahapan berikutnya berdasarkan tanggal Rencana Chopper
 * dan nilai Rencana Bero (default 100 hari).
 */
export function calculateCascadeRencanaDates(
  chopperDateStr: string | null | undefined,
  rencanaBeroDays: number | null = 100
): CascadeRencanaResult | null {
  if (!ENABLE_AUTO_CASCADE_RENCANA) return null;
  if (!chopperDateStr) return null;

  const res = calculateLandPlanSchedule({
    rencanaChopper: chopperDateStr,
    rencanaBero: rencanaBeroDays ?? 100,
  });

  if (!res.rencanaChopper) return null;

  return {
    chopper: res.rencanaChopper,
    dolomit: res.rencanaDolomit || '',
    chopperLu: res.rencanaChopperLu || '',
    rh1: res.rencanaRh1 || '',
    bajakMb5Btr: res.rencanaMb5Btr || '',
    subsoilerSs1: res.rencanaSs1 || '',
    finishingRotaryFh1: res.rencanaRotaryFh1 || '',
    ridger: res.rencanaRidger || '',
    jalanSal: res.rencanaJalanSal || '',
  };
}
