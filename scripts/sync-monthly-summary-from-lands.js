const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

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

function parseDateToIso(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const s = dateStr.trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const ymd = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  return null;
}

function getEarliestDate(dates) {
  const isos = dates.map(parseDateToIso).filter(Boolean);
  if (isos.length === 0) return null;
  isos.sort();
  return isos[0];
}

async function sync() {
  console.log('🔄 Memulai sinkronisasi tabel MonthlySummary 2026 dari Data Lahan Master...');

  const lands = await p.land.findMany({
    where: { year: 2026 },
    include: { activities: true },
  });
  console.log(`Menemukan ${lands.length} lokasi Data Lahan tahun 2026.`);

  const dailyBongkarMap = {};
  const dailyBajakMap = {};
  const dailySiapTanamMap = {};

  for (const l of lands) {
    const luas = Number(l.luasNetto) || 0;
    const details = (l.aplikasiDetails || {});

    // Bongkar (Chopper s/d Kompos)
    const bkrRencDates = l.activities.filter(a => BONGKAR_CODES.includes(a.code)).map(a => a.rencanaDate);
    const bkrRealDates = l.activities.filter(a => BONGKAR_CODES.includes(a.code)).map(a => a.realisasiDate);
    const rBkr = getEarliestDate(bkrRencDates) || parseDateToIso(l.rencBkr);
    const aBkr = getEarliestDate(bkrRealDates) || parseDateToIso(l.realBkr);
    if (rBkr && rBkr.startsWith('2026')) {
      if (!dailyBongkarMap[rBkr]) dailyBongkarMap[rBkr] = { renc: 0, real: 0 };
      dailyBongkarMap[rBkr].renc += luas;
    }
    if (aBkr && aBkr.startsWith('2026')) {
      if (!dailyBongkarMap[aBkr]) dailyBongkarMap[aBkr] = { renc: 0, real: 0 };
      dailyBongkarMap[aBkr].real += luas;
    }

    // Bajak (MB 5 BTR s/d Ridger)
    const bjkRencDates = [
      ...l.activities.filter(a => BAJAK_CODES.includes(a.code)).map(a => a.rencanaDate),
      ...BAJAK_DETAILS_RENC.map(k => details[k]),
    ];
    const bjkRealDates = [
      ...l.activities.filter(a => BAJAK_CODES.includes(a.code)).map(a => a.realisasiDate),
      ...BAJAK_DETAILS_REAL.map(k => details[k]),
    ];
    const rBjk = getEarliestDate(bjkRencDates) || parseDateToIso(l.rencBajak);
    const aBjk = getEarliestDate(bjkRealDates) || parseDateToIso(l.realBajak);
    if (rBjk && rBjk.startsWith('2026')) {
      if (!dailyBajakMap[rBjk]) dailyBajakMap[rBjk] = { renc: 0, real: 0 };
      dailyBajakMap[rBjk].renc += luas;
    }
    if (aBjk && aBjk.startsWith('2026')) {
      if (!dailyBajakMap[aBjk]) dailyBajakMap[aBjk] = { renc: 0, real: 0 };
      dailyBajakMap[aBjk].real += luas;
    }

    // Siap Tanam (Jalan & Sal)
    const jsAct = l.activities.find(a => a.code === '22.JALAN_SAL');
    const rSn = parseDateToIso(jsAct?.rencanaDate);
    const aSn = parseDateToIso(jsAct?.realisasiDate);
    if (rSn && rSn.startsWith('2026')) {
      if (!dailySiapTanamMap[rSn]) dailySiapTanamMap[rSn] = { renc: 0, real: 0 };
      dailySiapTanamMap[rSn].renc += luas;
    }
    if (aSn && aSn.startsWith('2026')) {
      if (!dailySiapTanamMap[aSn]) dailySiapTanamMap[aSn] = { renc: 0, real: 0 };
      dailySiapTanamMap[aSn].real += luas;
    }
  }

  function buildMonthly(map, category) {
    let accum = 0;
    return Array.from({ length: 12 }, (_, i) => {
      const mIndex = i + 1;
      const mStr = String(mIndex).padStart(2, '0');
      const pfx = `2026-${mStr}`;
      let r = 0, a = 0;
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
        monthYear: `${MONTH_NAMES_SHORT[i]}-26`,
        monthIndex: mIndex,
        year: 2026,
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

  // Hapus data lama MonthlySummary untuk Bongkar, Bajak, Siap Tanam 2026
  await p.monthlySummary.deleteMany({
    where: {
      category: { in: ['Bongkar', 'Bajak', 'Siap Tanam'] },
      year: 2026,
    },
  });

  const allRecords = [...bongkarMonthly, ...bajakMonthly, ...siapTanamMonthly];
  await p.monthlySummary.createMany({
    data: allRecords,
  });

  console.log(`✅ Berhasil menyimpan ${allRecords.length} record ke tabel MonthlySummary 2026!`);
  console.log('Bongkar 2026 Total Rencana:', bongkarMonthly.reduce((s, x) => s + x.rencana, 0).toFixed(2), 'Real:', bongkarMonthly.reduce((s, x) => s + x.realisasi, 0).toFixed(2));
  console.log('Bajak 2026 Total Rencana:', bajakMonthly.reduce((s, x) => s + x.rencana, 0).toFixed(2), 'Real:', bajakMonthly.reduce((s, x) => s + x.realisasi, 0).toFixed(2));
  console.log('Siap Tanam 2026 Total Rencana:', siapTanamMonthly.reduce((s, x) => s + x.rencana, 0).toFixed(2), 'Real:', siapTanamMonthly.reduce((s, x) => s + x.realisasi, 0).toFixed(2));
}

sync()
  .catch(console.error)
  .finally(() => p.$disconnect());
