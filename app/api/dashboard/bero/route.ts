import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { computeRencanaBeroBongkar } from '@/lib/landActivityUtils';

function parseDate(dStr: string | null | undefined): Date | null {
  if (!dStr) return null;
  const parts = dStr.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  return null;
}

const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getRangeKey(diffDays: number): string {
  if (diffDays < 80) return '< 80';
  if (diffDays <= 120) return '80 - 120';
  if (diffDays <= 150) return '120 - 150';
  if (diffDays <= 200) return '150 - 200';
  return '> 200';
}

// 18 Periode Standar Monitoring Bero (Oct-25 s/d Mar-27)
const TARGET_18_PERIODS = [
  // 2025 (3 bulan)
  { periodKey: 'Oct-25', year: 2025, monthNum: 10, label: 'Oct-25' },
  { periodKey: 'Nov-25', year: 2025, monthNum: 11, label: 'Nov-25' },
  { periodKey: 'Dec-25', year: 2025, monthNum: 12, label: 'Dec-25' },
  // 2026 (12 bulan)
  { periodKey: 'Jan-26', year: 2026, monthNum: 1, label: 'Jan-26' },
  { periodKey: 'Feb-26', year: 2026, monthNum: 2, label: 'Feb-26' },
  { periodKey: 'Mar-26', year: 2026, monthNum: 3, label: 'Mar-26' },
  { periodKey: 'Apr-26', year: 2026, monthNum: 4, label: 'Apr-26' },
  { periodKey: 'May-26', year: 2026, monthNum: 5, label: 'May-26' },
  { periodKey: 'Jun-26', year: 2026, monthNum: 6, label: 'Jun-26' },
  { periodKey: 'Jul-26', year: 2026, monthNum: 7, label: 'Jul-26' },
  { periodKey: 'Aug-26', year: 2026, monthNum: 8, label: 'Aug-26' },
  { periodKey: 'Sep-26', year: 2026, monthNum: 9, label: 'Sep-26' },
  { periodKey: 'Oct-26', year: 2026, monthNum: 10, label: 'Oct-26' },
  { periodKey: 'Nov-26', year: 2026, monthNum: 11, label: 'Nov-26' },
  { periodKey: 'Dec-26', year: 2026, monthNum: 12, label: 'Dec-26' },
  // 2027 (3 bulan)
  { periodKey: 'Jan-27', year: 2027, monthNum: 1, label: 'Jan-27' },
  { periodKey: 'Feb-27', year: 2027, monthNum: 2, label: 'Feb-27' },
  { periodKey: 'Mar-27', year: 2027, monthNum: 3, label: 'Mar-27' },
];

// Baseline resmi Target RFC dan fallback acuan Excel
const BERO_BASELINE_CONFIG: Record<
  string,
  { rfc: number; defaultRencana: number; defaultRealisasi: number | null }
> = {
  // 2025: Arsip resmi terkunci
  'Oct-25': { rfc: 57, defaultRencana: 57, defaultRealisasi: 57 },
  'Nov-25': { rfc: 56, defaultRencana: 57, defaultRealisasi: 56 },
  'Dec-25': { rfc: 69, defaultRencana: 69, defaultRealisasi: 69 },
  // 2026: Target RFC resmi perusahaan + fallback awal
  'Jan-26': { rfc: 87, defaultRencana: 87, defaultRealisasi: 87 },
  'Feb-26': { rfc: 101, defaultRencana: 112, defaultRealisasi: 101 },
  'Mar-26': { rfc: 94, defaultRencana: 111, defaultRealisasi: 94 },
  'Apr-26': { rfc: 107, defaultRencana: 114, defaultRealisasi: 107 },
  'May-26': { rfc: 131, defaultRencana: 164, defaultRealisasi: 131 },
  'Jun-26': { rfc: 146, defaultRencana: 155, defaultRealisasi: 146 },
  'Jul-26': { rfc: 143, defaultRencana: 124, defaultRealisasi: 143 },
  'Aug-26': { rfc: 121, defaultRencana: 126, defaultRealisasi: 121 },
  'Sep-26': { rfc: 62, defaultRencana: 65, defaultRealisasi: 62 },
  'Oct-26': { rfc: 61, defaultRencana: 61, defaultRealisasi: null },
  'Nov-26': { rfc: 69, defaultRencana: 69, defaultRealisasi: null },
  'Dec-26': { rfc: 78, defaultRencana: 78, defaultRealisasi: null },
  // 2027
  'Jan-27': { rfc: 75, defaultRencana: 75, defaultRealisasi: null },
  'Feb-27': { rfc: 74, defaultRencana: 75, defaultRealisasi: null },
  'Mar-27': { rfc: 76, defaultRencana: 73, defaultRealisasi: null },
};

