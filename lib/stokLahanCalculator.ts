import { STOK_LAHAN_EXCEL_DATA } from './stokLahanData';

export interface MonthActivity {
  bongkar: number;
  bajak: number;
  sn: number;
  tanam: number;
  totalStokLahan: number;
}

export interface MonthStok {
  bongkar: number;
  bajak: number;
  sn: number;
  total: number;
}

export interface MonthData {
  monthIndex: number;
  monthName: string;
  activities: MonthActivity;
  stok: MonthStok;
}

export interface YearStokData {
  year: number;
  initialStok: {
    bongkar: number;
    bajak: number;
    sn: number;
    total: number;
  };
  totalActivities: {
    bongkar: number;
    bajak: number;
    sn: number;
    tanam: number;
    totalStokLahan: number;
  };
  monthly: Record<string, MonthData>;
}

const typedStokData = STOK_LAHAN_EXCEL_DATA as unknown as Record<string, YearStokData>;

export const AVAILABLE_STOK_YEARS = [2026];
export const ALL_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

/**
 * Mendapatkan singkatan nama bulan berjalan saat ini secara otomatis (Okt, Nov, Des, dst.)
 * berdasarkan kalender sistem.
 */
export function getCurrentMonthName(): string {
  const m = new Date().getMonth(); // 0 = Jan ... 9 = Okt, 10 = Nov, dst.
  return ALL_MONTH_NAMES[m] || 'Okt';
}

/**
 * Mendapatkan tahun berjalan saat ini (misal 2026).
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

export interface StokLahanSummaryResult {
  year: number;
  month: string; // 'ALL' or specific month like 'Jan', 'Feb', etc.
  monthLabel: string;
  stokLahan: {
    value: number;
    formula: string;
    details: {
      bongkar: number;
      bajak: number;
      sn: number;
      tanam: number;
    };
  };
  stokBongkar: {
    value: number;
    formula: string;
    initialCarryover?: number;
    prevMonthStok?: number;
  };
  stokBajak: {
    value: number;
    formula: string;
    initialCarryover?: number;
    prevMonthStok?: number;
  };
  stokSN: {
    value: number;
    formula: string;
    initialCarryover?: number;
    prevMonthStok?: number;
  };
  totalStok: {
    value: number;
    formula: string;
  };
  monthlyBreakdown?: Array<{
    month: string;
    monthIndex: number;
    monthYear: string;
    bongkar: number;
    bajak: number;
    sn: number;
    tanam: number;
    stokBongkar: number;
    stokBajak: number;
    stokSN: number;
    totalStok: number;
    stokBongkarFormula?: string;
    stokBajakFormula?: string;
    stokSNFormula?: string;
  }>;
  availableYears: number[];
  availableMonths: string[];
}

function fmt(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates stock numbers exactly matching sheet 'Stok Lahan' in Excel Schedule 2026 Update 09.
 *
 * Formulas behind the system:
 * 1. Stok Lahan = Bongkar + Bajak + Sn + Tanam (monthly or full year total)
 * 2. Stok Bongkar (m) = Stok Bongkar (m-1) + Bongkar(m) - Bajak(m)
 * 3. Stok Bajak (m) = Stok Bajak (m-1) + Bajak(m) - Sn(m)
 * 4. Stok SN (m) = Stok SN (m-1) + Sn(m) - Tanam(m)
 * 5. Total Stok (m) = Stok Bongkar(m) + Stok Bajak(m) + Stok SN(m)
 */
