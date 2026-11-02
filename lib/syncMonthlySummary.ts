import { prisma } from '@/lib/prisma';

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

function parseDateToIso(dateStr: any): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  return null;
}

function getEarliestDate(dates: any[]): string | null {
  const isos = dates.map(parseDateToIso).filter(Boolean) as string[];
  if (isos.length === 0) return null;
  isos.sort();
  return isos[0];
}

/**
 * Sinkronisasi tabel MonthlySummary (Bongkar, Bajak, Siap Tanam) untuk targetYear
 * agar grafik Rencana vs Realisasi di Executive Summary Pengolahan Lahan
 * langsung akurat mengikuti data lahan terbaru.
 */
export async function syncMonthlySummaryFromLands(targetYear: number = 2026) {
  const lands = await prisma.land.findMany({
    where: { year: targetYear },
    include: { activities: true },
  });

  const yearPrefix = String(targetYear);
  const dailyBongkarMap: Record<string, { renc: number; real: number }> = {};
  const dailyBajakMap: Record<string, { renc: number; real: number }> = {};
  const dailySiapTanamMap: Record<string, { renc: number; real: number }> = {};

  for (const l of lands) {
    const luas = Number(l.luasNetto) || 0;
    const details = (typeof l.aplikasiDetails === 'object' && l.aplikasiDetails !== null)
      ? (l.aplikasiDetails as Record<string, any>)
      : {};

    // 1. Bongkar (Chopper s/d Kompos)
    const bkrRencDates = l.activities.filter((a) => BONGKAR_CODES.includes(a.code)).map((a) => a.rencanaDate);
    const bkrRealDates = l.activities.filter((a) => BONGKAR_CODES.includes(a.code)).map((a) => a.realisasiDate);
    const rBkr = getEarliestDate(bkrRencDates) || parseDateToIso(l.rencBkr);
    const aBkr = getEarliestDate(bkrRealDates) || parseDateToIso(l.realBkr);
    if (rBkr && rBkr.startsWith(yearPrefix)) {
      if (!dailyBongkarMap[rBkr]) dailyBongkarMap[rBkr] = { renc: 0, real: 0 };
      dailyBongkarMap[rBkr].renc += luas;
    }
    if (aBkr && aBkr.startsWith(yearPrefix)) {
      if (!dailyBongkarMap[aBkr]) dailyBongkarMap[aBkr] = { renc: 0, real: 0 };
      dailyBongkarMap[aBkr].real += luas;
    }

    // 2. Bajak (MB 5 BTR s/d Ridger)
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
      if (!dailyBajakMap[rBjk]) dailyBajakMap[rBjk] = { renc: 0, real: 0 };
      dailyBajakMap[rBjk].renc += luas;
    }
    if (aBjk && aBjk.startsWith(yearPrefix)) {
      if (!dailyBajakMap[aBjk]) dailyBajakMap[aBjk] = { renc: 0, real: 0 };
      dailyBajakMap[aBjk].real += luas;
    }

    // 3. Siap Tanam (Jalan & Sal)
    const jsAct = l.activities.find((a) => a.code === '22.JALAN_SAL');
    const rSn = parseDateToIso(jsAct?.rencanaDate);
    const aSn = parseDateToIso(jsAct?.realisasiDate);
    if (rSn && rSn.startsWith(yearPrefix)) {
      if (!dailySiapTanamMap[rSn]) dailySiapTanamMap[rSn] = { renc: 0, real: 0 };
      dailySiapTanamMap[rSn].renc += luas;
    }
    if (aSn && aSn.startsWith(yearPrefix)) {
      if (!dailySiapTanamMap[aSn]) dailySiapTanamMap[aSn] = { renc: 0, real: 0 };
      dailySiapTanamMap[aSn].real += luas;
    }
  }

  function buildMonthly(map: Record<string, { renc: number; real: number }>, category: string) {
    let accum = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const mIndex = i + 1;
      const mStr = String(mIndex).padStart(2, '0');
      const pfx = `${targetYear}-${mStr}`;
      let r = 0;
      let a = 0;
      for (const [k, v] of Object.entries(map)) {
        if (k.startsWith(pfx)) {
          r += v.renc;
          a += v.real;
        }
      }
      const renc = Math.round(r * 100) / 100;
      const real = Math.round(a * 100) / 100;
      const dev = Math.round((real - renc) * 100) / 100;
      accum = Math.round((accum + real) * 100) / 100;

      return {
        category,
        monthYear: `${MONTH_NAMES_SHORT[i]}-${String(targetYear).slice(-2)}`,
        monthIndex: mIndex,
        year: targetYear,
        rfc: real,
        rencana: renc,
        realisasi: real,
        deviasi: dev,
        akumulasi: accum,
      };
    });
  }

  const bongkarMonthly = buildMonthly(dailyBongkarMap, 'Bongkar');
  const bajakMonthly = buildMonthly(dailyBajakMap, 'Bajak');
  const siapTanamMonthly = buildMonthly(dailySiapTanamMap, 'Siap Tanam');

  // Bersihkan data lama MonthlySummary untuk Bongkar, Bajak, Siap Tanam pada targetYear
  await prisma.monthlySummary.deleteMany({
    where: {
      category: { in: ['Bongkar', 'Bajak', 'Siap Tanam'] },
      year: targetYear,
    },
  });

  const allRecords = [...bongkarMonthly, ...bajakMonthly, ...siapTanamMonthly];
  await prisma.monthlySummary.createMany({
    data: allRecords,
  });

  return allRecords;
}
