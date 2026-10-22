const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function excelDateToString(serial) {
  if (!serial || isNaN(serial) || serial < 1000) return null;
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
  const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
  const wb = xlsx.readFile(filePath, { cellDates: false });
  const ws = wb.Sheets['RTN'];

  const plantings = [];
  let sumLuas = 0;
  let sumReal = 0;
  let sumSisa = 0;

  for (let r = 6; r <= 368; r++) {
    const locCell = ws[`D${r}`];
    if (!locCell) continue;

    const lokasi = String(locCell.v || '').trim();
    if (!lokasi) continue;

    const luasCell = ws[`E${r}`];
    const jenisCell = ws[`F${r}`];
    const kelasCell = ws[`G${r}`];
    const realCell = ws[`H${r}`];
    const sisaCell = ws[`I${r}`];
    const estCell = ws[`J${r}`];
    const progCell = ws[`K${r}`];
    const awalCell = ws[`L${r}`];
    const leadCell = ws[`M${r}`];

    const luas = luasCell && !isNaN(Number(luasCell.v)) ? Number(Number(luasCell.v).toFixed(3)) : 0;
    const realTanam = realCell && !isNaN(Number(realCell.v)) ? Number(Number(realCell.v).toFixed(3)) : 0;
    const sisa = sisaCell && !isNaN(Number(sisaCell.v)) ? Number(Number(sisaCell.v).toFixed(3)) : Number((realTanam - luas).toFixed(3));

    const jenisBibit = jenisCell && jenisCell.v ? String(jenisCell.v).trim() : null;
    const kelasBibit = kelasCell && kelasCell.v ? String(kelasCell.v).trim() : null;

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

    let leadtime = null;
    if (leadCell && !isNaN(Number(leadCell.v))) {
      leadtime = parseInt(leadCell.v, 10);
    }

    let progress = null;
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

    // 3 Status: SELESAI (>=100%), CEK SELESAI (>95%), PROSES (<=95%)
    let status = 'PROSES';
    if (progress >= 100 || (luas > 0 && realTanam >= luas) || (sisa !== null && Math.abs(sisa) <= 0.05 && realTanam > 0 && progress >= 99.9)) {
      status = 'SELESAI';
      if (progress < 100) progress = 100;
    } else if (progress > 95) {
      status = 'CEK SELESAI';
    } else if (realTanam > 0 || progress > 0) {
      status = 'PROSES';
    } else {
      status = 'BELUM TANAM';
    }

    sumLuas += luas;
    sumReal += realTanam;
    sumSisa += sisa;

    plantings.push({
      lokasi,
      luas: Number(luas.toFixed(2)),
      jenisBibit,
      kelasBibit,
      realTanam: Number(realTanam.toFixed(2)),
      sisa: Number(sisa.toFixed(2)),
      estSelesai,
      progress,
      awalTanam,
      leadtime,
      status
    });
  }

  console.log(`Parsed ${plantings.length} locations.`);
  console.log('Total Luas:', sumLuas.toFixed(2));
  console.log('Total Real:', sumReal.toFixed(2));
  console.log('Total Sisa:', sumSisa.toFixed(2));

  // Count by status
  const byStatus = {};
  for (const p of plantings) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
  }
  console.log('Counts by status:', byStatus);

  // Apply majority calculation from PlantingDetail for kelasBibit and jenisBibit
  const details = await prisma.plantingDetail.findMany({ orderBy: { id: 'asc' } });
  const detailMap = new Map();
  for (const d of details) {
    if (!d.lokasi) continue;
    const loc = d.lokasi.trim().toUpperCase();
    if (!detailMap.has(loc)) detailMap.set(loc, []);
    detailMap.get(loc).push(d);
  }

  for (const p of plantings) {
    const loc = p.lokasi.trim().toUpperCase();
    const rows = detailMap.get(loc);
    if (!rows || rows.length === 0) continue;

    const classSums = { 'Besar': 0, 'Sedang': 0, 'Kecil': 0, 'Extra Kecil': 0, 'Standar': 0 };
    const classJenisMap = { 'Besar': {}, 'Sedang': {}, 'Kecil': {}, 'Extra Kecil': {}, 'Standar': {} };
    const overallJenisSums = {};

    for (const r of rows) {
      const j = r.jenisBibit ? r.jenisBibit.trim() : null;
      if (j) overallJenisSums[j] = (overallJenisSums[j] || 0) + (r.total || 0);

      const addClass = (className, val) => {
        if (!val || val <= 0) return;
        classSums[className] += val;
        if (j) classJenisMap[className][j] = (classJenisMap[className][j] || 0) + val;
      };

      addClass('Besar', r.besar);
      addClass('Sedang', r.sedang);
      addClass('Kecil', r.kecil);
      addClass('Extra Kecil', r.extraKecil);
      addClass('Standar', r.standar);
    }

    const activeClasses = Object.entries(classSums).filter(([_, sum]) => sum > 0.0001);
    if (activeClasses.length > 0) {
      activeClasses.sort((a, b) => b[1] - a[1]);
      p.kelasBibit = activeClasses[0][0];

      const distinctJenis = Object.keys(overallJenisSums);
      if (distinctJenis.length === 1) {
        p.jenisBibit = distinctJenis[0];
      } else if (distinctJenis.length > 1) {
        const winningClassJenis = Object.entries(classJenisMap[p.kelasBibit] || {});
        if (winningClassJenis.length > 0) {
          winningClassJenis.sort((a, b) => b[1] - a[1]);
          p.jenisBibit = winningClassJenis[0][0];
        } else {
          const overallEntries = Object.entries(overallJenisSums);
          overallEntries.sort((a, b) => b[1] - a[1]);
          p.jenisBibit = overallEntries[0][0];
        }
      }
    }
  }

  // Upsert to DB
  console.log('Upserting to Prisma DB...');
  await prisma.planting.deleteMany({});
  await prisma.planting.createMany({ data: plantings });

  console.log('Done syncing 363 locations to DB!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
