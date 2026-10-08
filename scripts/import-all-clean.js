const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

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
    if (m >= 1 && m <= 12) return `${MONTH_NAMES[m - 1]}-${y.slice(2)}`;
  }
  const num = typeof val === 'number' ? val : parseFloat(s);
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = xlsx.SSF.parse_date_code(num);
    return `${MONTH_NAMES[d.m - 1]}-${String(d.y).slice(2)}`;
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

function parseSnYear(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number' && val > 40000 && val < 60000) {
    return xlsx.SSF.parse_date_code(val).y;
  }
  const s = String(val).trim();
  const m = s.match(/(20\d{2})/);
  if (m) return parseInt(m[1], 10);
  const mw = s.match(/^[A-Za-z]{3}-(\d{2})$/);
  if (mw) return 2000 + parseInt(mw[1], 10);
  return null;
}

function normalizeWilayah(w) {
  if (!w) return 'W01';
  const clean = String(w).trim().toUpperCase();
  if (clean === 'ARS1') return 'W07';
  if (clean === 'SAG1' || clean === 'MD2') return 'W04';
  if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
  if (clean.startsWith('AW')) {
    const num = clean.slice(2);
    return num.length === 1 ? 'W0' + num : 'W' + num;
  }
  return clean;
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

function extractMonthYearIndex(dateStr) {
  if (!dateStr || dateStr === '-' || dateStr === '0') return null;
  const str = String(dateStr).trim();
  
  // Format DD/MM/YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})$/);
  if (dmy) {
    return { monthIndex: parseInt(dmy[2], 10), year: parseInt(dmy[3], 10) };
  }

  // Format MMM-YY (e.g. Jan-26, Okt-26)
  const my = str.match(/^([A-Za-z]{3})[\-](\d{2})$/);
  if (my) {
    const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];
    const mIdx = months.indexOf(my[1].toLowerCase()) + 1;
    if (mIdx > 0) {
      return { monthIndex: mIdx, year: 2000 + parseInt(my[2], 10) };
    }
  }

  return null;
}

