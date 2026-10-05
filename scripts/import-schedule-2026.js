const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseNumber(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseString(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '#N/A' || s === '0') return null;
  return s;
}

function cleanStatus(val) {
  const s = parseString(val);
  if (!s) return null;
  const cleaned = s.replace(/\d+/g, '').trim();
  return cleaned || s;
}

function parseDateString(val) {
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A' || val === 0 || val === '0') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).trim());
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = xlsx.SSF.parse_date_code(num);
    const day = String(d.d).padStart(2, '0');
    const month = String(d.m).padStart(2, '0');
    return `${day}/${month}/${d.y}`;
  }
  const s = String(val).trim();
  return s === '' || s === '-' || s === '0' ? null : s;
}

function parseMonthYearString(val) {
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A' || val === 0 || val === '0') return null;
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) {
    const m = parseInt(mMatch[1], 10);
    const y = mMatch[2];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    if (m >= 1 && m <= 12) return `${months[m - 1]}-${y.slice(2)}`;
  }
  const num = typeof val === 'number' ? val : parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = xlsx.SSF.parse_date_code(num);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${months[d.m - 1]}-${String(d.y).slice(2)}`;
  }
  return s;
}

function parseYear(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') {
    if (val > 40000 && val < 60000) {
      return xlsx.SSF.parse_date_code(val).y;
    }
    const str = String(val);
    const m = str.match(/^(\d{1,2})(20\d{2})$/);
    if (m) return parseInt(m[2], 10);
    return null;
  }
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) return parseInt(mMatch[2], 10);
  const m = s.match(/(20\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseYearFromStatus(val) {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/(\d{2})/);
  if (m) {
    const yy = parseInt(m[1], 10);
    if (yy >= 15 && yy <= 35) return 2000 + yy;
  }
  return null;
}

function parseBibit(val) {
  if (!val) return { jenis: null, kelas: null };
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '0') return { jenis: null, kelas: null };

  const BIBIT_CODE_MAP = {
    NSGP3SS1: { jenis: 'Sucker', kelas: 'Sedang' },
    NSGP3SB1: { jenis: 'Sucker', kelas: 'Besar' },
    NSGP3SK1: { jenis: 'Sucker', kelas: 'Kecil' },
    NSGP3CK1: { jenis: 'Crown', kelas: 'Kecil' },
    NSGP3CB1: { jenis: 'Crown', kelas: 'Besar' },
    NSGP3CS1: { jenis: 'Crown', kelas: 'Sedang' },
    NSGP3NK1: { jenis: 'Crown', kelas: 'Kecil' },
    NSGP3TB1: { jenis: 'TC', kelas: 'Besar' },
    NSGP3NS1: { jenis: 'Nanas', kelas: 'Sedang' },
  };

  if (BIBIT_CODE_MAP[s]) {
    return BIBIT_CODE_MAP[s];
  }

  const match = s.match(/^([^\(]+)(?:\((.*?)\))?$/);
  if (match) {
    return {
      jenis: match[1].trim() || null,
      kelas: match[2] ? match[2].trim() : null,
    };
  }

  return { jenis: s, kelas: null };
}

async function main() {
  console.log('🚀 Memulai Import Data Lahan dari Schedule 2026 Update 09.xlsx (Halaman Master)...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const sheet = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(sheet['!ref']);

  console.log(`Rentang sheet Master: baris 0 s/d ${range.e.r}`);

  // 1. CLEAR EXISTING DATA LAHAN & ACTIVITIES
  console.log('🧹 Mengosongkan data lama di tabel Land & LandActivity...');
  await prisma.landActivity.deleteMany();
  await prisma.land.deleteMany();

  // Helper untuk membaca nilai cell
  const getCell = (r, c) => sheet[xlsx.utils.encode_cell({ r, c })]?.v;

  const activitiesConfig = [
    { code: '01.CHOPPER', name: 'Chopper', rencCol: 13, realCol: 74, order: 1 },
    { code: '02.CHOPPER_LU', name: 'Chopper Lu', rencCol: 14, realCol: 75, order: 2 },
    { code: '03.RH1', name: 'RH1', rencCol: 15, realCol: 76, order: 3 },
    { code: '04.CUTTING_BANANA', name: 'Cutting Banana', rencCol: 16, realCol: 77, order: 4 },
    { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', rencCol: 17, realCol: 78, order: 5 },
    { code: '06.DP1', name: 'DP1', rencCol: 18, realCol: 79, order: 6 },
    { code: '07.DP_CROSS', name: 'DP Cross', rencCol: 19, realCol: 80, order: 7 },
    { code: '08.DP2', name: 'DP2', rencCol: 20, realCol: 81, order: 8 },
    { code: '09.BELERANG', name: 'Belerang', rencCol: 21, realCol: 82, order: 9 },
    { code: '10.KOMPOS', name: 'Kompos', rencCol: 22, realCol: 83, order: 10 },
    { code: '11.BAJAK_AWAL', name: 'Bajak Awal', rencCol: 25, realCol: 86, order: 11 },
    { code: '17.SUBSOILER', name: 'Subsoiler', rencCol: 38, realCol: 97, order: 12 },
    { code: '18.FINISHING_HARROW', name: 'Finishing Harrow', rencCol: 40, realCol: 98, order: 13 },
    { code: '19.FINISHING_ROTARY', name: 'Finishing Rotary', rencCol: 41, realCol: 99, order: 14 },
    { code: '20.ROTARY_FH2', name: 'Rotary FH2', rencCol: 42, realCol: 100, order: 15 },
    { code: '21.RIDGER', name: 'Ridger', rencCol: 43, realCol: 101, order: 16 },
    { code: '22.JALAN_SAL', name: 'Jalan & Saluran', rencCol: 44, realCol: 102, order: 17 },
    { code: '22.SIAP_TANAM', name: 'Siap Tanam', rencCol: null, realCol: 103, order: 18 },
    { code: '23.PROSES_TNM', name: 'Proses Tanam', rencCol: 47, realCol: 104, order: 19 },
    { code: '24.SLS_TANAM', name: 'Selesai Tanam', rencCol: 48, realCol: 105, order: 20 },
  ];

  let parsedRecords = [];

  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1') continue;
    const lokasi = String(rawLokasi).trim();

    // Tentukan tahun siklus data untuk filter 2021-2028
    const bt = parseYear(getCell(r, 53));
    const slsReal = parseYear(getCell(105));
    const slsRenc = parseYear(getCell(48));
    const mliReal = parseYear(getCell(104));
    const mliRenc = parseYear(getCell(47));
    const bkrReal = parseYear(getCell(72));
    const bkrRenc = parseYear(getCell(11));
    const stsRaw = getCell(r, 6);
    const stsYear = parseYearFromStatus(stsRaw);
    const snYear = parseYear(getCell(1)) || parseYear(getCell(52));

    const cycleYear = bt || slsReal || slsRenc || mliReal || mliRenc || stsYear || bkrReal || bkrRenc || snYear;

    // Filter ketat hanya tahun 2021 sampai 2028
    if (!cycleYear || cycleYear < 2021 || cycleYear > 2028) {
      continue;
    }

    let rawWilayah = parseString(getCell(r, 2)) || '';
    rawWilayah = rawWilayah.toUpperCase().trim();
    const wilayah = rawWilayah;
    const luasBruto = parseNumber(getCell(r, 4)) || 0;
    const luasNetto = parseNumber(getCell(r, 5)) || 0;
    const status = cleanStatus(stsRaw);
    const eks = parseString(getCell(r, 7));
    const sejarah = parseString(getCell(r, 8));
    const phBk = parseNumber(getCell(r, 9));
    const phSn = parseNumber(getCell(r, 10));
    const rencBkr = parseDateString(getCell(r, 11));
    const rencBajak = parseDateString(getCell(r, 12));
    const realBkr = parseDateString(getCell(r, 72));
    const realBajak = parseDateString(getCell(r, 73));
    const aplikasiTerakhir = parseString(getCell(r, 0)) || parseString(getCell(r, 115));
    const bulanSn = parseMonthYearString(getCell(r, 52) || getCell(r, 1));
    const statusAplikasi = parseString(getCell(r, 48)) || parseString(getCell(r, 111));
    const rencMulaiTanam = parseDateString(getCell(r, 47));
    const rencSelesaiTanam = parseDateString(getCell(r, 48));
    const hariWaktu = parseNumber(getCell(r, 49)) ? Math.round(parseNumber(getCell(r, 49))) : null;
    let rawBulanTanam = parseMonthYearString(getCell(r, 53) || getCell(r, 125));
    if (rawBulanTanam && (rawBulanTanam.endsWith('-14') || rawBulanTanam.includes('2014') || rawBulanTanam.includes('1900'))) {
      rawBulanTanam = null;
    }
    const bulanTanam = rawBulanTanam;
    const bulanPanen = parseMonthYearString(getCell(r, 105) || getCell(r, 104));

    const bibitInfo = parseBibit(getCell(r, 51));
    const jenisBibit = bibitInfo.jenis;
    const kelasBibit = bibitInfo.kelas;

    const realMulaiTanam = parseDateString(getCell(r, 104));
    const realSelesaiTanam = parseDateString(getCell(r, 105));
    const statusProduksi = parseString(getCell(r, 111));
    const stdPanen = parseMonthYearString(getCell(r, 120));
    const deviasiMonth = parseNumber(getCell(r, 121)) ? Math.round(parseNumber(getCell(r, 121))) : null;

    let progressTanam = 0;
    const aplLower = (aplikasiTerakhir || '').toLowerCase();
    const stAplLower = (statusAplikasi || '').toLowerCase();
    if (realSelesaiTanam || aplLower.includes('sls tanam') || aplLower.includes('selesai tanam') || stAplLower.includes('sls tanam')) {
      progressTanam = 100;
    } else if (realMulaiTanam || aplLower.includes('proses tnm') || aplLower.includes('proses') || stAplLower.includes('proses')) {
      progressTanam = 50;
    } else if (realBajak || realBkr) {
      progressTanam = 25;
    }

    const aplikasiDetails = {
      // 22 Rencana Aplikasi
      rotaryPlough: parseDateString(getCell(r, 23)),
      rencAwalMb5Btr: parseDateString(getCell(r, 24)),
      bajakAwalMb5Btr: parseDateString(getCell(r, 25)),
      bajakAwalMb25: parseDateString(getCell(r, 26)),
      bajakAwalMph: parseDateString(getCell(r, 27)),
      bajakAwalNardi: parseDateString(getCell(r, 28)),
      hrEksMb: parseDateString(getCell(r, 29)),
      rgKons: parseDateString(getCell(r, 30)),
      tnmKons: parseDateString(getCell(r, 31)),
      tutupParit: parseDateString(getCell(r, 32)),
      gypsum: parseDateString(getCell(r, 33)),
      komFaba: parseDateString(getCell(r, 34)),
      freeLand: parseDateString(getCell(r, 35)),
      bedder: parseDateString(getCell(r, 36)),
      fhHarrow: parseDateString(getCell(r, 37)),
      subsoilerSs1: parseDateString(getCell(r, 38)),
      subsoilerSs2: parseDateString(getCell(r, 39)),
      finishingFhkRent: parseDateString(getCell(r, 40)),
      finishingRotaryFh1: parseDateString(getCell(r, 41)),
      finishingRotaryFh2: parseDateString(getCell(r, 42)),
      ridger: parseDateString(getCell(r, 43)),
      jalanSal: parseDateString(getCell(r, 44)),

      // 29 Realisasi Aplikasi
      realChopper: parseDateString(getCell(r, 74)),
      realChopperLu: parseDateString(getCell(r, 75)),
      realRh1: parseDateString(getCell(r, 76)),
      realCuttingBanana: parseDateString(getCell(r, 77)),
      realDolomit: parseDateString(getCell(r, 78)),
      realDp1: parseDateString(getCell(r, 79)),
      realDpCross: parseDateString(getCell(r, 80)),
      realDp2: parseDateString(getCell(r, 81)),
      realBelerang: parseDateString(getCell(r, 82)),
      realKompos: parseDateString(getCell(r, 83)),
      realBajakAwalMb5Btr: parseDateString(getCell(r, 84)),
      realBajakAwalMb25: parseDateString(getCell(r, 85)),
      realBajakAwalHoward: parseDateString(getCell(r, 86)),
      realBajakAwalNardi: parseDateString(getCell(r, 87)),
      realHrEksMb: parseDateString(getCell(r, 88)),
      realExcaStdAwal: parseDateString(getCell(r, 89)),
      realExcaStdAkhir: parseDateString(getCell(r, 90)),
      realTutupParit: parseDateString(getCell(r, 91)),
      realGypsum: parseDateString(getCell(r, 92)),
      realKompos2: parseDateString(getCell(r, 93)),
      realFreeLand: parseDateString(getCell(r, 94)),
      realBedder: parseDateString(getCell(r, 95)),
      realFhHarrow: parseDateString(getCell(r, 96)),
      realSubsoilerSs1: parseDateString(getCell(r, 97)),
      realFinishingFhkRent: parseDateString(getCell(r, 98)),
      realFinishingRotaryFh1: parseDateString(getCell(r, 99)),
      realRotaryFh2: parseDateString(getCell(r, 100)),
      realRidger: parseDateString(getCell(r, 101)),
      realJalanSal: parseDateString(getCell(r, 102)),
      realSiapTanam: parseDateString(getCell(r, 103)),
      realMulaiTanam: parseDateString(getCell(r, 104)),
      realSelesaiTanam: parseDateString(getCell(r, 105)),
    };

    // Buat data activities untuk relasi LandActivity
    const activitiesData = activitiesConfig.map((act) => {
      const renc = act.rencCol !== null ? parseDateString(getCell(r, act.rencCol)) : null;
      const real = act.realCol !== null ? parseDateString(getCell(r, act.realCol)) : null;
      let statusAct = 'PENDING';
      if (real) {
        statusAct = 'COMPLETED';
      } else if (renc) {
        statusAct = 'IN_PROGRESS';
      }

      return {
        stepOrder: act.order,
        code: act.code,
        name: act.name,
        rencanaDate: renc,
        realisasiDate: real,
        status: statusAct,
      };
    });

    parsedRecords.push({
      landData: {
        lokasi,
        wilayah,
        year: cycleYear,
        luasBruto,
        luasNetto,
        status,
        eks,
        sejarah,
        phBk,
        phSn,
        rencBkr,
        rencBajak,
        realBkr,
        realBajak,
        aplikasiTerakhir,
        bulanSn,
        statusAplikasi,
        rencMulaiTanam,
        rencSelesaiTanam,
        realMulaiTanam,
        realSelesaiTanam,
        hariWaktu,
        bulanTanam,
        bulanPanen,
        jenisBibit,
        kelasBibit,
        statusProduksi,
        stdPanen,
        deviasiMonth,
        progressTanam,
        aplikasiDetails,
      },
      activitiesData,
    });
  }

  console.log(`📦 Terfilter ${parsedRecords.length} baris lahan untuk tahun 2021 - 2028.`);

  // Insert ke database dalam batch chunks
  const BATCH_SIZE = 100;
  let insertedCount = 0;
  let insertedActivitiesCount = 0;

  for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
    const chunk = parsedRecords.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      chunk.map((rec) =>
        prisma.land.create({
          data: {
            ...rec.landData,
            activities: {
              create: rec.activitiesData,
            },
          },
        })
      )
    );
    insertedCount += chunk.length;
    insertedActivitiesCount += chunk.length * 20;
    process.stdout.write(`\rProgress: ${insertedCount}/${parsedRecords.length} lahan berhasil dimasukkan...`);
  }

  console.log(`\n✅ Berhasil mengimpor ${insertedCount} lahan dan ${insertedActivitiesCount} aktivitas ke database.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Terjadi kesalahan saat import:', err);
  process.exit(1);
});
