const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function parseExcelDate(val) {
  if (!val) return { str: null, date: null };
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const d = xlsx.SSF.parse_date_code(val);
    const day = String(d.d).padStart(2, '0');
    const month = String(d.m).padStart(2, '0');
    const year = d.y;
    const date = new Date(year, d.m - 1, d.d, 12, 0, 0);
    return { str: `${day}/${month}/${year}`, date, month: d.m, year: d.y };
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return { str: null, date: null };
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return { str: `${day}/${month}/${year}`, date: val, month: val.getMonth() + 1, year };
  }
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean || clean === '-' || clean === '0') return { str: null, date: null };
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return { str: clean, date: new Date(year, month - 1, day, 12, 0, 0), month, year };
      }
    }
    const parsed = new Date(clean);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return { str: `${day}/${month}/${year}`, date: parsed, month, year };
    }
  }
  return { str: null, date: null };
}

function parseNum(val) {
  if (val === null || val === undefined || val === '' || val === '-') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/,/g, '.').replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

async function main() {
  console.log('=== START FULL IMPORT OF PLANTING DETAILS ===');

  // Load metadata maps from Land and Planting
  const lands = await prisma.land.findMany({
    select: { lokasi: true, wilayah: true, luasNetto: true }
  });
  const landMap = new Map();
  lands.forEach(l => { if (l.lokasi) landMap.set(l.lokasi.trim().toUpperCase(), l); });

  const allRecords = [];

  // -------------------------------------------------------------
  // PART 1: Januari s/d Juni 2026 dari "5. Monitoring Tanam PG1 Jan-Des'26.xlsx" sheet LKH
  // -------------------------------------------------------------
  console.log('\n--- PART 1: Reading 5. Monitoring Tanam PG1 (Jan - Jun 2026) ---');
  const file1Path = path.join(__dirname, '../excel/5. Monitoring Tanam PG1 Jan-Des\'26.xlsx');
  const wb1 = xlsx.readFile(file1Path);
  const ws1 = wb1.Sheets['LKH'];
  if (!ws1) throw new Error('Sheet LKH not found in ' + file1Path);

  const lkhData = xlsx.utils.sheet_to_json(ws1, { header: 1 });
  console.log(`Total raw rows in LKH: ${lkhData.length}`);

  // Group LKH by (Tanggal, Lokasi, JenisBibit, Aktivitas)
  const lkhGrouped = new Map();
  let lkhParsedCount = 0;

  for (let r = 1; r < lkhData.length; r++) {
    const row = lkhData[r];
    if (!row || !row[3]) continue; // Col D is Lokasi

    const tglInfo = parseExcelDate(row[0]);
    if (!tglInfo.date || tglInfo.year !== 2026) continue;
    if (tglInfo.month < 1 || tglInfo.month > 6) continue; // Jan to Jun only

    const actRaw = String(row[6] || '').trim();
    const actLower = actRaw.toLowerCase();
    if (!actLower.includes('tanam')) continue; // LKH planting activities

    const lokasi = String(row[3]).trim().toUpperCase();
    if (!lokasi || lokasi === '-' || lokasi === '0') continue;

    const he = Number(row[7]) || 0; // Hasil Efektif (Ha)
    if (he <= 0) continue;

    const isCrown = actLower.includes('crown');
    const isSucker = actLower.includes('sucker');
    const jenisBibit = isCrown ? 'Crown' : (isSucker ? 'Sucker' : 'Unknown');

    let isBesar = actLower.includes('besar');
    let isSedang = actLower.includes('sedang');
    let isExtraKecil = actLower.includes('ekstra') || actLower.includes('extra');
    let isKecil = !isExtraKecil && actLower.includes('kecil');

    const wilayah = row[15] ? String(row[15]).trim() : (landMap.get(lokasi)?.wilayah || null);
    const key = `${tglInfo.str}|${lokasi}|${jenisBibit}`;

    if (!lkhGrouped.has(key)) {
      lkhGrouped.set(key, {
        lokasi,
        tanggal: tglInfo.str,
        tanggalDate: tglInfo.date,
        luasNetto: landMap.get(lokasi)?.luasNetto || null,
        aktivitas: 'Tanam Bibit',
        standar: 0,
        besar: 0,
        sedang: 0,
        kecil: 0,
        extraKecil: 0,
        total: 0,
        jenisBibit,
        wilayah,
        awalTanam: null,
        selesaiTanam: null,
        akumTanam: 0,
        persenTanam: 0,
        petikKe: null,
        sourceFile: '5. Monitoring Tanam PG1 Jan-Des\'26.xlsx',
        sourceSheet: 'LKH',
      });
    }

    const obj = lkhGrouped.get(key);
    if (isBesar) obj.besar += he;
    else if (isSedang) obj.sedang += he;
    else if (isExtraKecil) obj.extraKecil += he;
    else if (isKecil) obj.kecil += he;
    obj.total += he;
    lkhParsedCount++;
  }

  // Convert grouped LKH to records
  for (const item of lkhGrouped.values()) {
    item.besar = Number(item.besar.toFixed(2));
    item.sedang = Number(item.sedang.toFixed(2));
    item.kecil = Number(item.kecil.toFixed(2));
    item.extraKecil = Number(item.extraKecil.toFixed(2));
    item.total = Number(item.total.toFixed(2));
    allRecords.push(item);
  }

  console.log(`LKH Jan-Jun: ${lkhParsedCount} raw worker rows grouped into ${lkhGrouped.size} daily location transactions.`);

  // -------------------------------------------------------------
  // PART 2: Juli s/d Oktober 2026 dari "Monitor Siap Nanas Update.xlsx"
  // -------------------------------------------------------------
  console.log('\n--- PART 2: Reading Monitor Siap Nanas Update (Jul - Okt 2026) ---');
  const file2Path = path.join(__dirname, '../excel/Monitor Siap Nanas Update.xlsx');
  const wb2 = xlsx.readFile(file2Path, { cellDates: false });
  const sheetName2 = 'Input Real Tanam&Petik Nanas';
  const ws2 = wb2.Sheets[sheetName2];
  if (!ws2) throw new Error(`Sheet ${sheetName2} not found in ${file2Path}`);

  const updateData = xlsx.utils.sheet_to_json(ws2, { header: 1 });
  console.log(`Total rows in ${sheetName2}: ${updateData.length}`);

  let updateParsedCount = 0;
  // Row 0 to 6 are headers, data starts at index 7 (Excel Row 8)
  for (let i = 7; i < updateData.length; i++) {
    const row = updateData[i];
    if (!row || !row[1]) continue;
    
    // Col 0 = Tanggal, Col 1 = Lokasi, Col 2 = Luas Netto, Col 3 = Aktivitas
    const tglInfo = parseExcelDate(row[0]);
    const lokasi = String(row[1] || '').trim().toUpperCase();
    if (!lokasi || lokasi === 'LOKASI' || lokasi === '-' || lokasi === '0') continue;

    // Filter Juli s/d Oktober (Month >= 7)
    if (!tglInfo.date || tglInfo.year !== 2026 || tglInfo.month < 7) continue;

    const awalInfo = parseExcelDate(row[12]);
    const slsInfo = parseExcelDate(row[13]);

    const standar = parseNum(row[4]);
    const besar = parseNum(row[5]);
    const sedang = parseNum(row[6]);
    const kecil = parseNum(row[7]);
    const total = parseNum(row[8]);

    allRecords.push({
      lokasi,
      tanggal: tglInfo.str,
      tanggalDate: tglInfo.date,
      luasNetto: parseNum(row[2]) || landMap.get(lokasi)?.luasNetto || null,
      aktivitas: row[3] ? String(row[3]).trim() : 'Tanam Bibit',
      standar: Number(standar.toFixed(2)),
      besar: Number(besar.toFixed(2)),
      sedang: Number(sedang.toFixed(2)),
      kecil: Number(kecil.toFixed(2)),
      extraKecil: 0,
      total: Number((total || (standar + besar + sedang + kecil)).toFixed(2)),
      jenisBibit: row[10] ? String(row[10]).trim() : null,
      wilayah: row[11] ? String(row[11]).trim() : (landMap.get(lokasi)?.wilayah || null),
      awalTanam: awalInfo.str,
      selesaiTanam: slsInfo.str,
      akumTanam: parseNum(row[14]),
      persenTanam: parseNum(row[15]),
      petikKe: row[16] !== undefined && row[16] !== null ? String(row[16]).trim() : null,
      sourceFile: 'Monitor Siap Nanas Update.xlsx',
      sourceSheet: sheetName2,
    });
    updateParsedCount++;
  }

  console.log(`Monitor Siap Nanas Update Jul-Oct: ${updateParsedCount} transaction records parsed.`);
  console.log(`\nTOTAL COMBINED RECORDS TO INSERT: ${allRecords.length}`);

  // Distinct locations check
  const distinctLocs = new Set(allRecords.map(r => r.lokasi));
  console.log(`Covering ${distinctLocs.size} distinct locations across Jan - Oct 2026.`);

  // -------------------------------------------------------------
  // PART 3: Clear and Bulk Insert into PlantingDetail
  // -------------------------------------------------------------
  console.log('\n--- PART 3: Updating Database ---');
  await prisma.plantingDetail.deleteMany({});
  console.log('Cleared old PlantingDetail records.');

  // Insert in batches of 500
  const BATCH_SIZE = 500;
  for (let i = 0; i < allRecords.length; i += BATCH_SIZE) {
    const batch = allRecords.slice(i, i + BATCH_SIZE);
    await prisma.plantingDetail.createMany({ data: batch });
    console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allRecords.length / BATCH_SIZE)} (${batch.length} records)`);
  }

  const finalCount = await prisma.plantingDetail.count();
  console.log(`\nSUCCESS! PlantingDetail now has ${finalCount} complete transaction rows!`);

  // Verify sample locations
  console.log('\n--- VERIFICATION OF SAMPLE LOCATIONS ---');
  for (const sampleLoc of ['001C', '002A2', '001A', '002A1', '001B1']) {
    const count = await prisma.plantingDetail.count({ where: { lokasi: sampleLoc } });
    const samples = await prisma.plantingDetail.findMany({
      where: { lokasi: sampleLoc },
      take: 3,
      select: { tanggal: true, aktivitas: true, jenisBibit: true, total: true, sourceFile: true }
    });
    console.log(`Lokasi ${sampleLoc}: ${count} rows in DB. Samples:`, samples);
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
