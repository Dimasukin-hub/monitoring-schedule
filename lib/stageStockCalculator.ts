import { prisma } from '@/lib/prisma';
import { getLandStokCategory } from '@/lib/landClassification';
import { computeAktivitasTerakhir } from '@/lib/landActivityUtils';
import baselineStageStockJson from './baselineStageStock.json';
import lands2026BaselinesJson from './lands2026Baselines.json';

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

interface MonthlyBaselineItem {
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
}

interface LandBaselineItem {
  netto: number;
  baseRealBkr?: any;
  baseRealBajak?: any;
  baseBulanSn?: any;
  baseRealBkrMonth?: number | null;
  baseRealBajakMonth?: number | null;
  baseRealSnMonth?: number | null;
  ds?: string;
  dt?: string;
  du?: string;
  rencBkr?: any;
  rencBajak?: any;
  bulanSn?: any;
}

const baselineData = baselineStageStockJson as {
  initialCarryover: { bongkar: number; bajak: number; sn: number };
  monthly: MonthlyBaselineItem[];
};

const lands2026Baselines = lands2026BaselinesJson as Record<string, LandBaselineItem>;

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
};

/**
 * Helper untuk parsing berbagai format tanggal (DD/MM/YYYY, YYYY-MM-DD, MMM-YY, serial number)
 */
export function parseDateVal(val: any): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const s = String(val).trim();
  if (!s || s === '-' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') {
    return null;
  }

  // Format DD/MM/YYYY atau D/M/YYYY
  const pSlash = s.split('/');
  if (pSlash.length === 3) {
    const d = parseInt(pSlash[0], 10);
    const m = parseInt(pSlash[1], 10);
    let y = parseInt(pSlash[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(m) && !isNaN(y) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  // Format YYYY-MM-DD
  const pDash = s.split('-');
  if (pDash.length === 3 && pDash[0].length === 4) {
    const y = parseInt(pDash[0], 10);
    const m = parseInt(pDash[1], 10);
    const d = parseInt(pDash[2], 10);
    if (!isNaN(m) && !isNaN(y) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return new Date(y, m - 1, d);
    }
  }

  // Format MMM-YY (contoh: Nov-26, Okt-2026, Sep-26)
  if (pDash.length === 2) {
    const mStr = pDash[0].toLowerCase().slice(0, 3);
    let y = parseInt(pDash[1], 10);
    if (y < 100) y += 2000;
    if (MONTH_MAP[mStr] !== undefined && !isNaN(y)) {
      return new Date(y, MONTH_MAP[mStr], 1);
    }
  }

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    return new Date(epoch.getTime() + num * 86400000);
  }

  const dIso = new Date(s);
  if (!isNaN(dIso.getTime())) return dIso;

  return null;
}

/**
 * Ekstrak bulan (1..12) untuk tahun target dari berbagai format tanggal
 */
export function parseDateToMonth(val: any, targetYear: number = 2026): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    if (val.getFullYear() === targetYear) return val.getMonth() + 1;
    return null;
  }
  const s = String(val).trim();
  if (!s || s === '-' || s === '0' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;

  // Format DD/MM/YYYY atau D/M/YYYY
  const pSlash = s.split('/');
  if (pSlash.length === 3) {
    const m = parseInt(pSlash[1], 10);
    let y = parseInt(pSlash[2], 10);
    if (y < 100) y += 2000;
    if (y === targetYear && m >= 1 && m <= 12) return m;
  }

  // Format YYYY-MM-DD
  const pDash = s.split('-');
  if (pDash.length === 3 && pDash[0].length === 4) {
    const y = parseInt(pDash[0], 10);
    const m = parseInt(pDash[1], 10);
    if (y === targetYear && m >= 1 && m <= 12) return m;
  }

  // Format MMM-YY (contoh: Okt-26, Nov-26, Sep-26)
  if (pDash.length === 2) {
    const mStr = pDash[0].toLowerCase().slice(0, 3);
    let y = parseInt(pDash[1], 10);
    if (y < 100) y += 2000;
    if (y === targetYear && MONTH_MAP[mStr] !== undefined) return MONTH_MAP[mStr] + 1;
  }

  // Excel serial number
  const num = Number(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const epoch = new Date(1899, 11, 30);
    const d = new Date(epoch.getTime() + num * 86400000);
    if (d.getFullYear() === targetYear) return d.getMonth() + 1;
  }

  const dIso = new Date(s);
  if (!isNaN(dIso.getTime()) && dIso.getFullYear() === targetYear) {
    return dIso.getMonth() + 1;
  }

  return null;
}

