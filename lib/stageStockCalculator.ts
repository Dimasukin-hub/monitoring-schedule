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
  ds: string;
  dt: string;
  du: string;
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

export function getEffectiveMonthYear(d: Date | null): { month: number; year: number; key: string } | null {
  if (!d || isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  return { month, year, key: `${month}${year}` };
}

/**
 * Menghitung ulang seluruh tabel StageStockSummary untuk tahun target (default 2026)
 * berdasarkan rumus Sheet Stok Lahan di Excel Schedule 2026 Update 09:
 *
 * 1. Bongkar(m) = SUMIF(Master!$DS:$DS, N57, Master!$F:$F)
 * 2. Bajak(m) = SUMIF(Master!$DT:$DT, N57, Master!$F:$F)
 * 3. SN(m) = SUMIF(Master!$DU:$DU, N57, Master!$F:$F)
 * 4. Stok Bongkar(m) = Stok Bongkar(m-1) + Bongkar(m) - Bajak(m)
 * 5. Stok Bajak(m) = Stok Bajak(m-1) + Bajak(m) - SN(m)
 * 6. Stok SN(m) = Stok SN(m-1) + SN(m) - Tanam(m)
 * 7. Total Stok(m) = Stok Bongkar(m) + Stok Bajak(m) + Stok SN(m)
 */
export async function recalculateAndPersistStageStocks(targetYear: number = 2026) {
  // 1. Ambil data lahan untuk tahun target
  const lands = await prisma.land.findMany({
    where: {
      OR: [
        { year: targetYear },
        { year: null },
      ],
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

  // 3. Terapkan delta dinamis untuk setiap lahan yang tanggalnya diubah
  for (const l of lands) {
    const base = lands2026Baselines[l.lokasi];
    if (!base) continue;

    const netto = Number(l.luasNetto) || base.netto;
    const details = (typeof l.aplikasiDetails === 'object' && l.aplikasiDetails !== null) ? (l.aplikasiDetails as any) : {};

    // 3a. Bongkar (DO = MAX(rencBkr, realBkr))
    const realBkrStr = l.realBkr || details.realChopper || details.realRh1 || null;
    const rencBkrStr = l.rencBkr || details.chopper || null;
    const dRencBkr = parseDateVal(rencBkrStr);
    const dRealBkr = parseDateVal(realBkrStr);
    let dDO: Date | null = null;
    if (dRencBkr && dRealBkr) dDO = dRealBkr > dRencBkr ? dRealBkr : dRencBkr;
    else dDO = dRealBkr || dRencBkr;
    const mDO = getEffectiveMonthYear(dDO);
    const curDS = mDO ? mDO.key : '';

    if (curDS && curDS !== base.ds) {
      const baseM = parseInt(base.ds.slice(0, -4), 10);
      const baseY = parseInt(base.ds.slice(-4), 10);
      if (baseY === targetYear && baseM >= 1 && baseM <= 12) {
        monthlyBongkar[baseM] -= netto;
      }
      if (mDO && mDO.year === targetYear && mDO.month >= 1 && mDO.month <= 12) {
        monthlyBongkar[mDO.month] += netto;
      }
    }

    // 3b. Bajak (DP = MAX(rencBajak, realBajak))
    const realBjkStr =
      l.realBajak ||
      details.realBajakAwalMb5Btr ||
      details.realBajakAwalMb25 ||
      details.realBajakAwalHoward ||
      details.realBajakAwalNardi ||
      details.realHrEksMb ||
      null;
    const rencBjkStr = l.rencBajak || details.rencAwalMb5Btr || details.bajakAwalMb5Btr || null;
    const dRencBjk = parseDateVal(rencBjkStr);
    const dRealBjk = parseDateVal(realBjkStr);
    let dDP: Date | null = null;
    if (dRencBjk && dRealBjk) dDP = dRealBjk > dRencBjk ? dRealBjk : dRencBjk;
    else dDP = dRealBjk || dRencBjk;
    const mDP = getEffectiveMonthYear(dDP);
    const curDT = mDP ? mDP.key : '';

    if (curDT && curDT !== base.dt) {
      const baseM = parseInt(base.dt.slice(0, -4), 10);
      const baseY = parseInt(base.dt.slice(-4), 10);
      if (baseY === targetYear && baseM >= 1 && baseM <= 12) {
        monthlyBajak[baseM] -= netto;
      }
      if (mDP && mDP.year === targetYear && mDP.month >= 1 && mDP.month <= 12) {
        monthlyBajak[mDP.month] += netto;
      }
    }

    // 3c. Siap Tanam / SN (DQ = +B)
    const snDateStr = l.bulanSn || base.bulanSn || null;
    const dDQ = parseDateVal(snDateStr);
    const mDQ = getEffectiveMonthYear(dDQ);
    const curDU = mDQ ? mDQ.key : base.du;

    if (curDU && curDU !== base.du) {
      const baseM = parseInt(base.du.slice(0, -4), 10);
      const baseY = parseInt(base.du.slice(-4), 10);
      if (baseY === targetYear && baseM >= 1 && baseM <= 12) {
        monthlySN[baseM] -= netto;
      }
      if (mDQ && mDQ.year === targetYear && mDQ.month >= 1 && mDQ.month <= 12) {
        monthlySN[mDQ.month] += netto;
      }
    }
  }

  // 4. Hitung rolling carryover stok
  let rollingBk = baselineData.initialCarryover.bongkar;
  let rollingBjk = baselineData.initialCarryover.bajak;
  let rollingSN = baselineData.initialCarryover.sn;

  const updatedSummaries = [];

  for (let m = 1; m <= 12; m++) {
    const baseM = baselineData.monthly[m - 1];
    const monthName = baseM.month;
    const monthYear = baseM.monthYear;

    const bkr = Math.round(monthlyBongkar[m] * 100) / 100;
    const bjk = Math.round(monthlyBajak[m] * 100) / 100;
    const sn = Math.round(monthlySN[m] * 100) / 100;
    const tanam = Math.round(monthlyTanam[m] * 100) / 100;

    rollingBk = Math.round((rollingBk + bkr - bjk) * 100) / 100;
    rollingBjk = Math.round((rollingBjk + bjk - sn) * 100) / 100;
    rollingSN = Math.round((rollingSN + sn - tanam) * 100) / 100;
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
