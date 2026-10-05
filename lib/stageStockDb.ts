import { prisma } from '@/lib/prisma';
import {
  StokLahanSummaryResult,
  AVAILABLE_STOK_YEARS,
  ALL_MONTH_NAMES,
  getCurrentMonthName,
  getStokLahanSummary,
} from '@/lib/stokLahanCalculator';

function fmt(n: number): string {
  return (Math.round((n + Number.EPSILON) * 100) / 100).toLocaleString('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Mengambil data rekapitulasi stok tahapan fisik (Bongkar, Bajak, SN)
 * LANGSUNG dari tabel PostgreSQL 'StageStockSummary'.
 */
export async function getDbStageStockSummary(
  targetYear: number = 2026,
  targetMonth: string = 'CURRENT'
): Promise<StokLahanSummaryResult> {
  const safeYear = AVAILABLE_STOK_YEARS.includes(targetYear) ? targetYear : 2026;

  // Resolusi bulan target: jika 'CURRENT' atau kosong, otomatis ambil bulan kalender berjalan
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

  try {
    const records = await prisma.stageStockSummary.findMany({
      where: { year: safeYear },
      orderBy: { monthIndex: 'asc' },
    });

    if (records && records.length > 0) {
      // 1. Bangun monthlyBreakdown dengan formula akurat per bulan
      const monthlyBreakdown = records.map((r, idx) => {
        const prevRecord = idx > 0 ? records[idx - 1] : null;
        const prevBongkar = prevRecord ? prevRecord.stokBongkar : (r.initialCarryoverBongkar ?? 0);
        const prevBajak = prevRecord ? prevRecord.stokBajak : (r.initialCarryoverBajak ?? 0);
        const prevSN = prevRecord ? prevRecord.stokSN : (r.initialCarryoverSN ?? 0);

        const stokBongkarFormula = `${fmt(prevBongkar)} (Stok Bongkar) + ${fmt(r.bongkar)} (Bongkar) - ${fmt(r.bajak)} (Bajak)`;
        const stokBajakFormula = `${fmt(prevBajak)} (Stok Bajak) + ${fmt(r.bajak)} (Bajak) - ${fmt(r.sn)} (SN)`;
        const stokSNFormula = `${fmt(prevSN)} (Stok SN) + ${fmt(r.sn)} (SN) - ${fmt(r.tanam)} (Tanam)`;

        return {
          month: r.month,
          monthIndex: r.monthIndex,
          monthYear: r.monthYear,
          bongkar: r.bongkar,
          bajak: r.bajak,
          sn: r.sn,
          tanam: r.tanam,
          stokBongkar: r.stokBongkar,
          stokBajak: r.stokBajak,
          stokSN: r.stokSN,
          totalStok: r.totalStok,
          stokBongkarFormula,
          stokBajakFormula,
          stokSNFormula,
        };
      });

      if (isAllMonths) {
        let totalBongkar = 0;
        let totalBajak = 0;
        let totalSn = 0;
        let totalTanam = 0;

        for (const r of records) {
          totalBongkar += r.bongkar;
          totalBajak += r.bajak;
          totalSn += r.sn;
          totalTanam += r.tanam;
        }

        const decRecord = records.find((r) => r.monthIndex === 12) || records[records.length - 1];
        const decBreakdown = monthlyBreakdown.find((r) => r.monthIndex === 12) || monthlyBreakdown[monthlyBreakdown.length - 1];
        const initial = {
          bongkar: decRecord.initialCarryoverBongkar ?? 0,
          bajak: decRecord.initialCarryoverBajak ?? 0,
          sn: decRecord.initialCarryoverSN ?? 0,
        };

        const totalStokLahan = totalBongkar + totalBajak + totalSn + totalTanam;

        return {
          year: safeYear,
          month: 'ALL',
          monthLabel: `Tahun ${safeYear} (Semua Bulan)`,
          stokLahan: {
            value: Math.round(totalStokLahan * 100) / 100,
            formula: `Bongkar (${fmt(totalBongkar)}) + Bajak (${fmt(totalBajak)}) + SN (${fmt(totalSn)}) + Tanam (${fmt(totalTanam)})`,
            details: {
              bongkar: Math.round(totalBongkar * 100) / 100,
              bajak: Math.round(totalBajak * 100) / 100,
              sn: Math.round(totalSn * 100) / 100,
              tanam: Math.round(totalTanam * 100) / 100,
            },
          },
          stokBongkar: {
            value: decRecord.stokBongkar,
            formula: decBreakdown.stokBongkarFormula ?? `${fmt(initial.bongkar)} (Stok Bongkar) + ${fmt(decRecord.bongkar)} (Bongkar) - ${fmt(decRecord.bajak)} (Bajak)`,
            initialCarryover: initial.bongkar,
          },
          stokBajak: {
            value: decRecord.stokBajak,
            formula: decBreakdown.stokBajakFormula ?? `${fmt(initial.bajak)} (Stok Bajak) + ${fmt(decRecord.bajak)} (Bajak) - ${fmt(decRecord.sn)} (SN)`,
            initialCarryover: initial.bajak,
          },
          stokSN: {
            value: decRecord.stokSN,
            formula: decBreakdown.stokSNFormula ?? `${fmt(initial.sn)} (Stok SN) + ${fmt(decRecord.sn)} (SN) - ${fmt(decRecord.tanam)} (Tanam)`,
            initialCarryover: initial.sn,
          },
          totalStok: {
            value: decRecord.totalStok,
            formula: `Bongkar (${fmt(decRecord.stokBongkar)}) + Bajak (${fmt(decRecord.stokBajak)}) + SN (${fmt(decRecord.stokSN)})`,
          },
          monthlyBreakdown,
          availableYears: AVAILABLE_STOK_YEARS,
          availableMonths: ALL_MONTH_NAMES,
        };
      }

      // Single month or multi-month selection (e.g. ['Jan'], ['Jan', 'Feb'], dst)
      const selectedItems = monthlyBreakdown.filter((r) => monthList.includes(r.month));
      if (selectedItems.length > 0) {
        selectedItems.sort((a, b) => a.monthIndex - b.monthIndex);
        const latestItem = selectedItems[selectedItems.length - 1];

        let totalBongkar = 0;
        let totalBajak = 0;
        let totalSn = 0;
        let totalTanam = 0;

        for (const item of selectedItems) {
          totalBongkar += item.bongkar;
          totalBajak += item.bajak;
          totalSn += item.sn;
          totalTanam += item.tanam;
        }

        const totalMonthLahan = totalBongkar + totalBajak + totalSn + totalTanam;

        const monthLabel =
          selectedItems.length === 1
            ? `${selectedItems[0].month} ${safeYear}`
            : selectedItems.length <= 3
            ? `${selectedItems.map((r) => r.month).join(', ')} ${safeYear}`
            : `${selectedItems.length} Bulan (${selectedItems[0].month} - ${latestItem.month}) ${safeYear}`;

        return {
          year: safeYear,
          month: monthList.join(','),
          monthLabel,
          stokLahan: {
            value: Math.round(totalMonthLahan * 100) / 100,
            formula: `Bongkar (${fmt(totalBongkar)}) + Bajak (${fmt(totalBajak)}) + SN (${fmt(totalSn)}) + Tanam (${fmt(totalTanam)})`,
            details: {
              bongkar: Math.round(totalBongkar * 100) / 100,
              bajak: Math.round(totalBajak * 100) / 100,
              sn: Math.round(totalSn * 100) / 100,
              tanam: Math.round(totalTanam * 100) / 100,
            },
          },
          stokBongkar: {
            value: latestItem.stokBongkar,
            formula: latestItem.stokBongkarFormula!,
          },
          stokBajak: {
            value: latestItem.stokBajak,
            formula: latestItem.stokBajakFormula!,
          },
          stokSN: {
            value: latestItem.stokSN,
            formula: latestItem.stokSNFormula!,
          },
          totalStok: {
            value: latestItem.totalStok,
            formula: `Bongkar (${fmt(latestItem.stokBongkar)}) + Bajak (${fmt(latestItem.stokBajak)}) + SN (${fmt(latestItem.stokSN)})`,
          },
          monthlyBreakdown,
          availableYears: AVAILABLE_STOK_YEARS,
          availableMonths: ALL_MONTH_NAMES,
        };
      }

    }
  } catch (error) {
    console.error('❌ Gagal membaca StageStockSummary dari PostgreSQL:', error);
  }

  // Fallback aman
  return getStokLahanSummary(safeYear, targetMonth);
}
