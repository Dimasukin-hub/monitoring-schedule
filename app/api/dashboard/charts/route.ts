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
        rencBkr: true,
        realBkr: true,
        rencBajak: true,
        realBajak: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        aplikasiDetails: true,
        activities: {
          select: { code: true, status: true, rencanaDate: true, realisasiDate: true },
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

    // 5. Daily and Weekly Aggregation for Bongkar, Bajak, Siap Tanam
    const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const parseDateToIso = (dateStr: string | null | undefined): string | null => {
      if (!dateStr || typeof dateStr !== 'string') return null;
      const s = dateStr.trim();
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      }
      const ymdMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (ymdMatch) {
        return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
      }
      return null;
    };

    const getWeekNumber = (isoDateStr: string): string => {
      const d = new Date(isoDateStr);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 4 - (d.getDay() || 7));
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
      // Batasi maksimal 52 minggu (minggu 53 otomatis digabung ke minggu 52 agar tidak rancu dengan wilayah W01-W07)
      const cappedWeek = weekNo > 52 ? 52 : (weekNo < 1 ? 1 : weekNo);
      return `Mgg ${String(cappedWeek).padStart(2, '0')}`;
    };

    const formatDailyLabel = (isoDateStr: string): string => {
      const [y, m, d] = isoDateStr.split('-');
      const mIndex = parseInt(m, 10) - 1;
      const mName = MONTH_NAMES_SHORT[mIndex] || m;
      return `${d} ${mName} ${y.slice(2)}`;
    };

    const getMonthKey = (isoDateStr: string): string => {
      const [y, m] = isoDateStr.split('-');
      const mIndex = parseInt(m, 10) - 1;
      const mName = MONTH_NAMES_SHORT[mIndex] || m;
      return `${mName}-${y.slice(2)}`;
    };

    const yearPrefix = yearParam !== 'ALL' ? String(targetYear) : '2026';

    const BONGKAR_CODES = [
      '01.CHOPPER',
      '02.CHOPPER_LU',
      '03.RH1',
      '04.CUTTING_BANANA',
      '05.DOLOMIT',
      '06.DP1',
      '07.DP_CROSS',
      '08.DP2',
      '09.BELERANG',
      '10.KOMPOS',
    ];

    const BAJAK_CODES = [
      '11.BAJAK_AWAL',
      '17.SUBSOILER',
      '18.FINISHING_HARROW',
      '19.FINISHING_ROTARY',
      '20.ROTARY_FH2',
      '21.RIDGER',
    ];

    const BAJAK_DETAILS_RENC = [
      'bajakAwalMb5Btr',
      'bajakAwalMb25',
      'bajakAwalMph',
      'bajakAwalNardi',
      'hrEksMb',
      'rgKons',
      'tnmKons',
      'tutupParit',
      'gypsum',
      'komFaba',
      'freeLand',
      'bedder',
      'fhHarrow',
      'subsoilerSs1',
      'subsoilerSs2',
      'finishingFhkRent',
      'finishingRotaryFh1',
      'finishingRotaryFh2',
      'ridger',
    ];

    const BAJAK_DETAILS_REAL = [
      'realBajakAwalMb5Btr',
      'realBajakAwalMb25',
      'realBajakAwalHoward',
      'realBajakAwalNardi',
      'realHrEksMb',
      'realExcaStdAwal',
      'realExcaStdAkhir',
      'realTutupParit',
      'realGypsum',
      'realKompos2',
      'realFreeLand',
      'realBedder',
      'realFhHarrow',
      'realSubsoilerSs1',
      'realFinishingFhkRent',
      'realFinishingRotaryFh1',
      'realRotaryFh2',
      'realRidger',
    ];

    const getEarliestDate = (dates: (string | null | undefined)[]): string | null => {
      const isos = dates
        .map((d) => parseDateToIso(d))
        .filter((d): d is string => Boolean(d));
      if (isos.length === 0) return null;
      isos.sort();
      return isos[0];
    };

    const dailyBongkarMap: Record<string, { rencana: number; realisasi: number }> = {};
    const weeklyBongkarMap: Record<string, { rencana: number; realisasi: number }> = {};

    const dailyBajakMap: Record<string, { rencana: number; realisasi: number }> = {};
    const weeklyBajakMap: Record<string, { rencana: number; realisasi: number }> = {};

    const dailySiapTanamMap: Record<string, { rencana: number; realisasi: number }> = {};
    const weeklySiapTanamMap: Record<string, { rencana: number; realisasi: number }> = {};

    for (const l of lands) {
      const luas = Number(l.luasNetto) || 0;
      const details = (l.aplikasiDetails as Record<string, string>) || {};

      // Bongkar (Chopper s/d Kompos: Kolom N s/d W untuk Rencana, Kolom BW s/d CF untuk Realisasi)
      const bkrRencDates = l.activities.filter((a) => BONGKAR_CODES.includes(a.code)).map((a) => a.rencanaDate);
      const bkrRealDates = l.activities.filter((a) => BONGKAR_CODES.includes(a.code)).map((a) => a.realisasiDate);
      const rBkr = getEarliestDate(bkrRencDates) || parseDateToIso(l.rencBkr);
      const aBkr = getEarliestDate(bkrRealDates) || parseDateToIso(l.realBkr);
      if (rBkr && rBkr.startsWith(yearPrefix)) {
        if (!dailyBongkarMap[rBkr]) dailyBongkarMap[rBkr] = { rencana: 0, realisasi: 0 };
        dailyBongkarMap[rBkr].rencana += luas;
        const w = getWeekNumber(rBkr);
        if (!weeklyBongkarMap[w]) weeklyBongkarMap[w] = { rencana: 0, realisasi: 0 };
        weeklyBongkarMap[w].rencana += luas;
      }
      if (aBkr && aBkr.startsWith(yearPrefix)) {
        if (!dailyBongkarMap[aBkr]) dailyBongkarMap[aBkr] = { rencana: 0, realisasi: 0 };
        dailyBongkarMap[aBkr].realisasi += luas;
        const w = getWeekNumber(aBkr);
        if (!weeklyBongkarMap[w]) weeklyBongkarMap[w] = { rencana: 0, realisasi: 0 };
        weeklyBongkarMap[w].realisasi += luas;
      }

      // Bajak (MB 5 BTR s/d Ridger: Kolom Z s/d AR untuk Rencana, Kolom CG s/d CX untuk Realisasi)
      const bjkRencDates = [
        ...l.activities.filter((a) => BAJAK_CODES.includes(a.code)).map((a) => a.rencanaDate),
        ...BAJAK_DETAILS_RENC.map((k) => details[k]),
      ];
      const bjkRealDates = [
        ...l.activities.filter((a) => BAJAK_CODES.includes(a.code)).map((a) => a.realisasiDate),
        ...BAJAK_DETAILS_REAL.map((k) => details[k]),
      ];
      const rBjk = getEarliestDate(bjkRencDates) || parseDateToIso(l.rencBajak);
      const aBjk = getEarliestDate(bjkRealDates) || parseDateToIso(l.realBajak);
      if (rBjk && rBjk.startsWith(yearPrefix)) {
        if (!dailyBajakMap[rBjk]) dailyBajakMap[rBjk] = { rencana: 0, realisasi: 0 };
        dailyBajakMap[rBjk].rencana += luas;
        const w = getWeekNumber(rBjk);
        if (!weeklyBajakMap[w]) weeklyBajakMap[w] = { rencana: 0, realisasi: 0 };
        weeklyBajakMap[w].rencana += luas;
      }
      if (aBjk && aBjk.startsWith(yearPrefix)) {
        if (!dailyBajakMap[aBjk]) dailyBajakMap[aBjk] = { rencana: 0, realisasi: 0 };
        dailyBajakMap[aBjk].realisasi += luas;
        const w = getWeekNumber(aBjk);
        if (!weeklyBajakMap[w]) weeklyBajakMap[w] = { rencana: 0, realisasi: 0 };
        weeklyBajakMap[w].realisasi += luas;
      }

      // Siap Tanam (murni Jalan & Saluran: Kolom AS untuk Rencana, Kolom CY untuk Realisasi)
      const jsAct = l.activities.find((a) => a.code === '22.JALAN_SAL');
      const rSn = parseDateToIso(jsAct?.rencanaDate);
      const aSn = parseDateToIso(jsAct?.realisasiDate);
      if (rSn && rSn.startsWith(yearPrefix)) {
        if (!dailySiapTanamMap[rSn]) dailySiapTanamMap[rSn] = { rencana: 0, realisasi: 0 };
        dailySiapTanamMap[rSn].rencana += luas;
        const w = getWeekNumber(rSn);
        if (!weeklySiapTanamMap[w]) weeklySiapTanamMap[w] = { rencana: 0, realisasi: 0 };
        weeklySiapTanamMap[w].rencana += luas;
      }
      if (aSn && aSn.startsWith(yearPrefix)) {
        if (!dailySiapTanamMap[aSn]) dailySiapTanamMap[aSn] = { rencana: 0, realisasi: 0 };
        dailySiapTanamMap[aSn].realisasi += luas;
        const w = getWeekNumber(aSn);
        if (!weeklySiapTanamMap[w]) weeklySiapTanamMap[w] = { rencana: 0, realisasi: 0 };
        weeklySiapTanamMap[w].realisasi += luas;
      }
    }

    const mapToDailyList = (mapObj: Record<string, { rencana: number; realisasi: number }>) =>
      Object.entries(mapObj)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([isoDate, vals]) => {
          const renc = Math.round(vals.rencana * 100) / 100;
          const real = Math.round(vals.realisasi * 100) / 100;
          const dev = Math.round((real - renc) * 100) / 100;
          return {
            periodKey: formatDailyLabel(isoDate),
            rawDate: isoDate,
            monthKey: getMonthKey(isoDate),
            rencana: renc,
            realisasi: real,
            deviasi: dev,
          };
        });

    const mapToWeeklyList = (mapObj: Record<string, { rencana: number; realisasi: number }>) =>
      Object.entries(mapObj)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([weekKey, vals]) => {
          const renc = Math.round(vals.rencana * 100) / 100;
          const real = Math.round(vals.realisasi * 100) / 100;
          const dev = Math.round((real - renc) * 100) / 100;
          return {
            periodKey: weekKey,
            rawWeek: weekKey,
            rencana: renc,
            realisasi: real,
            deviasi: dev,
          };
        });

    const dailyBongkar = mapToDailyList(dailyBongkarMap);
    const weeklyBongkar = mapToWeeklyList(weeklyBongkarMap);

    const dailyBajak = mapToDailyList(dailyBajakMap);
    const weeklyBajak = mapToWeeklyList(weeklyBajakMap);

    const dailySiapTanam = mapToDailyList(dailySiapTanamMap);
    const weeklySiapTanam = mapToWeeklyList(weeklySiapTanamMap);

    // 6. Seed Summaries
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
        dailyBongkar,
        weeklyBongkar,
        dailyBajak,
        weeklyBajak,
        dailySiapTanam,
        weeklySiapTanam,
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
