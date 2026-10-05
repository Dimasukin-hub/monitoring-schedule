/**
 * Utility functions for computing and sorting "Aktivitas Terakhir" on Lands
 * sesuai PRD Bab 17.
 */

export const PIPELINE_ORDER = [
  'Persiapan Bongkar',
  'Chopper',
  'Chopper Lu',
  'RH1',
  'Cutting Banana',
  'Aplikasi Dolomit',
  'DP 1',
  'DP Cross',
  'DP 2',
  'Belerang',
  'Kompos',
  'Bajak Awal',
  'MB 5 BTR',
  'MB 2.5',
  'MPH',
  'NARDI',
  'HR EKS MB',
  'Subsoiler',
  'SS1',
  'SS2',
  'Finishing Harrow',
  'Finishing Rotary',
  'Rotary FH1',
  'Rotary FH2',
  'Ridger',
  'Jalan & Saluran',
  'Siap Tanam',
  'Proses Tanam',
  'Selesai Tanam',
];

export interface LandForAktivitasCalculation {
  progressTanam?: number | null;
  aplikasiTerakhir?: string | null;
  realBajak?: string | null;
  realMulaiTanam?: string | null;
  realSelesaiTanam?: string | null;
  aplikasiDetails?: any;
  activities?: Array<{
    code: string;
    status?: string | null;
    realisasiDate?: string | null;
  }>;
  // Flat properties as used in LandTable state
  chopper?: { real?: string | null; status?: string };
  chopperLu?: { real?: string | null; status?: string };
  rh1?: { real?: string | null; status?: string };
  cuttingBanana?: { real?: string | null; status?: string };
  dolomit?: { real?: string | null; status?: string };
  dp1?: { real?: string | null; status?: string };
  dpCross?: { real?: string | null; status?: string };
  dp2?: { real?: string | null; status?: string };
  belerang?: { real?: string | null; status?: string };
  kompos?: { real?: string | null; status?: string };
  bajakAwal?: { real?: string | null; status?: string };
  bajakAwalMb5Btr?: { real?: string | null; status?: string };
  bajakAwalMb25?: { real?: string | null; status?: string };
  bajakAwalMph?: { real?: string | null; status?: string };
  bajakAwalNardi?: { real?: string | null; status?: string };
  hrEksMb?: { real?: string | null; status?: string };
  subsoiler?: { real?: string | null; status?: string };
  subsoilerSs1?: { real?: string | null; status?: string };
  subsoilerSs2?: { real?: string | null; status?: string };
  finishingHarrow?: { real?: string | null; status?: string };
  finishingRotary?: { real?: string | null; status?: string };
  finishingRotaryFh1?: { real?: string | null; status?: string };
  finishingRotaryFh2?: { real?: string | null; status?: string };
  rotaryFh2?: { real?: string | null; status?: string };
  ridger?: string | { real?: string | null; status?: string } | null;
  jalanSal?: string | { real?: string | null; status?: string } | null;
  siapTanam?: string | { real?: string | null; status?: string } | null;
  prosesTanam?: string | { real?: string | null; status?: string } | null;
  selesaiTanam?: string | { real?: string | null; status?: string } | null;
  [key: string]: any;
}

export function isValidDate(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'object' && val !== null) {
    return isValidDate(val.real);
  }
  const s = String(val).trim();
  if (!s || s === '-' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') {
    return false;
  }
  const lower = s.toLowerCase();

  // Explicit negative flags or text descriptions that are not dates
  if (
    lower.includes('tidak') ||
    lower.includes('tdk') ||
    lower.includes('batal') ||
    lower.includes('belum') ||
    lower.includes('cancel') ||
    lower.includes('rotary ridger') ||
    lower.includes('60cm') ||
    lower.includes('separuh') ||
    lower.includes('tandem') ||
    lower.includes('sisa') ||
    lower.includes('setelah') ||
    lower.includes('rch')
  ) {
    return false;
  }

  if (lower === 'sudah') return true;

  // Must contain at least one digit and a date separator (/ or -)
  if (/\d/.test(s) && (s.includes('/') || s.includes('-'))) {
    return true;
  }

  return false;
}