export function getStokLahanSummary(
  targetYear: number = 2026,
  targetMonth: string = 'CURRENT'
): StokLahanSummaryResult {
  const safeYear = AVAILABLE_STOK_YEARS.includes(targetYear) ? targetYear : 2026;
  const yearData = typedStokData[String(safeYear)];

  if (!yearData) {
    throw new Error(`Data stok lahan tahun ${safeYear} tidak ditemukan`);
  }

  // Jika targetMonth adalah 'CURRENT' atau string kosong, otomatis gunakan bulan berjalan saat ini (Okt, Nov, dst)
  let resolvedMonth = targetMonth;
  if (!resolvedMonth || resolvedMonth === 'CURRENT' || resolvedMonth === 'DEFAULT') {
    resolvedMonth = getCurrentMonthName();
  }

  const monthList = resolvedMonth
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);

  const isAllMonths =
    resolvedMonth === 'ALL' ||
    resolvedMonth === 'LATEST_YEAR' ||
    (monthList.length === ALL_MONTH_NAMES.length && !monthList.includes('CURRENT')) ||
    monthList.includes('ALL');

  if (isAllMonths) {
    // Akumulasi / Full Year view
    const act = yearData.totalActivities;
    const novStok = yearData.monthly['Nov']?.stok || yearData.initialStok;
    const decAct = yearData.monthly['Des']?.activities || { bongkar: 0, bajak: 0, sn: 0, tanam: 0 };
    const decStok = yearData.monthly['Des']?.stok || {
      bongkar: 0,
      bajak: 0,
      sn: 0,
      total: 0,
    };

    return {
      year: safeYear,
      month: 'ALL',
      monthLabel: `Tahun ${safeYear} (Semua Bulan)`,
      stokLahan: {
        value: Math.round(act.totalStokLahan * 100) / 100,
        formula: `Bongkar (${fmt(act.bongkar)}) + Bajak (${fmt(act.bajak)}) + SN (${fmt(act.sn)}) + Tanam (${fmt(act.tanam)})`,
        details: {
          bongkar: act.bongkar,
          bajak: act.bajak,
          sn: act.sn,
          tanam: act.tanam,
        },
      },
      stokBongkar: {
        value: decStok.bongkar,
        formula: `${fmt(novStok.bongkar)} (Stok Bongkar) + ${fmt(decAct.bongkar)} (Bongkar) - ${fmt(decAct.bajak)} (Bajak)`,
        initialCarryover: yearData.initialStok.bongkar,
      },
      stokBajak: {
        value: decStok.bajak,
        formula: `${fmt(novStok.bajak)} (Stok Bajak) + ${fmt(decAct.bajak)} (Bajak) - ${fmt(decAct.sn)} (SN)`,
        initialCarryover: yearData.initialStok.bajak,
      },
      stokSN: {
        value: decStok.sn,
        formula: `${fmt(novStok.sn)} (Stok SN) + ${fmt(decAct.sn)} (SN) - ${fmt(decAct.tanam)} (Tanam)`,
        initialCarryover: yearData.initialStok.sn,
      },
      totalStok: {
        value: decStok.total,
        formula: `Bongkar (${fmt(decStok.bongkar)}) + Bajak (${fmt(decStok.bajak)}) + SN (${fmt(decStok.sn)})`,
      },
      availableYears: AVAILABLE_STOK_YEARS,
      availableMonths: ALL_MONTH_NAMES,
    };
  }

  // Single or multiple months
  const selectedMonthNames = ALL_MONTH_NAMES.filter((m) => monthList.includes(m));
  if (selectedMonthNames.length === 0) {
    return getStokLahanSummary(safeYear, 'ALL');
  }

  let totalBongkar = 0;
  let totalBajak = 0;
  let totalSn = 0;
  let totalTanam = 0;

  for (const m of selectedMonthNames) {
    const mData = yearData.monthly[m];
    if (mData) {
      totalBongkar += mData.activities.bongkar;
      totalBajak += mData.activities.bajak;
      totalSn += mData.activities.sn;
      totalTanam += mData.activities.tanam;
    }
  }

  const latestMonthName = selectedMonthNames[selectedMonthNames.length - 1];
  const latestMonthData = yearData.monthly[latestMonthName];
  const stok = latestMonthData ? latestMonthData.stok : { bongkar: 0, bajak: 0, sn: 0, total: 0 };

  const totalActLahan = totalBongkar + totalBajak + totalSn + totalTanam;

  const monthLabel =
    selectedMonthNames.length === 1
      ? `${selectedMonthNames[0]} ${safeYear}`
      : selectedMonthNames.length <= 3
      ? `${selectedMonthNames.join(', ')} ${safeYear}`
      : `${selectedMonthNames.length} Bulan (${selectedMonthNames[0]} - ${latestMonthName}) ${safeYear}`;

  return {
    year: safeYear,
    month: monthList.join(','),
    monthLabel,
    stokLahan: {
      value: Math.round(totalActLahan * 100) / 100,
      formula: `Bongkar (${fmt(totalBongkar)}) + Bajak (${fmt(totalBajak)}) + SN (${fmt(totalSn)}) + Tanam (${fmt(totalTanam)})`,
      details: {
        bongkar: totalBongkar,
        bajak: totalBajak,
        sn: totalSn,
        tanam: totalTanam,
      },
    },
    stokBongkar: {
      value: stok.bongkar,
      formula: `${fmt(stok.bongkar)} Ha`,
    },
    stokBajak: {
      value: stok.bajak,
      formula: `${fmt(stok.bajak)} Ha`,
    },
    stokSN: {
      value: stok.sn,
      formula: `${fmt(stok.sn)} Ha`,
    },
    totalStok: {
      value: stok.total,
      formula: `Bongkar (${fmt(stok.bongkar)}) + Bajak (${fmt(stok.bajak)}) + SN (${fmt(stok.sn)})`,
    },
    availableYears: AVAILABLE_STOK_YEARS,
    availableMonths: ALL_MONTH_NAMES,
  };
}
