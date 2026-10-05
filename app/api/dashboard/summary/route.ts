import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLandStokCategory } from '@/lib/landClassification';
import { getDbStageStockSummary } from '@/lib/stageStockDb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wilayahFilter = searchParams.get('wilayah');
    const selectedPeriode = searchParams.get('periode');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    const stokYear = yearParam ? parseInt(yearParam, 10) : 2026;
    const stokMonth = monthParam || 'CURRENT';
    const stokLahanSummary = await getDbStageStockSummary(stokYear, stokMonth);

    const whereClause: any = {};
    if (wilayahFilter && wilayahFilter !== 'ALL') {
      const list = wilayahFilter.split(',').map((w) => w.trim()).filter(Boolean);
      if (list.length === 1) {
        whereClause.wilayah = list[0];
      } else if (list.length > 1) {
        whereClause.wilayah = { in: list };
      }
    }

    const totalLands = await prisma.land.count({ where: whereClause });

    const lands = await prisma.land.findMany({
      where: whereClause,
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        luasBruto: true,
        luasNetto: true,
        status: true,
        progressTanam: true,
        jenisBibit: true,
        kelasBibit: true,
        statusAplikasi: true,
        aplikasiTerakhir: true,
        statusProduksi: true,
        realBajak: true,
        realBkr: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        activities: {
          select: { code: true, status: true, realisasiDate: true },
        },
      },
      orderBy: { lokasi: 'asc' },
    });

    let totalLuasBruto = 0;
    let totalLuasNetto = 0;
    let totalRealisasiHa = 0;
    let selesaiTanamCount = 0;
    let prosesTanamCount = 0;
    let snCount = 0;
    let bjkCount = 0;
    let bkCount = 0;

    let stokLahanHa = 0; // Total luas lahan aktif stok operasional (BK + BJK + SN)

    const wilayahStatsMap: Record<
      string,
      {
        count: number;
        luasNetto: number;
        realisasiHa: number;
        bkLocations: string[];
        bjkLocations: string[];
        snLocations: string[];
        prosesLocations: string[];
        selesaiLocations: string[];
      }
    > = {};

    const bjkCodes = [
      '11.BAJAK_AWAL',
      '17.SUBSOILER',
      '18.FINISHING_HARROW',
      '19.FINISHING_ROTARY',
      '20.ROTARY_FH2',
      '21.RIDGER',
    ];

    for (const l of lands) {
      totalLuasBruto += l.luasBruto || 0;
      totalLuasNetto += l.luasNetto || 0;

      const actReal: Record<string, string> = {};
      for (const a of l.activities) {
        if (a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0') {
          actReal[a.code] = a.realisasiDate;
        }
      }

      // Classify stage matching Excel Col 1 (Aplikasi Terakhir):
      const cat = getLandStokCategory(l);

      if (cat === 'SELESAI') {
        selesaiTanamCount++;
        totalRealisasiHa += l.luasNetto || 0;
      } else if (cat === 'PROSES') {
        prosesTanamCount++;
        totalRealisasiHa += (l.luasNetto || 0) * 0.5;
        stokLahanHa += l.luasNetto || 0;
      } else if (cat === 'SN') {
        snCount++;
        stokLahanHa += l.luasNetto || 0;
      } else if (cat === 'BJK') {
        bjkCount++;
        stokLahanHa += l.luasNetto || 0;
      } else {
        bkCount++;
        stokLahanHa += l.luasNetto || 0;
      }

      // Group per wilayah with location lists for interactive tooltips
      const w = l.wilayah || 'Other';
      if (!wilayahStatsMap[w]) {
        wilayahStatsMap[w] = {
          count: 0,
          luasNetto: 0,
          realisasiHa: 0,
          bkLocations: [],
          bjkLocations: [],
          snLocations: [],
          prosesLocations: [],
          selesaiLocations: [],
        };
      }
      wilayahStatsMap[w].count += 1;
      wilayahStatsMap[w].luasNetto += l.luasNetto || 0;
      if (cat === 'SELESAI') {
        wilayahStatsMap[w].realisasiHa += l.luasNetto || 0;
        wilayahStatsMap[w].selesaiLocations.push(l.lokasi);
      } else if (cat === 'PROSES') {
        wilayahStatsMap[w].prosesLocations.push(l.lokasi);
      } else if (cat === 'SN') {
        wilayahStatsMap[w].snLocations.push(l.lokasi);
      } else if (cat === 'BJK') {
        wilayahStatsMap[w].bjkLocations.push(l.lokasi);
      } else {
        wilayahStatsMap[w].bkLocations.push(l.lokasi);
      }
    }

    const overallProgress = totalLuasNetto > 0 ? (totalRealisasiHa / totalLuasNetto) * 100 : 0;

    // Calculate Stok Bongkar formula (Bab 8 PRD):
    // Stok Bongkar = Real BK Bulan Lalu + Real BK Bulan Ini - Real Bajak Bulan Ini
    const monthlySumms = await prisma.monthlySummary.findMany({
      where: { category: 'Bongkar' },
      orderBy: [{ year: 'asc' }, { monthIndex: 'asc' }],
    });

    // Real Bajak per month benchmark data from sheet Summ (row 28)
    const bajakBenchmarkByMonth: Record<string, number> = {
      'Jan-26': 67.06,
      'Feb-26': 90.09,
      'Mar-26': 108.25,
      'Apr-26': 88.68,
      'Mei-26': 60.79,
      'Jun-26': 131.70,
      'Jul-26': 136.37,
      'Agu-26': 105.33,
      'Sep-26': 60.79,
      'Okt-26': 187.63,
      'Nov-26': 206.13,
      'Des-26': 261.28,
    };

    // Determine target month and previous month
    // Determine target month(s) and calculate Stok Bongkar
    const validMonths = monthlySumms.filter((m) => m.realisasi !== null && m.realisasi > 0);
    const requestedPeriods = selectedPeriode && selectedPeriode !== 'ALL' && selectedPeriode !== 'LATEST'
      ? selectedPeriode.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    let stokBongkarHa = 0;
    let stokBongkarDetails: any = null;

    if (selectedPeriode === 'ALL') {
      // "Pilih Semua" -> Akumulasi seluruh periode
      let totalRealBkNow = 0;
      let totalRealBkPrev = 0;
      let totalRealBajakNow = 0;

      validMonths.forEach((m, idx) => {
        const prev = idx > 0 ? validMonths[idx - 1].realisasi || 0 : 0;
        const now = m.realisasi || 0;
        const bjk = bajakBenchmarkByMonth[m.monthYear] || 60.0;
        const sb = Math.max(0, prev + now - bjk);
        stokBongkarHa += sb;
        totalRealBkNow += now;
        totalRealBkPrev += prev;
        totalRealBajakNow += bjk;
      });

      stokBongkarDetails = {
        selectedPeriod: 'Semua Periode',
        realBkPrev: Math.round(totalRealBkPrev * 100) / 100,
        realBkPrevMonth: 'Semua',
        realBkNow: Math.round(totalRealBkNow * 100) / 100,
        realBkNowMonth: 'Semua',
        realBajakNow: Math.round(totalRealBajakNow * 100) / 100,
        stokBongkarHa: Math.round(stokBongkarHa * 100) / 100,
        formula: `Akumulasi seluruh ${validMonths.length} periode: ${stokBongkarHa.toFixed(1)} Ha`,
      };
    } else if (requestedPeriods.length > 1) {
      // Multi-select beberapa bulan
      let totalRealBkNow = 0;
      let totalRealBkPrev = 0;
      let totalRealBajakNow = 0;

      requestedPeriods.forEach((periodName) => {
        const idx = validMonths.findIndex((m) => m.monthYear === periodName);
        if (idx !== -1) {
          const prev = idx > 0 ? validMonths[idx - 1].realisasi || 0 : 0;
          const now = validMonths[idx].realisasi || 0;
          const bjk = bajakBenchmarkByMonth[periodName] || 60.0;
          const sb = Math.max(0, prev + now - bjk);
          stokBongkarHa += sb;
          totalRealBkNow += now;
          totalRealBkPrev += prev;
          totalRealBajakNow += bjk;
        }
      });

      stokBongkarDetails = {
        selectedPeriod: requestedPeriods.length <= 2 ? requestedPeriods.join(', ') : `${requestedPeriods.length} Bulan`,
        realBkPrev: Math.round(totalRealBkPrev * 100) / 100,
        realBkPrevMonth: 'Multi',
        realBkNow: Math.round(totalRealBkNow * 100) / 100,
        realBkNowMonth: 'Multi',
        realBajakNow: Math.round(totalRealBajakNow * 100) / 100,
        stokBongkarHa: Math.round(stokBongkarHa * 100) / 100,
        formula: `Akumulasi ${requestedPeriods.length} bulan terpilih: ${stokBongkarHa.toFixed(1)} Ha`,
      };
    } else {
      // Single month or 'LATEST' (default latest month)
      let targetIdx = validMonths.length - 1;
      if (requestedPeriods.length === 1) {
        const foundIdx = validMonths.findIndex((m) => m.monthYear === requestedPeriods[0]);
        if (foundIdx !== -1) targetIdx = foundIdx;
      }

      const currentMonthData = validMonths[targetIdx] || validMonths[validMonths.length - 1];
      const prevMonthData = targetIdx > 0 ? validMonths[targetIdx - 1] : null;

      const realBkNow = currentMonthData?.realisasi || 82.61;
      const realBkNowMonth = currentMonthData?.monthYear || 'Sep-26';
      const realBkPrev = prevMonthData?.realisasi || 118.04;
      const realBkPrevMonth = prevMonthData?.monthYear || 'Agu-26';
      const realBajakNow = bajakBenchmarkByMonth[realBkNowMonth] || 60.0;

      stokBongkarHa = Math.max(0, realBkPrev + realBkNow - realBajakNow);
      stokBongkarDetails = {
        selectedPeriod: realBkNowMonth,
        realBkPrev: Math.round(realBkPrev * 100) / 100,
        realBkPrevMonth,
        realBkNow: Math.round(realBkNow * 100) / 100,
        realBkNowMonth,
        realBajakNow: Math.round(realBajakNow * 100) / 100,
        stokBongkarHa: Math.round(stokBongkarHa * 100) / 100,
        formula: `${realBkPrev.toFixed(1)} + ${realBkNow.toFixed(1)} - ${realBajakNow.toFixed(1)} = ${stokBongkarHa.toFixed(1)} Ha`,
      };
    }

    // Available Wilayahs
    const allWilayahs = await prisma.land.findMany({
      select: { wilayah: true },
      distinct: ['wilayah'],
      orderBy: { wilayah: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        totalLands,
        stokLahanSummary,
        stokLahanHa: Math.round(stokLahanHa * 100) / 100,
        stokBongkarHa: Math.round(stokBongkarHa * 100) / 100,
        stokBongkarDetails,
        availablePeriods: validMonths.map((m) => m.monthYear),
        totalLuasBruto: Math.round(totalLuasBruto * 100) / 100,
        totalLuasNetto: Math.round(totalLuasNetto * 100) / 100,
        totalRealisasiHa: Math.round(totalRealisasiHa * 100) / 100,
        overallProgress: Math.round(overallProgress * 10) / 10,
        stockStageCounts: {
          bk: bkCount,
          bjk: bjkCount,
          sn: snCount,
          proses: prosesTanamCount,
          selesai: selesaiTanamCount,
        },
        tanamStatusCounts: {
          selesai: selesaiTanamCount,
          proses: prosesTanamCount,
          belum: totalLands - selesaiTanamCount - prosesTanamCount,
        },
        wilayahBreakdown: Object.entries(wilayahStatsMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([wilayah, d]) => ({
            wilayah,
            count: d.count,
            luasNetto: Math.round(d.luasNetto * 100) / 100,
            realisasiHa: Math.round(d.realisasiHa * 100) / 100,
            bkCount: d.bkLocations.length,
            bkLocations: d.bkLocations,
            bjkCount: d.bjkLocations.length,
            bjkLocations: d.bjkLocations,
            snCount: d.snLocations.length,
            snLocations: d.snLocations,
            prosesCount: d.prosesLocations.length,
            prosesLocations: d.prosesLocations,
            selesaiCount: d.selesaiLocations.length,
            selesaiLocations: d.selesaiLocations,
          })),
        availableWilayahs: allWilayahs.map((w) => w.wilayah),
      },
    });
  } catch (error: any) {
    console.error('Error fetching summary:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