export function computeAktivitasTerakhir(land: LandForAktivitasCalculation): string {
  const actDict: Record<string, { status?: string | null; real?: string | null }> = {};
  if (land.activities && Array.isArray(land.activities)) {
    for (const a of land.activities) {
      actDict[a.code] = {
        status: a.status,
        real: a.realisasiDate,
      };
    }
  }

  const appDetails = (typeof land.aplikasiDetails === 'object' && land.aplikasiDetails !== null) ? land.aplikasiDetails : {};
  const appReal = (typeof appDetails.realisasiAplikasi === 'object' && appDetails.realisasiAplikasi !== null) ? appDetails.realisasiAplikasi : {};

  // Helper to extract effective real value with explicit object override
  const getActReal = (flatKey: string, detailsKey: string, code?: string): any => {
    // 1. Direct flat property on land
    if (land[flatKey] !== undefined) {
      const flatVal = land[flatKey];
      if (flatVal !== null && typeof flatVal === 'object' && 'real' in flatVal) {
        return flatVal.real;
      }
      return flatVal;
    }
    // 2. Activity dictionary if available
    if (code && actDict[code]) {
      return actDict[code].real;
    }
    // 3. Fallback to aplikasiDetails
    if (appDetails[detailsKey] !== undefined) {
      return appDetails[detailsKey];
    }
    if (appReal[detailsKey] !== undefined) {
      return appReal[detailsKey];
    }
    return null;
  };

  const selesaiReal = getActReal('selesaiTanam', 'realSelesaiTanam', '24.SLS_TANAM') || land.realSelesaiTanam;
  const prosesReal = getActReal('prosesTanam', 'realMulaiTanam', '23.PROSES_TNM') || land.realMulaiTanam;
  const siapReal = getActReal('siapTanam', 'realSiapTanam', '22.SIAP_TANAM');
  const jalanSalReal = getActReal('jalanSal', 'realJalanSal', '22.JALAN_SAL') || land.realJalanSal;
  const ridgerReal = getActReal('ridger', 'realRidger', '21.RIDGER') || land.realRidger;

  // Priority from end to beginning (Bab 17 PRD)
  // 1. Selesai Tanam
  if (
    isValidDate(selesaiReal) ||
    isValidDate(land.realSelesaiTanam) ||
    (land.progressTanam === 100 && (isValidDate(prosesReal) || isValidDate(land.realMulaiTanam)))
  ) {
    return 'Selesai Tanam';
  }

  // 2. Proses Tanam (hanya jika ada tanggal realisasi mulai tanam)
  if (
    isValidDate(prosesReal) ||
    isValidDate(land.realMulaiTanam)
  ) {
    return 'Proses Tanam';
  }

  // 3. Siap Tanam
  if (isValidDate(siapReal)) {
    return 'Siap Tanam';
  }

  // 4. Jalan & Saluran
  if (isValidDate(jalanSalReal)) {
    return 'Jalan & Saluran';
  }

  // 5. Ridger
  if (isValidDate(ridgerReal)) {
    return 'Ridger';
  }

  // 6. Rotary FH2
  const rotaryFh2Real = getActReal('rotaryFh2', 'realRotaryFh2', '20.ROTARY_FH2') ||
    getActReal('finishingRotaryFh2', 'realRotaryFh2') || land.realRotaryFh2;
  if (isValidDate(rotaryFh2Real)) {
    return 'Rotary FH2';
  }

  // 7. Rotary FH1
  const rotaryFh1Real = getActReal('finishingRotaryFh1', 'realFinishingRotaryFh1') || land.realFinishingRotaryFh1;
  if (isValidDate(rotaryFh1Real)) {
    return 'Rotary FH1';
  }

  // 8. Finishing Rotary (Generic)
  const finishingRotaryReal = getActReal('finishingRotary', 'realFinishingRotary', '19.FINISHING_ROTARY');
  if (isValidDate(finishingRotaryReal)) {
    return 'Finishing Rotary';
  }

  // 9. Finishing Harrow
  const finishingHarrowReal = getActReal('finishingHarrow', 'realFhHarrow', '18.FINISHING_HARROW') || land.realFhHarrow;
  if (isValidDate(finishingHarrowReal)) {
    return 'Finishing Harrow';
  }

  // 10. SS2
  const ss2Real = getActReal('subsoilerSs2', 'realSubsoilerSs2') || land.realSubsoilerSs2;
  if (isValidDate(ss2Real)) {
    return 'SS2';
  }

  // 11. SS1
  const ss1Real = getActReal('subsoilerSs1', 'realSubsoilerSs1') || land.realSubsoilerSs1;
  if (isValidDate(ss1Real)) {
    return 'SS1';
  }

  // 12. Subsoiler (Generic)
  const subsoilerReal = getActReal('subsoiler', 'realSubsoiler', '17.SUBSOILER');
  if (isValidDate(subsoilerReal)) {
    return 'Subsoiler';
  }

  // 13. HR EKS MB
  const hrEksMbReal = getActReal('hrEksMb', 'realHrEksMb') || land.realHrEksMb;
  if (isValidDate(hrEksMbReal)) {
    return 'HR EKS MB';
  }

  // 14. NARDI
  const nardiReal = getActReal('bajakAwalNardi', 'realBajakAwalNardi') || land.realBajakAwalNardi;
  if (isValidDate(nardiReal)) {
    return 'NARDI';
  }

  // 15. MPH
  const mphReal = getActReal('bajakAwalMph', 'realBajakAwalHoward') || land.realBajakAwalHoward;
  if (isValidDate(mphReal)) {
    return 'MPH';
  }

  // 16. MB 2.5
  const mb25Real = getActReal('bajakAwalMb25', 'realBajakAwalMb25') || land.realBajakAwalMb25;
  if (isValidDate(mb25Real)) {
    return 'MB 2.5';
  }

  // 17. MB 5 BTR
  const mb5BtrReal = getActReal('bajakAwalMb5Btr', 'realBajakAwalMb5Btr') || land.realBajakAwalMb5Btr;
  if (isValidDate(mb5BtrReal)) {
    return 'MB 5 BTR';
  }

  // 18. Bajak Awal (Generic)
  const bajakAwalReal = getActReal('bajakAwal', 'realBajak', '11.BAJAK_AWAL') || land.realBajak;
  if (isValidDate(bajakAwalReal)) {
    return 'Bajak Awal';
  }

  // 19. Kompos
  const komposReal = getActReal('kompos', 'realKompos', '10.KOMPOS') || appDetails.realKompos2;
  if (isValidDate(komposReal)) {
    return 'Kompos';
  }

  // 20. Belerang
  const belerangReal = getActReal('belerang', 'realBelerang', '09.BELERANG');
  if (isValidDate(belerangReal)) {
    return 'Belerang';
  }

  // 21. DP 2
  const dp2Real = getActReal('dp2', 'realDp2', '08.DP2');
  if (isValidDate(dp2Real)) {
    return 'DP 2';
  }

  // 22. DP Cross
  const dpCrossReal = getActReal('dpCross', 'realDpCross', '07.DP_CROSS');
  if (isValidDate(dpCrossReal)) {
    return 'DP Cross';
  }

  // 23. DP 1
  const dp1Real = getActReal('dp1', 'realDp1', '06.DP1');
  if (isValidDate(dp1Real)) {
    return 'DP 1';
  }

  // 24. Aplikasi Dolomit
  const dolomitReal = getActReal('dolomit', 'realDolomit', '05.DOLOMIT');
  if (isValidDate(dolomitReal)) {
    return 'Aplikasi Dolomit';
  }

  // 25. Cutting Banana
  const cuttingBananaReal = getActReal('cuttingBanana', 'realCuttingBanana', '04.CUTTING_BANANA');
  if (isValidDate(cuttingBananaReal)) {
    return 'Cutting Banana';
  }

  // 26. RH1
  const rh1Real = getActReal('rh1', 'realRh1', '03.RH1');
  if (isValidDate(rh1Real)) {
    return 'RH1';
  }

  // 27. Chopper Lu
  const chopperLuReal = getActReal('chopperLu', 'realChopperLu', '02.CHOPPER_LU');
  if (isValidDate(chopperLuReal)) {
    return 'Chopper Lu';
  }

  // 28. Chopper
  const chopperReal = getActReal('chopper', 'realChopper', '01.CHOPPER');
  if (isValidDate(chopperReal)) {
    return 'Chopper';
  }

  return 'Persiapan Bongkar';
}

export function sortAktivitasTerakhirList(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const idxA = PIPELINE_ORDER.indexOf(a);
    const idxB = PIPELINE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}
