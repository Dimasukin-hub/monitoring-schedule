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
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A') return null;
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

async function main() {
  console.log('🚀 Starting Monitor Schedule ETL & Seed...');
  const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
  const workbook = xlsx.readFile(filePath, { cellDates: false });

  // 1. CLEAR EXISTING DATA
  console.log('🧹 Clearing existing tables...');
  await prisma.landActivity.deleteMany();
  await prisma.land.deleteMany();
  await prisma.monthlySummary.deleteMany();
  await prisma.seedSummary.deleteMany();

  // 2. PARSE DATA SHEET
  console.log('📊 Parsing Data sheet...');
  const dataSheet = workbook.Sheets['Data'];
  const rawData = xlsx.utils.sheet_to_json(dataSheet, { header: 1, defval: '' });

  // Activities config
  const activitiesConfig = [
    { code: '01.CHOPPER', name: 'Chopper', rencCol: 16, realCol: 71, order: 1 },
    { code: '02.CHOPPER_LU', name: 'Chopper Lu', rencCol: 17, realCol: 72, order: 2 },
    { code: '03.RH1', name: 'RH1', rencCol: 18, realCol: 73, order: 3 },
    { code: '04.CUTTING_BANANA', name: 'Cutting Banana', rencCol: 19, realCol: 74, order: 4 },
    { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', rencCol: 20, realCol: 75, order: 5 },
    { code: '06.DP1', name: 'DP1', rencCol: 21, realCol: 76, order: 6 },
    { code: '07.DP_CROSS', name: 'DP Cross', rencCol: 22, realCol: 77, order: 7 },
    { code: '08.DP2', name: 'DP2', rencCol: 23, realCol: 78, order: 8 },
    { code: '09.BELERANG', name: 'Belerang', rencCol: 24, realCol: 79, order: 9 },
    { code: '10.KOMPOS', name: 'Kompos', rencCol: 25, realCol: 80, order: 10 },
    { code: '11.BAJAK_AWAL', name: 'Bajak Awal', rencCol: 28, realCol: 81, order: 11 },
    { code: '17.SUBSOILER', name: 'Subsoiler', rencCol: 41, realCol: 94, order: 12 },
    { code: '18.FINISHING_HARROW', name: 'Finishing Harrow', rencCol: 43, realCol: 95, order: 13 },
    { code: '19.FINISHING_ROTARY', name: 'Finishing Rotary', rencCol: 44, realCol: 96, order: 14 },
    { code: '20.ROTARY_FH2', name: 'Rotary FH2', rencCol: 45, realCol: 97, order: 15 },
    { code: '21.RIDGER', name: 'Ridger', rencCol: 46, realCol: 98, order: 16 },
    { code: '22.JALAN_SAL', name: 'Jalan & Saluran', rencCol: 47, realCol: 99, order: 17 },
    { code: '22.SIAP_TANAM', name: 'Siap Tanam', rencCol: null, realCol: 100, order: 18 },
    { code: '23.PROSES_TNM', name: 'Proses Tanam', rencCol: 50, realCol: 101, order: 19 },
    { code: '24.SLS_TANAM', name: 'Selesai Tanam', rencCol: 51, realCol: 102, order: 20 },
  ];

  let landsCount = 0;
  let totalActivities = 0;

  for (let r = 5; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row) continue;

    // Excel 1-indexed Col 6 is index 5
    const lokasi = parseString(row[5]);
    if (!lokasi) continue;

    const wilayah = parseString(row[4]) || 'UNKNOWN';
    const luasBruto = parseNumber(row[6]) || 0;
    const luasNetto = parseNumber(row[7]) || 0;
    const status = cleanStatus(row[8]);
    const eks = parseString(row[9]);
    const sejarah = parseString(row[10]);
    const phBk = parseNumber(row[11]);
    const phSn = parseNumber(row[12]);
    const rencBkr = parseDateString(row[13]);
    const rencBajak = parseDateString(row[14]);
    const realBkr = parseDateString(row[68]);
    const realBajak = parseDateString(row[69]);
    const aplikasiTerakhir = parseString(row[1]);
    const bulanSn = parseMonthYearString(row[2] || row[3]);
    const statusAplikasi = parseString(row[48]);
    const rencMulaiTanam = parseDateString(row[49]);
    const rencSelesaiTanam = parseDateString(row[50]);
    const hariWaktu = parseNumber(row[51]) ? Math.round(parseNumber(row[51])) : null;
    const bulanTanam = parseMonthYearString(row[103] || row[54]);
    const bulanPanen = parseMonthYearString(row[105] || row[104]);
    const jenisBibit = parseString(row[106]);
    const kelasBibit = parseString(row[107]);
    const realMulaiTanam = parseDateString(row[100]);
    const realSelesaiTanam = parseDateString(row[101]);
    const statusProduksi = parseString(row[118]);
    const stdPanen = parseMonthYearString(row[120]);
    const deviasiMonth = parseNumber(row[121]) ? Math.round(parseNumber(row[121])) : null;

    // Calculate progress tanam (if finished tanam -> 100%, else if proses -> 50%, else 0%)
    let progressTanam = 0;
    if (realSelesaiTanam || aplikasiTerakhir?.includes('Sls Tanam') || statusAplikasi?.includes('Sls Tanam')) {
      progressTanam = 100;
    } else if (realMulaiTanam || statusAplikasi?.includes('Proses Tnm') || aplikasiTerakhir?.includes('Proses')) {
      progressTanam = 50;
    } else if (realBajak || realBkr) {
      progressTanam = 25;
    }

    // 22 Aplikasi columns (Excel indices 25 to 46)
    const aplikasiDetails = {
      rotaryPlough: parseDateString(row[25]),
      rencAwalMb5Btr: parseDateString(row[26]),
      bajakAwalMb5Btr: parseDateString(row[27]),
      bajakAwalMb25: parseDateString(row[28]),
      bajakAwalMph: parseDateString(row[29]),
      bajakAwalNardi: parseDateString(row[30]),
      hrEksMb: parseDateString(row[31]),
      rgKons: parseDateString(row[32]),
      tnmKons: parseDateString(row[33]),
      umurKons: parseDateString(row[34]),
      chopperEksKons: parseDateString(row[35]),
      bajakAkhirMb5Btr: parseDateString(row[36]),
      bajakAkhirMb25Ahir: parseDateString(row[37]),
      bajakAkhirHowardAhir: parseDateString(row[38]),
      bajakAkhirCelliAhir: parseDateString(row[39]),
      subsoilerSs1: parseDateString(row[40]),
      subsoilerSs2: parseDateString(row[41]),
      finishingFhkRent: parseDateString(row[42]),
      finishingRotaryFh1: parseDateString(row[43]),
      finishingRotaryFh2: parseDateString(row[44]),
      ridger: parseDateString(row[45]),
      jalanSal: parseDateString(row[46]),

      // 29 Realisasi Aplikasi columns (Excel indices 70 to 98)
      realChopper: parseDateString(row[70]),
      realChopperLu: parseDateString(row[71]),
      realRh1: parseDateString(row[72]),
      realCuttingBanana: parseDateString(row[73]),
      realDolomit: parseDateString(row[74]),
      realDp1: parseDateString(row[75]),
      realDpCross: parseDateString(row[76]),
      realDp2: parseDateString(row[77]),
      realBelerang: parseDateString(row[78]),
      realKompos: parseDateString(row[79]),
      realBajakAwalMb5Btr: parseDateString(row[80]),
      realBajakAwalMb25: parseDateString(row[81]),
      realBajakAwalHoward: parseDateString(row[82]),
      realBajakAwalNardi: parseDateString(row[83]),
      realHrEksMb: parseDateString(row[84]),
      realExcaStdAwal: parseDateString(row[85]),
      realExcaStdAkhir: parseDateString(row[86]),
      realTutupParit: parseDateString(row[87]),
      realGypsum: parseDateString(row[88]),
      realKompos2: parseDateString(row[89]),
      realFreeLand: parseDateString(row[90]),
      realBedder: parseDateString(row[91]),
      realFhHarrow: parseDateString(row[92]),
      realSubsoilerSs1: parseDateString(row[93]),
      realFinishingFhkRent: parseDateString(row[94]),
      realFinishingRotaryFh1: parseDateString(row[95]),
      realRotaryFh2: parseDateString(row[96]),
      realRidger: parseDateString(row[97]),
      realJalanSal: parseDateString(row[98]),
      realisasiAplikasi: {
        realChopper: parseDateString(row[70]),
        realChopperLu: parseDateString(row[71]),
        realRh1: parseDateString(row[72]),
        realCuttingBanana: parseDateString(row[73]),
        realDolomit: parseDateString(row[74]),
        realDp1: parseDateString(row[75]),
        realDpCross: parseDateString(row[76]),
        realDp2: parseDateString(row[77]),
        realBelerang: parseDateString(row[78]),
        realKompos: parseDateString(row[79]),
        realBajakAwalMb5Btr: parseDateString(row[80]),
        realBajakAwalMb25: parseDateString(row[81]),
        realBajakAwalHoward: parseDateString(row[82]),
        realBajakAwalNardi: parseDateString(row[83]),
        realHrEksMb: parseDateString(row[84]),
        realExcaStdAwal: parseDateString(row[85]),
        realExcaStdAkhir: parseDateString(row[86]),
        realTutupParit: parseDateString(row[87]),
        realGypsum: parseDateString(row[88]),
        realKompos2: parseDateString(row[89]),
        realFreeLand: parseDateString(row[90]),
        realBedder: parseDateString(row[91]),
        realFhHarrow: parseDateString(row[92]),
        realSubsoilerSs1: parseDateString(row[93]),
        realFinishingFhkRent: parseDateString(row[94]),
        realFinishingRotaryFh1: parseDateString(row[95]),
        realRotaryFh2: parseDateString(row[96]),
        realRidger: parseDateString(row[97]),
        realJalanSal: parseDateString(row[98]),
      },
    };

    const land = await prisma.land.upsert({
      where: { lokasi },
      update: {
        wilayah,
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
      create: {
        lokasi,
        wilayah,
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
    });

    landsCount++;

    // Insert activities
    const activitiesToCreate = [];
    for (const act of activitiesConfig) {
      const rencRaw = act.rencCol ? row[act.rencCol - 1] : null;
      const realRaw = act.realCol ? row[act.realCol - 1] : null;

      const rencVal = parseDateString(rencRaw);
      const realVal = parseDateString(realRaw);

      let actStatus = 'PENDING';
      if (realVal && realVal !== '-' && realVal !== '0') {
        actStatus = 'COMPLETED';
      } else if (rencVal && rencVal !== '-' && rencVal !== '0') {
        actStatus = 'IN_PROGRESS';
      }

      activitiesToCreate.push({
        landId: land.id,
        stepOrder: act.order,
        code: act.code,
        name: act.name,
        rencanaDate: rencVal,
        realisasiDate: realVal,
        status: actStatus,
      });
    }

    if (activitiesToCreate.length > 0) {
      await prisma.landActivity.createMany({
        data: activitiesToCreate,
      });
      totalActivities += activitiesToCreate.length;
    }
  }

  console.log(`✅ Lands imported: ${landsCount}`);
  console.log(`✅ Land activities imported: ${totalActivities}`);

  // 3. PARSE SUMM SHEET (Monthly Target vs Realization: Bongkar & Tanam)
  console.log('📈 Parsing Summ sheet for Bongkar, Bajak, Siap Tanam & Tanam...');
  const summSheet = workbook.Sheets['Summ'];
  if (summSheet) {
    const rawSumm = xlsx.utils.sheet_to_json(summSheet, { header: 1, defval: '' });
    const summaries = [];

    // Parse Bongkar (offset 0), Bajak (offset 23), and Siap Tanam (offset 46)
    const stages = [
      { name: 'Bongkar', offset: 0 },
      { name: 'Bajak', offset: 23 },
      { name: 'Siap Tanam', offset: 46 },
    ];

    for (const stage of stages) {
      // 2025: cols 1..3 (Bongkar excluded for 2025: Okt-25, Nov-25, Des-25)
      if (stage.name !== 'Bongkar') {
        for (let c = stage.offset + 1; c <= stage.offset + 3; c++) {
          const rawHeader = rawSumm[2][c];
          const monthYear = parseMonthYearString(rawHeader);
          if (!monthYear) continue;

          summaries.push({
            category: stage.name,
            monthYear,
            monthIndex: c - stage.offset,
            year: 2025,
            rfc: parseNumber(rawSumm[3][c]),
            rencana: parseNumber(rawSumm[4][c]),
            realisasi: parseNumber(rawSumm[5][c]),
            deviasi: parseNumber(rawSumm[6][c]),
            akumulasi: parseNumber(rawSumm[7][c]),
          });
        }
      }

      // 2026: cols 5..16
      for (let c = stage.offset + 5; c <= stage.offset + 16; c++) {
        const rawHeader = rawSumm[2][c];
        const monthYear = parseMonthYearString(rawHeader);
        if (!monthYear) continue;

        summaries.push({
          category: stage.name,
          monthYear,
          monthIndex: c - stage.offset - 4,
          year: 2026,
          rfc: parseNumber(rawSumm[3][c]),
          rencana: parseNumber(rawSumm[4][c]),
          realisasi: parseNumber(rawSumm[5][c]),
          deviasi: parseNumber(rawSumm[6][c]),
          akumulasi: parseNumber(rawSumm[7][c]),
        });
      }

      // 2027: cols 19..21 (Bongkar excluded for 2027: Jan-27, Feb-27, Mar-27)
      if (stage.name !== 'Bongkar') {
        for (let c = stage.offset + 19; c <= stage.offset + 21; c++) {
          const rawHeader = rawSumm[2][c];
          const monthYear = parseMonthYearString(rawHeader);
          if (!monthYear) continue;

          summaries.push({
            category: stage.name,
            monthYear,
            monthIndex: c - stage.offset - 18,
            year: 2027,
            rfc: parseNumber(rawSumm[3][c]),
            rencana: parseNumber(rawSumm[4][c]),
            realisasi: parseNumber(rawSumm[5][c]),
            deviasi: parseNumber(rawSumm[6][c]),
            akumulasi: parseNumber(rawSumm[7][c]),
          });
        }
      }
    }

    // B. Parse Tanam (cols 73 to 84)
    const monthNames2026 = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];
    for (let c = 73; c <= 84; c++) {
      const mIdx = c - 73;
      const monthYear = monthNames2026[mIdx];
      const renc = parseNumber(rawSumm[4][c]);
      const real = parseNumber(rawSumm[7][c]);
      const rfc = parseNumber(rawSumm[3][c]);
      const dev = real !== null && renc !== null ? real - renc : null;

      summaries.push({
        category: 'Tanam',
        monthYear,
        monthIndex: mIdx + 1,
        year: 2026,
        rfc: rfc || 0,
        rencana: renc || 0,
        realisasi: real,
        deviasi: dev,
        akumulasi: null,
      });
    }

    if (summaries.length > 0) {
      await prisma.monthlySummary.createMany({ data: summaries });
      console.log(`✅ Monthly summaries (Bongkar + Bajak + Siap Tanam + Tanam) imported: ${summaries.length}`);
    }
  }

  // 4. PARSE SEED SUMMARY (From Potensi Tanam)
  console.log('🌱 Parsing Potensi Tanam sheet for Seed summaries...');
  const potSheet = workbook.Sheets['Potensi Tanam'];
  if (potSheet) {
    const rawPot = xlsx.utils.sheet_to_json(potSheet, { header: 1, defval: '' });
    const seedSummaries = [];

    // Rows 3..7 have Crown/Sucker by Class
    for (let r = 3; r <= 7; r++) {
      const row = rawPot[r];
      if (!row) continue;
      const type = parseString(row[5]); // Crown / Sucker
      const kelas = parseString(row[6]); // Extra Kecil, Kecil, Sedang, Besar
      const kebutuhan = parseNumber(row[13]); // Total kebutuhan
      const potensi = parseNumber(row[14]); // Pot. Bibit
      const dev = parseNumber(row[15]); // Dev

      if (type && kelas) {
        seedSummaries.push({
          period: '2026',
          bibitType: type,
          kelas,
          kebutuhan: kebutuhan || 0,
          potensi: potensi || 0,
          realisasi: (potensi && dev) ? (potensi - dev) : (potensi || 0),
          deviasi: dev || 0,
        });
      }
    }

    if (seedSummaries.length > 0) {
      await prisma.seedSummary.createMany({ data: seedSummaries });
      console.log(`✅ Seed summaries imported: ${seedSummaries.length}`);
    }
  }

  console.log('🎉 ETL & Database Seed successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