export function getEffectiveMonthYear(d: Date | null): { month: number; year: number; key: string } | null {
  if (!d || isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return { month, year, key: `${month}${year}` };
}

export function maxDate(d1: Date | null, d2: Date | null): Date | null {
  if (d1 && d2) return d1.getTime() > d2.getTime() ? d1 : d2;
  return d1 || d2 || null;
}

/**
 * Menghitung ulang seluruh tabel StageStockSummary untuk tahun target (default 2026)
 * berdasarkan rumus Sheet Stok Lahan di Excel Schedule 2026 Update 09:
 *
 * 1. Bongkar(m): Baseline Excel dimodifikasi delta realisasi Bongkar
 * 2. Bajak(m): Baseline Excel dimodifikasi delta realisasi Bajak (MB 5 BTR, MB 25, Howard, dll.)
 * 3. SN(m): Baseline Excel dimodifikasi delta realisasi Siap Tanam
 * 4. Stok Bongkar(m) = Stok Bongkar(m-1) + Bongkar(m) - Bajak(m) (+M64 + N59 - N60)
 * 5. Stok Bajak(m) = Stok Bajak(m-1) + Bajak(m) - SN(m) (+M65 + N60 - N61)
 * 6. Stok SN(m) = Stok SN(m-1) + SN(m) - Tanam(m) (+M66 + N61 - N62)
 * 7. Total Stok(m) = Stok Bongkar(m) + Stok Bajak(m) + Stok SN(m)
 */
export async function recalculateAndPersistStageStocks(targetYear: number = 2026) {
  // 1. Ambil data lahan untuk tahun target
  const lands = await prisma.land.findMany({
    where: {
      year: targetYear,
    },
    select: {
      id: true,
      lokasi: true,
      luasNetto: true,
      rencBkr: true,
      realBkr: true,
      rencBajak: true,
      realBajak: true,
      bulanSn: true,
      aplikasiDetails: true,
    },
  });

  // 2. Inisialisasi akumulasi luas netto dari Baseline Resmi Excel Stok Lahan
  const monthlyBongkar = new Array(13).fill(0);
  const monthlyBajak = new Array(13).fill(0);
  const monthlySN = new Array(13).fill(0);
  const monthlyTanam = new Array(13).fill(0);

  for (const m of baselineData.monthly) {
    monthlyBongkar[m.monthIndex] = m.bongkar;
    monthlyBajak[m.monthIndex] = m.bajak;
    monthlySN[m.monthIndex] = m.sn;
    monthlyTanam[m.monthIndex] = m.tanam;
  }

  // 3. Terapkan delta dinamis saat pengguna memasukkan / mengubah tanggal realisasi:
  for (const l of lands) {
    const base = lands2026Baselines[l.lokasi];
    if (!base) continue;

    const netto = Number(l.luasNetto) || base.netto;
    const details = (typeof l.aplikasiDetails === 'object' && l.aplikasiDetails !== null) ? (l.aplikasiDetails as any) : {};

    // 3a. Bongkar (Chopper / RH1)
    const realBkrStr = l.realBkr || details.realChopper || details.realRh1 || null;
    const curBkrMonth = parseDateToMonth(realBkrStr, targetYear);
    const baseBkrMonth = base.baseRealBkrMonth ?? null;

    if (curBkrMonth !== baseBkrMonth) {
      if (baseBkrMonth && baseBkrMonth >= 1 && baseBkrMonth <= 12) {
        monthlyBongkar[baseBkrMonth] -= netto;
      }
      if (curBkrMonth && curBkrMonth >= 1 && curBkrMonth <= 12) {
        monthlyBongkar[curBkrMonth] += netto;
      }
    }

    // 3b. Bajak (MB 5 BTR, MB 25, Howard, Nardi, Hr Eks Mb, dll)
    const realBjkStr =
      l.realBajak ||
      details.realBajak ||
      details.realBajakAwalMb5Btr ||
      details.realBajakAwalMb25 ||
      details.realBajakAwalHoward ||
      details.realBajakAwalNardi ||
      details.realHrEksMb ||
      null;
    const curBjkMonth = parseDateToMonth(realBjkStr, targetYear);
    const baseBjkMonth = base.baseRealBajakMonth ?? null;

    if (curBjkMonth !== baseBjkMonth) {
      if (baseBjkMonth && baseBjkMonth >= 1 && baseBjkMonth <= 12) {
        monthlyBajak[baseBjkMonth] -= netto;
      }
      if (curBjkMonth && curBjkMonth >= 1 && curBjkMonth <= 12) {
        monthlyBajak[curBjkMonth] += netto;
      }
    }

    // 3c. Siap Tanam / SN (realSiapTanam, realJalanSal, siapTanam)
    const effectiveSnStr =
      (details.realSiapTanam && details.realSiapTanam !== '-' && details.realSiapTanam !== '0')
        ? details.realSiapTanam
        : (details.realJalanSal && details.realJalanSal !== '-' && details.realJalanSal !== '0')
        ? details.realJalanSal
        : (details.siapTanam && details.siapTanam !== '-' && details.siapTanam !== '0')
        ? details.siapTanam
        : null;
    const curSnMonth = parseDateToMonth(effectiveSnStr, targetYear);
    const baseSnMonth = base.baseRealSnMonth ?? null;

    if (curSnMonth !== baseSnMonth) {
      if (baseSnMonth && baseSnMonth >= 1 && baseSnMonth <= 12) {
        monthlySN[baseSnMonth] -= netto;
      }
      if (curSnMonth && curSnMonth >= 1 && curSnMonth <= 12) {
        monthlySN[curSnMonth] += netto;
      }
    }
  }

  // 4. Hitung rolling carryover stok persis rumus Excel:
  // Stok Bongkar = Stok Bongkar(m-1) + Bongkar(m) - Bajak(m)
  // Stok Bajak = Stok Bajak(m-1) + Bajak(m) - SN(m)
  // Stok SN = Stok SN(m-1) + SN(m) - Tanam(m)
  let rollingBk = baselineData.initialCarryover.bongkar;
  let rollingBjk = baselineData.initialCarryover.bajak;
  let rollingSN = baselineData.initialCarryover.sn;

  const updatedSummaries = [];

  for (let m = 1; m <= 12; m++) {
    const baseM = baselineData.monthly[m - 1];
    const monthName = baseM.month;
    const monthYear = baseM.monthYear;

    const bkr = Math.max(0, Math.round(monthlyBongkar[m] * 100) / 100);
    const bjk = Math.max(0, Math.round(monthlyBajak[m] * 100) / 100);
    const sn = Math.max(0, Math.round(monthlySN[m] * 100) / 100);
    const tanam = Math.max(0, Math.round(monthlyTanam[m] * 100) / 100);

    rollingBk = Math.max(0, Math.round((rollingBk + bkr - bjk) * 100) / 100);
    rollingBjk = Math.max(0, Math.round((rollingBjk + bjk - sn) * 100) / 100);
    rollingSN = Math.max(0, Math.round((rollingSN + sn - tanam) * 100) / 100);
    const totalStok = Math.round((rollingBk + rollingBjk + rollingSN) * 100) / 100;

    const payload = {
      year: targetYear,
      month: monthName,
      monthIndex: m,
      monthYear,
      bongkar: bkr,
      bajak: bjk,
      sn,
      tanam,
      stokBongkar: rollingBk,
      stokBajak: rollingBjk,
      stokSN: rollingSN,
      totalStok,
      initialCarryoverBongkar: baselineData.initialCarryover.bongkar,
      initialCarryoverBajak: baselineData.initialCarryover.bajak,
      initialCarryoverSN: baselineData.initialCarryover.sn,
    };

    const record = await prisma.stageStockSummary.upsert({
      where: {
        year_monthIndex: {
          year: targetYear,
          monthIndex: m,
        },
      },
      update: payload,
      create: payload,
    });

    updatedSummaries.push(record);
  }

  return updatedSummaries;
}

/**
 * Sinkronisasi tabel StokLahanMaster untuk satu lokasi agar kategori (BK, BJK, SN, PROSES, SELESAI)
 * dan aktivitas terakhirnya selalu up-to-date di submenu List Stok Lahan.
 */
export async function syncStokLahanMasterForLand(landId: number) {
  const land = await prisma.land.findUnique({
    where: { id: landId },
    include: { activities: true },
  });
  if (!land) return null;

  const category = getLandStokCategory(land);
  const aktivitasTerakhir = computeAktivitasTerakhir(land);

  const existing = await prisma.stokLahanMaster.findFirst({
    where: { lokasi: land.lokasi },
  });

  const payload: any = {
    lokasi: land.lokasi,
    wilayah: land.wilayah,
    luasBruto: land.luasBruto,
    luasNetto: land.luasNetto,
    status: land.status,
    eks: land.eks,
    sejarah: land.sejarah,
    phBk: land.phBk,
    phSn: land.phSn,
    aplikasiTerakhir: aktivitasTerakhir,
    statusAplikasi: land.statusAplikasi,
    realBajak: land.realBajak,
    realBkr: land.realBkr,
    realSn: land.bulanSn,
    realMulaiTanam: land.realMulaiTanam,
    realSelesaiTanam: land.realSelesaiTanam,
    progressTanam: land.progressTanam,
    category,
  };

  if (existing) {
    return prisma.stokLahanMaster.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    return prisma.stokLahanMaster.create({
      data: payload,
    });
  }
}
