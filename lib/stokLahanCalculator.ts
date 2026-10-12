import { STOK_LAHAN_EXCEL_DATA } from './stokLahanData';
import baselineStageStockJson from './baselineStageStock.json';

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

// Bangun data tahun 2026 dari baselineStageStock.json
const baseline2026 = baselineStageStockJson as {
  initialCarryover: { bongkar: number; bajak: number; sn: number };
  monthly: Array<{
    monthIndex: number;
    month: string;
    monthYear: string;
    bongkar: number;
    bajak: number;
    sn: number;
    tanam: number;
    stokBongkar: number;
    stokBajak: number;
    stokSN: number;
    totalStok: number;
  }>;
};

const monthly2026Map: Record<string, MonthData> = {};
let total2026Bkr = 0;
let total2026Bjk = 0;
let total2026Sn = 0;
let total2026Tnm = 0;

for (const m of baseline2026.monthly || []) {
  total2026Bkr += m.bongkar;
  total2026Bjk += m.bajak;
  total2026Sn += m.sn;
  total2026Tnm += m.tanam;
  monthly2026Map[m.month] = {
    monthIndex: m.monthIndex,
    monthName: m.month,
    activities: {
      bongkar: m.bongkar,
      bajak: m.bajak,
      sn: m.sn,
      tanam: m.tanam,
      totalStokLahan: Math.round((m.bongkar + m.bajak + m.sn + m.tanam) * 100) / 100,
    },
    stok: {
      bongkar: m.stokBongkar,
      bajak: m.stokBajak,
      sn: m.stokSN,
      total: m.totalStok,
    },
  };
}

const data2026: YearStokData = {
  year: 2026,
  initialStok: {
    bongkar: baseline2026.initialCarryover.bongkar,
    bajak: baseline2026.initialCarryover.bajak,
    sn: baseline2026.initialCarryover.sn,
    total: Math.round((baseline2026.initialCarryover.bongkar + baseline2026.initialCarryover.bajak + baseline2026.initialCarryover.sn) * 100) / 100,
  },
  totalActivities: {
    bongkar: Math.round(total2026Bkr * 100) / 100,
    bajak: Math.round(total2026Bjk * 100) / 100,
    sn: Math.round(total2026Sn * 100) / 100,
    tanam: Math.round(total2026Tnm * 100) / 100,
    totalStokLahan: Math.round((total2026Bkr + total2026Bjk + total2026Sn + total2026Tnm) * 100) / 100,
  },
  monthly: monthly2026Map,
};

const typedStokData: Record<string, YearStokData> = {
  ...(STOK_LAHAN_EXCEL_DATA as unknown as Record<string, YearStokData>),
  '2026': data2026,
};

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
  const yearData = typedStokData[String(safeYear)] || typedStokData['2026'] || Object.values(typedStokData)[0];

  if (!yearData) {
    return {
      year: safeYear,
      month: 'Okt',
      monthLabel: `Okt ${safeYear}`,
      stokLahan: { value: 0, formula: '', details: { bongkar: 0, bajak: 0, sn: 0, tanam: 0 } },
      stokBongkar: { value: 0, formula: '' },
      stokBajak: { value: 0, formula: '' },
      stokSN: { value: 0, formula: '' },
      totalStok: { value: 0, formula: '' },
      availableYears: AVAILABLE_STOK_YEARS,
      availableMonths: ALL_MONTH_NAMES,
    };
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
