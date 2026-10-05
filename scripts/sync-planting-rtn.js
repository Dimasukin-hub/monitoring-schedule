const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function excelDateToString(serial) {
  if (!serial || isNaN(serial) || serial < 1000) return null;
  // Excel epoch is Dec 30 1899
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date_info.getUTCDate();
  const month = months[date_info.getUTCMonth()];
  const year = String(date_info.getUTCFullYear()).slice(-2);
  return `${day}-${month}-${year}`;
}

async function main() {
  console.log('--- START SYNC PLANTING (RTN) ---');
  const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets['RTN'];

  if (!ws) {
    throw new Error('Sheet RTN not found in Excel!');
  }

  const range = xlsx.utils.decode_range(ws['!ref']);
  console.log(`Sheet RTN range: rows 0 to ${range.e.r}`);

  const plantings = [];

  for (let r = 5; r <= range.e.r; r++) {
    const locCell = ws[`D${r}`];
    if (!locCell) continue;

    const lokasiRaw = locCell.w || String(locCell.v || '').trim();
    if (!lokasiRaw || lokasiRaw.toLowerCase() === 'total' || lokasiRaw === '-') continue;

    const luasCell = ws[`E${r}`];
    const jenisCell = ws[`F${r}`];
    const kelasCell = ws[`G${r}`];
    const realCell = ws[`H${r}`];
    const sisaCell = ws[`I${r}`];
    const estCell = ws[`J${r}`];
    const progCell = ws[`K${r}`];
    const awalCell = ws[`L${r}`];
    const leadCell = ws[`M${r}`];

    const lokasi = String(lokasiRaw).trim();
    const luas = luasCell && !isNaN(Number(luasCell.v)) ? Number(Number(luasCell.v).toFixed(2)) : 0;
    const jenisBibit = jenisCell && jenisCell.v ? String(jenisCell.v).trim() : null;
    const kelasBibit = kelasCell && kelasCell.v ? String(kelasCell.v).trim() : null;
    
    let realTanam = realCell && !isNaN(Number(realCell.v)) ? Number(Number(realCell.v).toFixed(2)) : 0;
    let sisa = sisaCell && !isNaN(Number(sisaCell.v)) ? Number(Number(sisaCell.v).toFixed(2)) : Number((luas - realTanam).toFixed(2));

    // Est. Sls
    let estSelesai = null;
    if (estCell) {
      const val = estCell.v;
      const formatted = estCell.w;
      if (formatted && !formatted.includes('#') && formatted !== '42') {
        estSelesai = formatted.trim();
      } else if (typeof val === 'number' && val > 40000) {
        estSelesai = excelDateToString(val);
      }
    }

    // Awal Tnm
    let awalTanam = null;
    if (awalCell) {
      const val = awalCell.v;
      const formatted = awalCell.w;
      if (formatted && !formatted.includes('#')) {
        awalTanam = formatted.trim();
      } else if (typeof val === 'number' && val > 40000) {
        awalTanam = excelDateToString(val);
      }
    }

    // Leadtime
    let leadtime = null;
    if (leadCell && !isNaN(Number(leadCell.v))) {
      leadtime = parseInt(leadCell.v, 10);
    }

    // % Progress
    let progress = null;
    if (progCell && progCell.w && progCell.w.includes('%')) {
      const p = parseFloat(progCell.w.replace('%', '').trim());
      if (!isNaN(p)) progress = Number(p.toFixed(1));
    } else if (progCell && typeof progCell.v === 'number') {
      if (progCell.v <= 1 && progCell.v > 0) {
        progress = Number((progCell.v * 100).toFixed(1));
      } else if (progCell.v > 1) {
        progress = Number(progCell.v.toFixed(1));
      }
    }

    // If progress still null, calculate from realTanam and luas
    if (progress === null) {
      if (luas > 0) {
        if (realTanam >= luas) {
          progress = 100;
        } else if (realTanam > 0) {
          progress = Number(((realTanam / luas) * 100).toFixed(1));
        } else {
          progress = 0;
        }
      } else {
        progress = 0;
      }
    }

    // Status
    let status = 'BELUM TANAM';
    if (progress >= 100 || (luas > 0 && realTanam >= luas) || (sisa !== null && Math.abs(sisa) <= 0.05 && realTanam > 0)) {
      status = 'SELESAI';
      if (progress < 100) progress = 100;
    } else if (realTanam > 0 || (progress > 0 && progress < 100)) {
      status = 'PROSES';
    }

    plantings.push({
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
      status
    });
  }

  console.log(`Parsed ${plantings.length} planting rows from RTN sheet.`);
  console.log('Sample parsed item:', plantings[0]);
  console.log('Sample parsed item (with progress):', plantings.find(p => p.progress > 0 && p.progress < 100) || plantings[360]);

  // Clean existing and bulk insert
  console.log('Clearing existing Planting records in database...');
  await prisma.planting.deleteMany({});

  console.log('Inserting into database...');
  const result = await prisma.planting.createMany({
    data: plantings
  });

  console.log(`Successfully synced ${result.count} Planting records to database!`);
}

main()
  .catch((e) => {
    console.error('Error syncing planting:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