export async function GET() {
  try {
    // 1. Inisialisasi struktur Range Bero (Grafik Kiri) dengan 5 Kategori
    const rangeBeroChartData: Array<{
      periodKey: string;
      year: number;
      monthNum: number;
      label: string;
      totalHa: number;
      countLands: number;
      '< 80': number;
      '80 - 120': number;
      '120 - 150': number;
      '150 - 200': number;
      '> 200': number;
    }> = TARGET_18_PERIODS.map((p) => ({
      ...p,
      totalHa: 0,
      countLands: 0,
      '< 80': 0,
      '80 - 120': 0,
      '120 - 150': 0,
      '150 - 200': 0,
      '> 200': 0,
    }));

    const rangeItemMap = new Map<string, (typeof rangeBeroChartData)[0]>();
    for (const item of rangeBeroChartData) {
      rangeItemMap.set(item.periodKey, item);
    }

    // 2. Map akumulasi hari bero per bulan Siap Tanam untuk Grafik Bero / Bulan (Kanan)
    const rencMonthlyMap: Record<string, { sumDays: number; count: number }> = {};
    const realMonthlyMap: Record<string, { sumDays: number; count: number }> = {};

    const lands = await prisma.land.findMany({
      where: {
        year: { in: [2025, 2026, 2027] },
      },
      select: {
        id: true,
        lokasi: true,
        year: true,
        luasNetto: true,
        bulanTanam: true,
        rencMulaiTanam: true,
        realMulaiTanam: true,
        rencBkr: true,
        realBkr: true,
        aplikasiDetails: true,
        activities: {
          select: { code: true, status: true, rencanaDate: true, realisasiDate: true },
        },
      },
    });

    for (const l of lands) {
      // 1. Perhitungan untuk Grafik Kiri: Range Bero (Tanam vs Bongkar)
      const bkr = parseDate(l.realBkr || l.rencBkr);
      const tanam = parseDate(l.realMulaiTanam || l.rencMulaiTanam);
      if (bkr && tanam) {
        const diffDays = Math.round((tanam.getTime() - bkr.getTime()) / (1000 * 60 * 60 * 24));
        const range = getRangeKey(diffDays) as keyof (typeof rangeBeroChartData)[0];
        const tanamMonth = tanam.getMonth();
        const tanamYear = tanam.getFullYear();
        const pKey = `${MONTH_NAMES_EN[tanamMonth]}-${String(tanamYear).slice(2)}`;

        const targetItem = rangeItemMap.get(pKey);
        if (targetItem && range) {
          (targetItem[range] as number) = Number(((targetItem[range] as number) + (l.luasNetto || 0)).toFixed(2));
          targetItem.totalHa = Number((targetItem.totalHa + (l.luasNetto || 0)).toFixed(2));
          targetItem.countLands++;
        }
      }

      // 2. Perhitungan untuk Grafik Kanan: Bero / Bulan (Bongkar s/d Siap Tanam via computeRencanaBeroBongkar)
      // Hanya menghitung petak aktif tahun >= 2026 (tahun 2025 terkunci arsip baseline)
      if (l.year && l.year >= 2026) {
        const bero = computeRencanaBeroBongkar(l);
        if (bero.hari !== null && bero.tglSiapTanam) {
          const parts = String(bero.tglSiapTanam).trim().split('/');
          if (parts.length === 3) {
            const mIdx = parseInt(parts[1], 10) - 1;
            let yr = parts[2].slice(-2);
            if (mIdx >= 0 && mIdx < 12) {
              const pKey = `${MONTH_NAMES_EN[mIdx]}-${yr}`;
              if (!rencMonthlyMap[pKey]) rencMonthlyMap[pKey] = { sumDays: 0, count: 0 };
              rencMonthlyMap[pKey].sumDays += bero.hari;
              rencMonthlyMap[pKey].count++;

              if (bero.kondisi === 3) {
                if (!realMonthlyMap[pKey]) realMonthlyMap[pKey] = { sumDays: 0, count: 0 };
                realMonthlyMap[pKey].sumDays += bero.hari;
                realMonthlyMap[pKey].count++;
              }
            }
          }
        }
      }
    }

    // Bangun beroChartData (18 Periode) secara dinamis
    const beroChartData = TARGET_18_PERIODS.map((p) => {
      const cfg = BERO_BASELINE_CONFIG[p.periodKey] || { rfc: 0, defaultRencana: 0, defaultRealisasi: null };
      const isHistorical = p.year === 2025;

      let rencanaVal = cfg.defaultRencana;
      let realisasiVal: number | null = cfg.defaultRealisasi;

      if (!isHistorical) {
        // Tahun >= 2026: Dihitung secara dinamis dari database
        if (rencMonthlyMap[p.periodKey] && rencMonthlyMap[p.periodKey].count > 0) {
          rencanaVal = Math.round(rencMonthlyMap[p.periodKey].sumDays / rencMonthlyMap[p.periodKey].count);
        }
        if (realMonthlyMap[p.periodKey] && realMonthlyMap[p.periodKey].count > 0) {
          realisasiVal = Math.round(realMonthlyMap[p.periodKey].sumDays / realMonthlyMap[p.periodKey].count);
        } else {
          realisasiVal = null;
        }
      }

      const deviasiVal = realisasiVal !== null ? realisasiVal - rencanaVal : null;
      const isCurrentMonth = p.periodKey === 'Sep-26';

      return {
        periodKey: p.periodKey,
        year: p.year,
        monthNum: p.monthNum,
        label: p.label,
        rfc: cfg.rfc,
        rencana: rencanaVal,
        realisasi: realisasiVal,
        deviasi: deviasiVal,
        isCurrentMonth,
      };
    });

    const periods2025 = beroChartData.filter((d) => d.year === 2025);
    const periods2026 = beroChartData.filter((d) => d.year === 2026);
    const periods2027 = beroChartData.filter((d) => d.year === 2027);

    // Hitung KPI ringkasan untuk tahun berjalan 2026
    const real2026List = periods2026.filter((p) => p.realisasi !== null);
    const lastRealPeriod = real2026List.length > 0 ? real2026List[real2026List.length - 1] : periods2026[8]; // default Sep-26

    const rfc2026Avg = Math.round(periods2026.reduce((acc, curr) => acc + curr.rfc, 0) / periods2026.length);
    const renc2026Avg = Math.round(periods2026.reduce((acc, curr) => acc + curr.rencana, 0) / periods2026.length);
    const real2026Avg = real2026List.length > 0
      ? Math.round(real2026List.reduce((acc, curr) => acc + (curr.realisasi || 0), 0) / real2026List.length)
      : 110;

    return NextResponse.json({
      success: true,
      data: {
        title: 'Monitoring Bero & Distribusi Range Lahan',
        subtitle: 'Grafik Range Bero Bulanan dan Rerata Hari Bero Lokasi SN',
        beroChartData,
        rangeBeroChartData,
        chartData: beroChartData,
        periods2025,
        periods2026,
        periods2027,
        summaryKPI: {
          rfc2026: rfc2026Avg,
          rencana2026: renc2026Avg,
          realisasi2026: real2026Avg,
          deviasi2026: real2026Avg - renc2026Avg,
          latestMonth: lastRealPeriod.periodKey,
          latestRfc: lastRealPeriod.rfc,
          latestRenc: lastRealPeriod.rencana,
          latestReal: lastRealPeriod.realisasi ?? lastRealPeriod.rencana,
          latestDev: lastRealPeriod.deviasi ?? 0,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/bero:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
