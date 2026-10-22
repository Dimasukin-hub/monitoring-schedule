const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wb = xlsx.readFile('./excel/Monitor Schedule - 2026.xlsx');
  const rtnSheet = wb.Sheets['RTN'];
  const rows = xlsx.utils.sheet_to_json(rtnSheet, { header: 1 });

  const excelRows = [];
  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const lokasi = r[1] ? String(r[1]).trim() : '';
    if (!lokasi || lokasi === '-' || lokasi.toLowerCase() === 'total') continue;

    const luas = typeof r[2] === 'number' ? r[2] : parseFloat(r[2]) || 0;
    const jenisBibit = r[3] ? String(r[3]).trim() : null;
    const kelasBibit = r[4] ? String(r[4]).trim() : null;
    const realTanam = typeof r[5] === 'number' ? r[5] : parseFloat(r[5]) || 0;
    const sisa = typeof r[6] === 'number' ? r[6] : parseFloat(r[6]) || 0;
    const estSelesai = r[7] !== undefined && r[7] !== null ? String(r[7]).trim() : null;
    const progress = typeof r[8] === 'number' ? r[8] : parseFloat(r[8]) || 0;
    const awalTanam = r[9] !== undefined && r[9] !== null ? String(r[9]).trim() : null;
    const leadtime = typeof r[10] === 'number' ? r[10] : parseInt(r[10], 10) || null;

    excelRows.push({
      lokasi,
      luas,
      jenisBibit,
      kelasBibit,
      realTanam,
      sisa,
      estSelesai,
      progress,
      awalTanam,
      leadtime,
      rowIdx: i
    });
  }

  console.log('=== EXCEL RTN STATS ===');
  console.log('Total valid rows:', excelRows.length);
  let totLuas = 0, totReal = 0, totSisa = 0;
  let prosesRows = [], selesaiRows = [], belumRows = [];
  excelRows.forEach(r => {
    totLuas += r.luas;
    totReal += r.realTanam;
    totSisa += r.sisa;
    // Note: progress in Excel RTN: 1 means 100%, 0.8 means 80%, etc.
    const pct = r.progress <= 1 && r.progress > 0 ? r.progress * 100 : r.progress;
    if (pct >= 100 || (r.luas > 0 && r.realTanam >= r.luas - 0.05)) {
      selesaiRows.push(r);
    } else if (pct > 0 || r.realTanam > 0) {
      prosesRows.push(r);
    } else {
      belumRows.push(r);
    }
  });

  console.log('Total Luas:', totLuas.toFixed(2));
  console.log('Total Real Tanam:', totReal.toFixed(2));
  console.log('Total Sisa:', totSisa.toFixed(2));
  console.log('Count Selesai (Progress >= 100%):', selesaiRows.length);
  console.log('Count Proses (0 < Progress < 100%):', prosesRows.length);
  console.log('Count Belum (Progress = 0):', belumRows.length);
  console.log('Proses locations in Excel RTN (' + prosesRows.length + '):');
  prosesRows.forEach(r => {
    const pct = r.progress <= 1 && r.progress > 0 ? (r.progress * 100).toFixed(1) : r.progress;
    console.log(` - Lokasi: ${r.lokasi}, Luas: ${r.luas}, Real: ${r.realTanam}, Sisa: ${r.sisa}, Progress: ${pct}%, Awal: ${r.awalTanam}, Est: ${r.estSelesai}`);
  });

  const dbPlantings = await prisma.planting.findMany({ orderBy: { id: 'asc' } });
  console.log('\n=== DB PLANTING STATS ===');
  console.log('Total DB Planting rows:', dbPlantings.length);
  let dbLuas = 0, dbReal = 0, dbSisa = 0;
  let dbProses = [], dbSelesai = [], dbBelum = [];
  dbPlantings.forEach(p => {
    dbLuas += (p.luas || 0);
    dbReal += (p.realTanam || 0);
    dbSisa += (p.sisa || 0);
    if (p.status === 'SELESAI' || (p.progress && p.progress >= 100)) {
      dbSelesai.push(p);
    } else if (p.status === 'PROSES' || (p.progress && p.progress > 0 && p.progress < 100) || ((p.sisa || 0) > 0 && (p.realTanam || 0) > 0)) {
      dbProses.push(p);
    } else {
      dbBelum.push(p);
    }
  });
  console.log('DB Total Luas:', dbLuas.toFixed(2));
  console.log('DB Total Real Tanam:', dbReal.toFixed(2));
  console.log('DB Total Sisa:', dbSisa.toFixed(2));
  console.log('DB Selesai count:', dbSelesai.length);
  console.log('DB Proses count:', dbProses.length);
  console.log('DB Belum count:', dbBelum.length);
  console.log('Proses locations in DB Planting (' + dbProses.length + '):');
  dbProses.forEach(p => {
    console.log(` - Lokasi: ${p.lokasi}, Luas: ${p.luas}, Real: ${p.realTanam}, Sisa: ${p.sisa}, Progress: ${p.progress}%, Status: ${p.status}`);
  });

  // Check differences between Excel RTN and DB Planting
  console.log('\n=== COMPARISON: EXCEL RTN vs DB PLANTING ===');
  const excelMap = new Map();
  excelRows.forEach(r => excelMap.set(r.lokasi.toUpperCase(), r));
  const dbMap = new Map();
  dbPlantings.forEach(p => dbMap.set(p.lokasi.toUpperCase(), p));

  const onlyInExcel = [];
  excelMap.forEach((v, k) => {
    if (!dbMap.has(k)) onlyInExcel.push(k);
  });
  const onlyInDb = [];
  dbMap.forEach((v, k) => {
    if (!excelMap.has(k)) onlyInDb.push(k);
  });

  console.log('Locations only in Excel RTN:', onlyInExcel);
  console.log('Locations only in DB Planting:', onlyInDb);

  const differingRows = [];
  excelMap.forEach((eRow, loc) => {
    const dRow = dbMap.get(loc);
    if (!dRow) return;
    const diffs = [];
    if (Math.abs(eRow.luas - (dRow.luas || 0)) > 0.05) diffs.push(`Luas (E:${eRow.luas} vs DB:${dRow.luas})`);
    if (Math.abs(eRow.realTanam - (dRow.realTanam || 0)) > 0.05) diffs.push(`Real (E:${eRow.realTanam} vs DB:${dRow.realTanam})`);
    if (Math.abs(eRow.sisa - (dRow.sisa || 0)) > 0.05) diffs.push(`Sisa (E:${eRow.sisa} vs DB:${dRow.sisa})`);
    const ePct = eRow.progress <= 1 && eRow.progress > 0 ? eRow.progress * 100 : eRow.progress;
    if (Math.abs(ePct - (dRow.progress || 0)) > 1) diffs.push(`Progress (E:${ePct.toFixed(1)}% vs DB:${dRow.progress}%)`);
    if (diffs.length > 0) {
      differingRows.push({ lokasi: loc, diffs, excel: eRow, db: dRow });
    }
  });

  console.log('Total locations with differing values:', differingRows.length);
  differingRows.forEach(d => {
    console.log(`[DIFF] ${d.lokasi}: ${d.diffs.join(' | ')}`);
  });
}

main().finally(() => prisma.$disconnect());