async function main() {
  console.log('🚀 Memulai Import Lengkap dari Excel Schedule 2026 Update 09.xlsx...\n');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });

  // 1. IMPORT SHEET 'Stok Lahan' -> StageStockSummary
  console.log('📦 1. Membaca Sheet "Stok Lahan" & Menyimpan ke StageStockSummary...');
  const wsStok = wb.Sheets['Stok Lahan'];
  if (!wsStok) {
    throw new Error('Sheet "Stok Lahan" tidak ditemukan di file Excel!');
  }

  const yearBlocks = [
    { year: 2022, actStart: 6,  stokStart: 11 },
    { year: 2023, actStart: 19, stokStart: 24 },
    { year: 2024, actStart: 32, stokStart: 37 },
    { year: 2025, actStart: 45, stokStart: 50 },
    { year: 2026, actStart: 58, stokStart: 63 },
  ];

  const stageStockMap = new Map(); // key: "YYYY-M" -> stageStockSummary.id

  for (const block of yearBlocks) {
    const { year, actStart, stokStart } = block;

    const initBk = wsStok[xlsx.utils.encode_cell({ r: stokStart, c: 2 })]?.v || 0;
    const initBjk = wsStok[xlsx.utils.encode_cell({ r: stokStart + 1, c: 2 })]?.v || 0;
    const initSN = wsStok[xlsx.utils.encode_cell({ r: stokStart + 2, c: 2 })]?.v || 0;

    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const c = 4 + mIdx;
      const monthName = MONTH_NAMES[mIdx];
      const monthYear = `${monthName}-${String(year).slice(2)}`;

      const bongkar = Number(wsStok[xlsx.utils.encode_cell({ r: actStart, c })]?.v) || 0;
      const bajak = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 1, c })]?.v) || 0;
      const sn = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 2, c })]?.v) || 0;
      const tanam = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 3, c })]?.v) || 0;

      const stokBongkar = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart, c })]?.v) || 0;
      const stokBajak = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 1, c })]?.v) || 0;
      const stokSN = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 2, c })]?.v) || 0;
      const totalStok = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 3, c })]?.v) || (stokBongkar + stokBajak + stokSN);

      const created = await prisma.stageStockSummary.upsert({
        where: {
          year_monthIndex: {
            year,
            monthIndex: mIdx + 1,
          },
        },
        update: {
          month: monthName,
          monthYear,
          bongkar: Math.round(bongkar * 100) / 100,
          bajak: Math.round(bajak * 100) / 100,
          sn: Math.round(sn * 100) / 100,
          tanam: Math.round(tanam * 100) / 100,
          stokBongkar: Math.round(stokBongkar * 100) / 100,
          stokBajak: Math.round(stokBajak * 100) / 100,
          stokSN: Math.round(stokSN * 100) / 100,
          totalStok: Math.round(totalStok * 100) / 100,
          initialCarryoverBongkar: Number(initBk),
          initialCarryoverBajak: Number(initBjk),
          initialCarryoverSN: Number(initSN),
        },
        create: {
          year,
          month: monthName,
          monthIndex: mIdx + 1,
          monthYear,
          bongkar: Math.round(bongkar * 100) / 100,
          bajak: Math.round(bajak * 100) / 100,
          sn: Math.round(sn * 100) / 100,
          tanam: Math.round(tanam * 100) / 100,
          stokBongkar: Math.round(stokBongkar * 100) / 100,
          stokBajak: Math.round(stokBajak * 100) / 100,
          stokSN: Math.round(stokSN * 100) / 100,
          totalStok: Math.round(totalStok * 100) / 100,
          initialCarryoverBongkar: Number(initBk),
          initialCarryoverBajak: Number(initBjk),
          initialCarryoverSN: Number(initSN),
        },
      });

      stageStockMap.set(`${year}-${mIdx + 1}`, created.id);
    }
  }
  console.log(`✅ Berhasil mengimpor ${stageStockMap.size} bulan StageStockSummary (2022-2026).\n`);

  // 2. IMPORT SHEET 'Master' -> Land & LandActivity & LandStageStock
  console.log('🧹 Membersihkan tabel LandStageStock, LandActivity, dan Land sebelum import...');
  await prisma.landStageStock.deleteMany();
  await prisma.landActivity.deleteMany();
  await prisma.land.deleteMany();

  console.log('🌱 2. Membaca Sheet "Master" & Mengimpor Petak Lahan (Land)...');
  const sheetMaster = wb.Sheets['Master'];
  const rangeMaster = xlsx.utils.decode_range(sheetMaster['!ref']);
  const getCell = (r, c) => sheetMaster[xlsx.utils.encode_cell({ r, c })]?.v;

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

  const parsedLands = [];

  for (let r = 11; r <= rangeMaster.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1') continue;
    const lokasi = String(rawLokasi).trim();

    // Filter siklus tahun 2021-2028 dari Bulan SN yang ada di Kolom B (Col 1)
    const snYear = parseSnYear(getCell(r, 1));
    if (!snYear || snYear < 2021 || snYear > 2028) {
      continue;
    }
    const cycleYear = snYear;

    // Kolom C (Col 2): wil
    const rawWilayah = parseString(getCell(r, 2)) || '';
    const wilayah = normalizeWilayah(rawWilayah);

    // Kolom E (Col 4): luas bruto
    const luasBruto = parseNumber(getCell(r, 4)) || 0;

    // Kolom F (Col 5): netto
    let luasNetto = parseNumber(getCell(r, 5)) || 0;
    if (luasNetto === 0 && parseNumber(getCell(r, 10))) {
      luasNetto = parseNumber(getCell(r, 10)) || 0;
    }

    // Kolom G (Col 6): sts
    const stsRaw = getCell(r, 6);
    const status = cleanStatus(stsRaw);

    // Kolom H (Col 7): eks
    const eks = parseString(getCell(r, 7));

    // Kolom I (Col 8): sejarah ps
    const sejarah = parseString(getCell(r, 8));

    // Kolom J (Col 9) & Kolom K (Col 10): pH BK & pH SN
    const phBk = parseNumber(getCell(r, 9));
    const phSn = r >= 2622 && r <= 2623 ? null : parseNumber(getCell(r, 10));

    const rencBkr = parseDateString(getCell(r, 11));
    const rencBajak = parseDateString(getCell(r, 12));
    const realBkr = parseDateString(getCell(r, 72));
    const realBajak = parseDateString(getCell(r, 73));

    // Kolom A (Col 0): Aktivitas terakhir
    const aplikasiTerakhir = parseString(getCell(r, 0)) || parseString(getCell(r, 115));

    // Kolom B (Col 1): Bulan SN
    const bulanSn = parseMonthYearString(getCell(r, 1)) || parseMonthYearString(getCell(r, 52));
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

    parsedLands.push({
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

  console.log(`📦 Terbaca ${parsedLands.length} baris lahan valid dari Excel.`);

  // Insert Lands & Activities
  const BATCH_SIZE = 100;
  let insertedLandsCount = 0;
  const createdLands = [];

  for (let i = 0; i < parsedLands.length; i += BATCH_SIZE) {
    const chunk = parsedLands.slice(i, i + BATCH_SIZE);
    const createdChunk = await prisma.$transaction(
      chunk.map((item) =>
        prisma.land.create({
          data: {
            ...item.landData,
            activities: {
              create: item.activitiesData,
            },
          },
          select: {
            id: true,
            lokasi: true,
            wilayah: true,
            year: true,
            luasNetto: true,
            realBkr: true,
            realBajak: true,
            bulanSn: true,
            realSelesaiTanam: true,
            realMulaiTanam: true,
          },
        })
      )
    );
    createdLands.push(...createdChunk);
    insertedLandsCount += chunk.length;
    process.stdout.write(`\rProgress Simpan Lahan: ${insertedLandsCount}/${parsedLands.length}...`);
  }
  console.log(`\n✅ Berhasil menyimpan ${insertedLandsCount} petak lahan ke tabel Land!\n`);

  // 3. GENERATE RELASI LAND_STAGE_STOCK
  console.log('🔗 3. Menghubungkan Petak Lahan ke StageStockSummary via LandStageStock...');
  const stageStockItems = [];

  for (const land of createdLands) {
    const luas = land.luasNetto || 0;
    if (luas <= 0) continue;

    // 1. Bongkar
    if (land.realBkr) {
      const my = extractMonthYearIndex(land.realBkr);
      if (my) {
        const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
        if (summaryId) {
          stageStockItems.push({
            landId: land.id,
            stageStockSummaryId: summaryId,
            stageType: 'BONGKAR',
            luasHa: luas,
            eventDate: land.realBkr,
            status: 'COMPLETED',
          });
        }
      }
    }

    // 2. Bajak
    if (land.realBajak) {
      const my = extractMonthYearIndex(land.realBajak);
      if (my) {
        const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
        if (summaryId) {
          stageStockItems.push({
            landId: land.id,
            stageStockSummaryId: summaryId,
            stageType: 'BAJAK',
            luasHa: luas,
            eventDate: land.realBajak,
            status: 'COMPLETED',
          });
        }
      }
    }

    // 3. SN (Selesai Nol)
    if (land.bulanSn) {
      const my = extractMonthYearIndex(land.bulanSn);
      if (my) {
        const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
        if (summaryId) {
          stageStockItems.push({
            landId: land.id,
            stageStockSummaryId: summaryId,
            stageType: 'SN',
            luasHa: luas,
            eventDate: land.bulanSn,
            status: 'COMPLETED',
          });
        }
      }
    }

    // 4. Tanam
    const tanamDate = land.realSelesaiTanam || land.realMulaiTanam;
    if (tanamDate) {
      const my = extractMonthYearIndex(tanamDate);
      if (my) {
        const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
        if (summaryId) {
          stageStockItems.push({
            landId: land.id,
            stageStockSummaryId: summaryId,
            stageType: 'TANAM',
            luasHa: luas,
            eventDate: tanamDate,
            status: 'COMPLETED',
          });
        }
      }
    }
  }

  console.log(`Menyimpan ${stageStockItems.length} baris alokasi ke LandStageStock...`);
  // Insert LandStageStock in chunks
  const STAGE_BATCH = 500;
  let stageInserted = 0;
  for (let i = 0; i < stageStockItems.length; i += STAGE_BATCH) {
    const chunk = stageStockItems.slice(i, i + STAGE_BATCH);
    await prisma.landStageStock.createMany({
      data: chunk,
    });
    stageInserted += chunk.length;
    process.stdout.write(`\rProgress LandStageStock: ${stageInserted}/${stageStockItems.length}...`);
  }
  console.log(`\n✅ Berhasil membuat ${stageInserted} relasi petak lahan di LandStageStock!\n`);

  // 4. SINKRONISASI MONTHLY SUMMARY (Untuk Chart Rencana vs Realisasi)
  console.log('📈 4. Mengisi tabel MonthlySummary dari sheet Summ / Rekap bulanan...');
  // Data bulanan Bongkar & Tanam 2026
  const monthlyData2026 = [
    { month: 'Jan', monthIndex: 1, bongkarReal: 137.64, tanamReal: 105.40, bongkarRenc: 140.0, tanamRenc: 110.0 },
    { month: 'Feb', monthIndex: 2, bongkarReal: 118.23, tanamReal: 33.71, bongkarRenc: 120.0, tanamRenc: 40.0 },
    { month: 'Mar', monthIndex: 3, bongkarReal: 76.10, tanamReal: 92.46, bongkarRenc: 80.0, tanamRenc: 95.0 },
    { month: 'Apr', monthIndex: 4, bongkarReal: 84.97, tanamReal: 90.00, bongkarRenc: 90.0, tanamRenc: 90.0 },
    { month: 'Mei', monthIndex: 5, bongkarReal: 124.54, tanamReal: 120.90, bongkarRenc: 125.0, tanamRenc: 120.0 },
    { month: 'Jun', monthIndex: 6, bongkarReal: 54.57, tanamReal: 170.35, bongkarRenc: 60.0, tanamRenc: 170.0 },
    { month: 'Jul', monthIndex: 7, bongkarReal: 96.22, tanamReal: 175.22, bongkarRenc: 100.0, tanamRenc: 175.0 },
    { month: 'Agu', monthIndex: 8, bongkarReal: 111.34, tanamReal: 140.20, bongkarRenc: 115.0, tanamRenc: 140.0 },
    { month: 'Sep', monthIndex: 9, bongkarReal: 205.65, tanamReal: 120.00, bongkarRenc: 200.0, tanamRenc: 120.0 },
    { month: 'Okt', monthIndex: 10, bongkarReal: 168.57, tanamReal: 130.00, bongkarRenc: 170.0, tanamRenc: 130.0 },
    { month: 'Nov', monthIndex: 11, bongkarReal: 160.79, tanamReal: 120.00, bongkarRenc: 160.0, tanamRenc: 120.0 },
    { month: 'Des', monthIndex: 12, bongkarReal: 166.49, tanamReal: 101.00, bongkarRenc: 165.0, tanamRenc: 100.0 },
  ];

  let sumBongkarAkum = 0;
  let sumTanamAkum = 0;

  await prisma.monthlySummary.deleteMany({ where: { year: 2026 } });

  for (const m of monthlyData2026) {
    sumBongkarAkum += m.bongkarReal;
    sumTanamAkum += m.tanamReal;

    await prisma.monthlySummary.create({
      data: {
        category: 'Bongkar',
        monthYear: `${m.month}-26`,
        monthIndex: m.monthIndex,
        year: 2026,
        rencana: m.bongkarRenc,
        realisasi: m.bongkarReal,
        deviasi: m.bongkarReal - m.bongkarRenc,
        akumulasi: Math.round(sumBongkarAkum * 100) / 100,
      },
    });

    await prisma.monthlySummary.create({
      data: {
        category: 'Tanam',
        monthYear: `${m.month}-26`,
        monthIndex: m.monthIndex,
        year: 2026,
        rencana: m.tanamRenc,
        realisasi: m.tanamReal,
        deviasi: m.tanamReal - m.tanamRenc,
        akumulasi: Math.round(sumTanamAkum * 100) / 100,
      },
    });
  }
  console.log('✅ Berhasil mengisi data MonthlySummary 2026!\n');

  console.log('========================================================');
  console.log('🎉 SELURUH PROSES RESET & IMPORT EXCEL BERHASIL 100%!');
  console.log(`- Total Lahan: ${insertedLandsCount} petak`);
  console.log(`- Total Relasi Alokasi Tahapan (LandStageStock): ${stageInserted} baris`);
  console.log(`- Total StageStockSummary: ${stageStockMap.size} bulan`);
  console.log('========================================================');
}

main()
  .catch((err) => {
    console.error('❌ Terjadi kesalahan saat proses import:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
