import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
  if (diffDays <= 90) return '80 - 90';
  if (diffDays <= 120) return '90 - 120';
  if (diffDays <= 150) return '120 - 150';
  if (diffDays <= 180) return '150 - 180';
  if (diffDays <= 210) return '180 - 210';
  if (diffDays <= 240) return '210 - 240';
  return '> 240';
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

export async function GET() {
  try {
    // 1. DATA GRAFIK 1 (KANAN): RERATA BERO / BULAN (Oct-25 s/d Mar-27) - Satuan: Hari Bero
    const beroChartData = [
      // 2025 (3 bulan)
      { periodKey: 'Oct-25', year: 2025, monthNum: 10, label: 'Oct-25', rfc: 57, rencana: 57, realisasi: 57, deviasi: 0 },
      { periodKey: 'Nov-25', year: 2025, monthNum: 11, label: 'Nov-25', rfc: 56, rencana: 57, realisasi: 56, deviasi: -1 },
      { periodKey: 'Dec-25', year: 2025, monthNum: 12, label: 'Dec-25', rfc: 69, rencana: 69, realisasi: 69, deviasi: 0 },
      // 2026 (12 bulan)
      { periodKey: 'Jan-26', year: 2026, monthNum: 1, label: 'Jan-26', rfc: 87, rencana: 87, realisasi: 87, deviasi: 0 },
      { periodKey: 'Feb-26', year: 2026, monthNum: 2, label: 'Feb-26', rfc: 101, rencana: 112, realisasi: 101, deviasi: -11 },
      { periodKey: 'Mar-26', year: 2026, monthNum: 3, label: 'Mar-26', rfc: 94, rencana: 111, realisasi: 94, deviasi: -18 },
      { periodKey: 'Apr-26', year: 2026, monthNum: 4, label: 'Apr-26', rfc: 107, rencana: 114, realisasi: 107, deviasi: -6 },
      { periodKey: 'May-26', year: 2026, monthNum: 5, label: 'May-26', rfc: 131, rencana: 164, realisasi: 131, deviasi: -32 },
      { periodKey: 'Jun-26', year: 2026, monthNum: 6, label: 'Jun-26', rfc: 146, rencana: 155, realisasi: 146, deviasi: -9 },
      { periodKey: 'Jul-26', year: 2026, monthNum: 7, label: 'Jul-26', rfc: 143, rencana: 124, realisasi: 143, deviasi: 19 },
      { periodKey: 'Aug-26', year: 2026, monthNum: 8, label: 'Aug-26', rfc: 121, rencana: 126, realisasi: 121, deviasi: -5 },
      { periodKey: 'Sep-26', year: 2026, monthNum: 9, label: 'Sep-26', rfc: 62, rencana: 65, realisasi: 62, deviasi: -3, isCurrentMonth: true },
      { periodKey: 'Oct-26', year: 2026, monthNum: 10, label: 'Oct-26', rfc: 61, rencana: 61, realisasi: null, deviasi: null },
      { periodKey: 'Nov-26', year: 2026, monthNum: 11, label: 'Nov-26', rfc: 69, rencana: 69, realisasi: null, deviasi: null },
      { periodKey: 'Dec-26', year: 2026, monthNum: 12, label: 'Dec-26', rfc: 78, rencana: 78, realisasi: null, deviasi: null },
      // 2027 (3 bulan)
      { periodKey: 'Jan-27', year: 2027, monthNum: 1, label: 'Jan-27', rfc: 75, rencana: 75, realisasi: null, deviasi: null },
      { periodKey: 'Feb-27', year: 2027, monthNum: 2, label: 'Feb-27', rfc: 74, rencana: 75, realisasi: null, deviasi: null },
      { periodKey: 'Mar-27', year: 2027, monthNum: 3, label: 'Mar-27', rfc: 76, rencana: 73, realisasi: null, deviasi: null },
    ];

    // 2. DATA GRAFIK 2 (KIRI): GRAFIK RANGE BERO (Oct-25 s/d Mar-27)
    // Sesuai permintaan pengguna: Mengikuti timeline grafik bero/bulan (18 bulan: Oct-25 s/d Mar-27)
    const rangeBeroChartData: Array<{
      periodKey: string;
      year: number;
      monthNum: number;
      label: string;
      totalHa: number;
      countLands: number;
      '< 80': number;
      '80 - 90': number;
      '90 - 120': number;
      '120 - 150': number;
      '150 - 180': number;
      '180 - 210': number;
      '210 - 240': number;
      '> 240': number;
    }> = TARGET_18_PERIODS.map((p) => ({
      ...p,
      totalHa: 0,
      countLands: 0,
      '< 80': 0,
      '80 - 90': 0,
      '90 - 120': 0,
      '120 - 150': 0,
      '150 - 180': 0,
      '180 - 210': 0,
      '210 - 240': 0,
      '> 240': 0,
    }));

    const itemMap = new Map<string, (typeof rangeBeroChartData)[0]>();
    for (const item of rangeBeroChartData) {
      itemMap.set(item.periodKey, item);
    }

    try {
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
        },
      });

      for (const l of lands) {
        const bkr = parseDate(l.realBkr || l.rencBkr);
        const tanam = parseDate(l.realMulaiTanam || l.rencMulaiTanam);
        if (!bkr || !tanam) continue;

        const diffDays = Math.round((tanam.getTime() - bkr.getTime()) / (1000 * 60 * 60 * 24));
        const range = getRangeKey(diffDays) as keyof (typeof rangeBeroChartData)[0];

        // Format periodKey: e.g. "Oct-25", "Jan-26", "Mar-27"
        const tanamMonth = tanam.getMonth();
        const tanamYear = tanam.getFullYear();
        const pKey = `${MONTH_NAMES_EN[tanamMonth]}-${String(tanamYear).slice(2)}`;

        const targetItem = itemMap.get(pKey);
        if (targetItem && range) {
          (targetItem[range] as number) = Number(((targetItem[range] as number) + l.luasNetto).toFixed(2));
          targetItem.totalHa = Number((targetItem.totalHa + l.luasNetto).toFixed(2));
          targetItem.countLands++;
        }
      }
    } catch (dbErr) {
      console.error('Error querying land for rangeBeroChartData:', dbErr);
    }

    const periods2025 = beroChartData.filter((d) => d.year === 2025);
    const periods2026 = beroChartData.filter((d) => d.year === 2026);
    const periods2027 = beroChartData.filter((d) => d.year === 2027);

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
          rfc2026: 100,
          rencana2026: 106,
          realisasi2026: 110,
          deviasi2026: -65,
          latestMonth: 'Sep-26',
          latestRfc: 62,
          latestRenc: 65,
          latestReal: 62,
          latestDev: -3,
        },
      },
    });
  } catch (error: any) {
    console.error('Error in /api/dashboard/bero:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
