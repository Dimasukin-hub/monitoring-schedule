import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getLandStokCategory } from '@/lib/landClassification';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wilayahFilter = searchParams.get('wilayah');
    const yearParam = searchParams.get('year');
    const targetYear = yearParam && yearParam !== 'ALL' ? parseInt(yearParam, 10) : 2026;

    const landWhere: any = {};
    if (yearParam !== 'ALL') {
      landWhere.year = targetYear;
    }
    if (wilayahFilter && wilayahFilter !== 'ALL') {
      const list = wilayahFilter.split(',').map((w) => w.trim()).filter(Boolean);
      if (list.length === 1) {
        landWhere.wilayah = list[0];
      } else if (list.length > 1) {
        landWhere.wilayah = { in: list };
      }
    }

    // 1. Monthly Summary for Bongkar, Bajak, Siap Tanam & Tanam (1 periode saja: Jan-26 s/d Des-26)
    const monthlyBongkarRaw = await prisma.monthlySummary.findMany({
      where: {
        category: 'Bongkar',
        year: 2026,
      },
      orderBy: [{ year: 'asc' }, { monthIndex: 'asc' }],
    });

    const monthlyBajakRaw = await prisma.monthlySummary.findMany({
      where: { category: 'Bajak', year: 2026 },
      orderBy: [{ year: 'asc' }, { monthIndex: 'asc' }],
    });

    const monthlySiapTanamRaw = await prisma.monthlySummary.findMany({
      where: { category: 'Siap Tanam', year: 2026 },
      orderBy: [{ year: 'asc' }, { monthIndex: 'asc' }],
    });

    const monthlyTanamRaw = await prisma.monthlySummary.findMany({
      where: {
        category: 'Tanam',
        ...(yearParam !== 'ALL' ? { year: targetYear } : {}),
      },
      orderBy: [{ year: 'asc' }, { monthIndex: 'asc' }],
    });

    // 2. Yearly Aggregation for Toggle Mode Tahunan/Bulanan (Bab 10 PRD)
    const aggregateYearly = (list: typeof monthlyBongkarRaw) => {
      const yearlyMap: Record<number, { year: number; rfc: number; rencana: number; realisasi: number; deviasi: number }> = {};
      for (const m of list) {
        const yr = m.year || 2026;
        if (!yearlyMap[yr]) {
          yearlyMap[yr] = { year: yr, rfc: 0, rencana: 0, realisasi: 0, deviasi: 0 };
        }
        yearlyMap[yr].rfc += m.rfc || 0;
        yearlyMap[yr].rencana += m.rencana || 0;
        yearlyMap[yr].realisasi += m.realisasi || 0;
        yearlyMap[yr].deviasi += m.deviasi || 0;
      }
      return Object.values(yearlyMap)
        .sort((a, b) => a.year - b.year)
        .map((y) => ({
          year: String(y.year),
          rfc: Math.round(y.rfc * 10) / 10,
          rencana: Math.round(y.rencana * 10) / 10,
          realisasi: Math.round(y.realisasi * 10) / 10,
          deviasi: Math.round(y.deviasi * 10) / 10,
        }));
    };

    const yearlyBongkar = aggregateYearly(monthlyBongkarRaw);
    const yearlyBajak = aggregateYearly(monthlyBajakRaw);
    const yearlySiapTanam = aggregateYearly(monthlySiapTanamRaw);
    const yearlyTanam = aggregateYearly(monthlyTanamRaw);

    // 3. Activity Stages Funnel (from LandActivity)
    const activityStatsRaw = await prisma.landActivity.groupBy({
      by: ['code', 'name', 'status', 'stepOrder'],
      where: {
        land: landWhere,
      },
      _count: {
        id: true,
      },
      orderBy: {
        stepOrder: 'asc',
      },
    });

    const activityMap: Record<
      string,
      { code: string; name: string; stepOrder: number; completed: number; inProgress: number; pending: number }
    > = {};

    for (const stat of activityStatsRaw) {
      if (!activityMap[stat.code]) {
        activityMap[stat.code] = {
          code: stat.code,
          name: stat.name,
          stepOrder: stat.stepOrder,
          completed: 0,
          inProgress: 0,
          pending: 0,
        };
      }
      if (stat.status === 'COMPLETED') {
        activityMap[stat.code].completed += stat._count.id;
      } else if (stat.status === 'IN_PROGRESS') {
        activityMap[stat.code].inProgress += stat._count.id;
      } else {
        activityMap[stat.code].pending += stat._count.id;
      }
    }

    const activityFunnel = Object.values(activityMap).sort((a, b) => a.stepOrder - b.stepOrder);

    // 4. Detailed Wilayah Positions for BK, BJK, SN & Planting (Bab 12, 13, 14 PRD)
    const lands = await prisma.land.findMany({
      where: landWhere,
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        luasNetto: true,
        bulanTanam: true,
        progressTanam: true,
        aplikasiTerakhir: true,
        statusAplikasi: true,
        realBajak: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        activities: {
          select: { code: true, status: true, realisasiDate: true },
        },
      },
      orderBy: { lokasi: 'asc' },
    });

    const posMap: Record<
      string,
      {
        wilayah: string;
        bkLocations: string[];
        bkLuas: number;
        bjkLocations: string[];
        bjkLuas: number;
        snLocations: string[];
        snLuas: number;
        prosesLocations: string[];
        prosesLuas: number;
        selesaiLocations: string[];
        selesaiLuas: number;
      }
    > = {};

    const standardWilayahs = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07'];
    const normalizeWilayah = (rawW: string | null | undefined): string => {
      if (!rawW) return 'W01';
      const clean = rawW.trim().toUpperCase();
      if (clean === 'ARS1') return 'W07';
      if (clean === 'SAG1' || clean === 'MD2') return 'W04';
      if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
      if (clean.startsWith('AW')) {
        const num = clean.slice(2);
        return num.length === 1 ? `W0${num}` : `W${num}`;
      }
      return clean;
    };

    const targetWilayahList = (wilayahFilter && wilayahFilter !== 'ALL')
      ? wilayahFilter.split(',').map(normalizeWilayah).filter(Boolean)
      : standardWilayahs;

    for (const stdW of targetWilayahList) {
      posMap[stdW] = {
        wilayah: stdW,
        bkLocations: [],
        bkLuas: 0,
        bjkLocations: [],
        bjkLuas: 0,
        snLocations: [],
        snLuas: 0,
        prosesLocations: [],
        prosesLuas: 0,
        selesaiLocations: [],
        selesaiLuas: 0,
      };
    }

    // Grouping by Month of Planting for Tanam distribution
    const monthPlantingMap: Record<string, { totalLahan: number; totalLuasNetto: number }> = {};

    for (const l of lands) {
      const w = normalizeWilayah(l.wilayah);
      if (!posMap[w]) {
        posMap[w] = {
          wilayah: w,
          bkLocations: [],
          bkLuas: 0,
          bjkLocations: [],
          bjkLuas: 0,
          snLocations: [],
          snLuas: 0,
          prosesLocations: [],
          prosesLuas: 0,
          selesaiLocations: [],
          selesaiLuas: 0,
        };
      }

      if (l.bulanTanam) {
        if (!monthPlantingMap[l.bulanTanam]) {
          monthPlantingMap[l.bulanTanam] = { totalLahan: 0, totalLuasNetto: 0 };
        }
        monthPlantingMap[l.bulanTanam].totalLahan += 1;
        monthPlantingMap[l.bulanTanam].totalLuasNetto += l.luasNetto || 0;
      }

      const actReal: Record<string, string> = {};
      for (const a of l.activities) {
        if (a.realisasiDate && a.realisasiDate !== '-' && a.realisasiDate !== '0') {
          actReal[a.code] = a.realisasiDate;
        }
      }

      const cat = getLandStokCategory(l);
      const luas = l.luasNetto || 0;

      if (cat === 'SELESAI') {
        posMap[w].selesaiLocations.push(l.lokasi);
        posMap[w].selesaiLuas += luas;
      } else if (cat === 'PROSES') {
        posMap[w].prosesLocations.push(l.lokasi);
        posMap[w].prosesLuas += luas;
      } else if (cat === 'SN') {
        posMap[w].snLocations.push(l.lokasi);
        posMap[w].snLuas += luas;
      } else if (cat === 'BJK') {
        posMap[w].bjkLocations.push(l.lokasi);
        posMap[w].bjkLuas += luas;
      } else {
        posMap[w].bkLocations.push(l.lokasi);
        posMap[w].bkLuas += luas;
      }
    }

    const wilayahPositions = Object.values(posMap).sort((a, b) =>
      a.wilayah.localeCompare(b.wilayah, undefined, { numeric: true, sensitivity: 'base' })
    );

    // Planting by month sorted
    const plantingByMonth = Object.entries(monthPlantingMap)
      .map(([bulan, data]) => ({
        bulan,
        totalLahan: data.totalLahan,
        totalLuasNetto: Math.round(data.totalLuasNetto * 100) / 100,
      }))
      .slice(0, 15);

    // 5. Seed Summaries
    const seedSummaries = await prisma.seedSummary.findMany({
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        monthlyBongkar: monthlyBongkarRaw.map((m) => ({
          month: m.monthYear,
          year: m.year,
          monthIndex: m.monthIndex,
          rfc: m.rfc || 0,
          rencana: m.rencana || 0,
          realisasi: m.realisasi || 0,
          deviasi: m.deviasi || 0,
          akumulasi: m.akumulasi || 0,
        })),
        monthlyBajak: monthlyBajakRaw.map((m) => ({
          month: m.monthYear,
          year: m.year,
          monthIndex: m.monthIndex,
          rfc: m.rfc || 0,
          rencana: m.rencana || 0,
          realisasi: m.realisasi || 0,
          deviasi: m.deviasi || 0,
          akumulasi: m.akumulasi || 0,
        })),
        monthlySiapTanam: monthlySiapTanamRaw.map((m) => ({
          month: m.monthYear,
          year: m.year,
          monthIndex: m.monthIndex,
          rfc: m.rfc || 0,
          rencana: m.rencana || 0,
          realisasi: m.realisasi || 0,
          deviasi: m.deviasi || 0,
          akumulasi: m.akumulasi || 0,
        })),
        monthlyTanam: monthlyTanamRaw.map((m) => ({
          month: m.monthYear,
          year: m.year,
          monthIndex: m.monthIndex,
          rfc: m.rfc || 0,
          rencana: m.rencana || 0,
          realisasi: m.realisasi || 0,
          deviasi: m.deviasi || 0,
        })),
        yearlyBongkar,
        yearlyBajak,
        yearlySiapTanam,
        yearlyTanam,
        wilayahPositions: wilayahPositions.map((wp) => ({
          wilayah: wp.wilayah,
          bkCount: wp.bkLocations.length,
          bkLuas: Math.round(wp.bkLuas * 100) / 100,
          bkLocations: wp.bkLocations,
          bjkCount: wp.bjkLocations.length,
          bjkLuas: Math.round(wp.bjkLuas * 100) / 100,
          bjkLocations: wp.bjkLocations,
          snCount: wp.snLocations.length,
          snLuas: Math.round(wp.snLuas * 100) / 100,
          snLocations: wp.snLocations,
          prosesCount: wp.prosesLocations.length,
          prosesLuas: Math.round(wp.prosesLuas * 100) / 100,
          prosesLocations: wp.prosesLocations,
          selesaiCount: wp.selesaiLocations.length,
          selesaiLuas: Math.round(wp.selesaiLuas * 100) / 100,
          selesaiLocations: wp.selesaiLocations,
        })),
        plantingByMonth,
        activityFunnel: activityFunnel.map((act) => {
          const total = act.completed + act.inProgress + act.pending;
          const pct = total > 0 ? Math.round((act.completed / total) * 100) : 0;
          return {
            ...act,
            total,
            completionRate: pct,
          };
        }),
        seedSummaries: seedSummaries.map((s) => ({
          type: s.bibitType,
          kelas: s.kelas,
          kebutuhan: s.kebutuhan || 0,
          potensi: s.potensi || 0,
          realisasi: s.realisasi || 0,
          deviasi: s.deviasi || 0,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching charts data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
