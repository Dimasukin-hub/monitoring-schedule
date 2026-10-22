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

  console.log('=== EXCEL RTN TOTAL STATS ===');
  console.log('Total locations:', excelRows.length);
  const sumLuas = excelRows.reduce((a, b) => a + b.luas, 0);
  const sumReal = excelRows.reduce((a, b) => a + b.realTanam, 0);
  const sumSisa = excelRows.reduce((a, b) => a + b.sisa, 0);
  console.log('Total Luas:', sumLuas.toFixed(2));
  console.log('Total Real Tanam:', sumReal.toFixed(2));
  console.log('Total Sisa:', sumSisa.toFixed(2));

  // Check how progress and sisa are formatted in Excel
  console.log('\nRows in Excel RTN where sisa != 0 or real != luas:');
  const nonComplete = excelRows.filter(r => Math.abs(r.sisa) > 0.05 || Math.abs(r.luas - r.realTanam) > 0.05);
  console.log('Count of non-complete rows in Excel RTN:', nonComplete.length);
  nonComplete.forEach(r => {
    console.log(`Loc: ${r.lokasi} | Luas: ${r.luas} | Real: ${r.realTanam} | Sisa: ${r.sisa} | Prog: ${r.progress} | Awal: ${r.awalTanam} | Est: ${r.estSelesai}`);
  });

  console.log('\n=== DB PLANTING TOTAL STATS ===');
  const dbPlantings = await prisma.planting.findMany();
  console.log('Total DB rows:', dbPlantings.length);
  const dbLuas = dbPlantings.reduce((a, b) => a + (b.luas || 0), 0);
  const dbReal = dbPlantings.reduce((a, b) => a + (b.realTanam || 0), 0);
  const dbSisa = dbPlantings.reduce((a, b) => a + (b.sisa || 0), 0);
  console.log('DB Total Luas:', dbLuas.toFixed(2));
  console.log('DB Total Real Tanam:', dbReal.toFixed(2));
  console.log('DB Total Sisa:', dbSisa.toFixed(2));

  const dbNonComplete = dbPlantings.filter(r => (r.status === 'PROSES' || (r.sisa || 0) > 0.05 || (r.progress || 0) < 100));
  console.log('Count of non-complete rows in DB Planting:', dbNonComplete.length);
  dbNonComplete.forEach(r => {
    console.log(`Loc: ${r.lokasi} | Luas: ${r.luas} | Real: ${r.realTanam} | Sisa: ${r.sisa} | Prog: ${r.progress} | Status: ${r.status}`);
  });
}

main().finally(() => prisma.$disconnect());
