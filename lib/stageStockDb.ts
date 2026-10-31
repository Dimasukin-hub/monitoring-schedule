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

        // Hitung total akumulasi stok dari seluruh bulan dalam setahun
        let sumStokBongkar = 0;
        let sumStokBajak = 0;
        let sumStokSN = 0;

        for (const r of records) {
          sumStokBongkar += r.stokBongkar;
          sumStokBajak += r.stokBajak;
          sumStokSN += r.stokSN;
        }

        sumStokBongkar = Math.round(sumStokBongkar * 100) / 100;
        sumStokBajak = Math.round(sumStokBajak * 100) / 100;
        sumStokSN = Math.round(sumStokSN * 100) / 100;
        const sumTotalStok = Math.round((sumStokBongkar + sumStokBajak + sumStokSN) * 100) / 100;

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
            value: sumStokBongkar,
            formula: `Akumulasi Stok Bongkar (Jan - Des): ${fmt(sumStokBongkar)} Ha`,
            initialCarryover: initial.bongkar,
          },
          stokBajak: {
            value: sumStokBajak,
            formula: `Akumulasi Stok Bajak (Jan - Des): ${fmt(sumStokBajak)} Ha`,
            initialCarryover: initial.bajak,
          },
          stokSN: {
            value: sumStokSN,
            formula: `Akumulasi Stok Siap Tanam (Jan - Des): ${fmt(sumStokSN)} Ha`,
            initialCarryover: initial.sn,
          },
          totalStok: {
            value: sumTotalStok,
            formula: `Bongkar (${fmt(sumStokBongkar)}) + Bajak (${fmt(sumStokBajak)}) + SN (${fmt(sumStokSN)})`,
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

        if (selectedItems.length === 1) {
          const singleItem = selectedItems[0];
          return {
            year: safeYear,
            month: monthList.join(','),
            monthLabel: `${singleItem.month} ${safeYear}`,
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
              value: singleItem.stokBongkar,
              formula: singleItem.stokBongkarFormula!,
            },
            stokBajak: {
              value: singleItem.stokBajak,
              formula: singleItem.stokBajakFormula!,
            },
            stokSN: {
              value: singleItem.stokSN,
              formula: singleItem.stokSNFormula!,
            },
            totalStok: {
              value: singleItem.totalStok,
              formula: `Bongkar (${fmt(singleItem.stokBongkar)}) + Bajak (${fmt(singleItem.stokBajak)}) + SN (${fmt(singleItem.stokSN)})`,
            },
            monthlyBreakdown,
            availableYears: AVAILABLE_STOK_YEARS,
            availableMonths: ALL_MONTH_NAMES,
          };
        }

        // Multi-month selection (selectedItems.length > 1)
        let sumStokBongkar = 0;
        let sumStokBajak = 0;
        let sumStokSN = 0;

        for (const item of selectedItems) {
          sumStokBongkar += item.stokBongkar;
          sumStokBajak += item.stokBajak;
          sumStokSN += item.stokSN;
        }

        sumStokBongkar = Math.round(sumStokBongkar * 100) / 100;
        sumStokBajak = Math.round(sumStokBajak * 100) / 100;
        sumStokSN = Math.round(sumStokSN * 100) / 100;
        const sumTotalStok = Math.round((sumStokBongkar + sumStokBajak + sumStokSN) * 100) / 100;

        const monthLabel =
          selectedItems.length <= 3
            ? `${selectedItems.map((r) => r.month).join(', ')} ${safeYear}`
            : `${selectedItems.length} Bulan (${selectedItems[0].month} - ${selectedItems[selectedItems.length - 1].month}) ${safeYear}`;

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
            value: sumStokBongkar,
            formula: `Akumulasi Stok Bongkar (${selectedItems.length} Bulan): ${fmt(sumStokBongkar)} Ha`,
          },
          stokBajak: {
            value: sumStokBajak,
            formula: `Akumulasi Stok Bajak (${selectedItems.length} Bulan): ${fmt(sumStokBajak)} Ha`,
          },
          stokSN: {
            value: sumStokSN,
            formula: `Akumulasi Stok Siap Tanam (${selectedItems.length} Bulan): ${fmt(sumStokSN)} Ha`,
          },
          totalStok: {
            value: sumTotalStok,
            formula: `Bongkar (${fmt(sumStokBongkar)}) + Bajak (${fmt(sumStokBajak)}) + SN (${fmt(sumStokSN)})`,
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
