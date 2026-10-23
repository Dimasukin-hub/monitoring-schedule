import { parseDateDMY } from '@/lib/landActivityUtils';

/**
 * Saklar Utama (Feature Flag):
 * Ubah menjadi `false` kapan pun jika ingin mematikan sistem kalkulasi otomatis ini
 * dan kembali 100% manual tanpa merusak fitur lainnya.
 */
export const ENABLE_AUTO_CASCADE_RENCANA = true;

/**
 * Aturan Standar Interval Hari (Lead Time SOP):
 * 1. Chopper ke Dolomit: 3 hari
 * 2. Chopper ke Chopper Lu: 3 hari
 * 3. Chopper Lu ke RH1: 3 hari (Chopper Lu + 3 hari = Chopper + 6 hari)
 * 4. Chopper ke Bajak (MB 5 BTR): 40 hari
 * 5. Bajak ke Subsoil (SS1): 3 hari (Bajak + 3 hari = Chopper + 43 hari)
 * 6. Subsoil ke Finishing Rotary (Rotary FH1): 3 hari (Subsoil + 3 hari = Chopper + 46 hari)
 * 7. Finishing Rotary ke Ridger: 3 hari (Rotary FH1 + 3 hari = Chopper + 49 hari)
 * 8. Ridger ke Jalan & Sal: 7 hari (Ridger + 7 hari = Chopper + 56 hari)
 */
export const CASCADE_INTERVALS = {
  CHOPPER_TO_DOLOMIT_DAYS: 3,
  CHOPPER_TO_CHOPPER_LU_DAYS: 3,
  CHOPPER_LU_TO_RH1_DAYS: 3,
  CHOPPER_TO_BAJAK_DAYS: 40,
  BAJAK_TO_SUBSOIL_DAYS: 3,
  SUBSOIL_TO_ROTARY_DAYS: 3,
  ROTARY_TO_RIDGER_DAYS: 3,
  RIDGER_TO_JALAN_SAL_DAYS: 7,
};

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDateDMY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
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
 * Menghitung seluruh tanggal rencana tahapan berikutnya berdasarkan tanggal Rencana Chopper.
 * Jika input tanggal tidak valid atau fitur dinonaktifkan, fungsi ini mengembalikan null.
 */
export function calculateCascadeRencanaDates(
  chopperDateStr: string | null | undefined
): CascadeRencanaResult | null {
  if (!ENABLE_AUTO_CASCADE_RENCANA) return null;
  if (!chopperDateStr) return null;

  const chopperDate = parseDateDMY(chopperDateStr);
  if (!chopperDate) return null;

  // 1. Dolomit = Chopper + 3 hari
  const dolomitDate = addDays(chopperDate, CASCADE_INTERVALS.CHOPPER_TO_DOLOMIT_DAYS);

  // 2. Chopper Lu = Chopper + 3 hari
  const chopperLuDate = addDays(chopperDate, CASCADE_INTERVALS.CHOPPER_TO_CHOPPER_LU_DAYS);

  // 3. RH1 = Chopper Lu + 3 hari
  const rh1Date = addDays(chopperLuDate, CASCADE_INTERVALS.CHOPPER_LU_TO_RH1_DAYS);

  // 4. Bajak (MB 5 BTR) = Chopper + 40 hari
  const bajakDate = addDays(chopperDate, CASCADE_INTERVALS.CHOPPER_TO_BAJAK_DAYS);

  // 5. Subsoil (SS1) = Bajak + 3 hari
  const subsoilDate = addDays(bajakDate, CASCADE_INTERVALS.BAJAK_TO_SUBSOIL_DAYS);

  // 6. Finishing Rotary (Rotary FH1) = Subsoil + 3 hari
  const rotaryDate = addDays(subsoilDate, CASCADE_INTERVALS.SUBSOIL_TO_ROTARY_DAYS);

  // 7. Ridger = Finishing Rotary + 3 hari
  const ridgerDate = addDays(rotaryDate, CASCADE_INTERVALS.ROTARY_TO_RIDGER_DAYS);

  // 8. Jalan & Sal = Ridger + 7 hari
  const jalanSalDate = addDays(ridgerDate, CASCADE_INTERVALS.RIDGER_TO_JALAN_SAL_DAYS);

  return {
    chopper: formatDateDMY(chopperDate),
    dolomit: formatDateDMY(dolomitDate),
    chopperLu: formatDateDMY(chopperLuDate),
    rh1: formatDateDMY(rh1Date),
    bajakMb5Btr: formatDateDMY(bajakDate),
    subsoilerSs1: formatDateDMY(subsoilDate),
    finishingRotaryFh1: formatDateDMY(rotaryDate),
    ridger: formatDateDMY(ridgerDate),
    jalanSal: formatDateDMY(jalanSalDate),
  };
}
