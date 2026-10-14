const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

async function run() {
  const snLands = await prisma.stokLahanMaster.findMany({
    where: { category: 'SN' },
    select: { lokasi: true, wilayah: true, realBkr: true, realBajak: true, realSn: true, aplikasiTerakhir: true }
  });
  console.log('Total SN in StokLahanMaster:', snLands.length);
  console.log(snLands);

  // Periksa data di Excel sheet Master untuk lokasi SN ini
  const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'));
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  
  const snLocations = new Set(snLands.map(l => l.lokasi));
  console.log('\n--- Checking Excel Master Columns for SN Locations ---');
  for (let r = 11; r <= range.e.r; r++) {
    const lok = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
    if (lok && snLocations.has(String(lok).trim())) {
      const bVal = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.w || ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
      const cyVal = ws[xlsx.utils.encode_cell({ r, c: 102 })]?.w || ws[xlsx.utils.encode_cell({ r, c: 102 })]?.v; // CY: Jalan & Sal
      const czVal = ws[xlsx.utils.encode_cell({ r, c: 103 })]?.w || ws[xlsx.utils.encode_cell({ r, c: 103 })]?.v; // CZ: Siap Tanam
      const ridgerVal = ws[xlsx.utils.encode_cell({ r, c: 101 })]?.w || ws[xlsx.utils.encode_cell({ r, c: 101 })]?.v; // CX: Ridger
      console.log(`Lokasi: ${lok} | Row ${r+1} | B (Bulan SN): ${bVal} | CX (Ridger): ${ridgerVal} | CY (Jalan&Sal): ${cyVal} | CZ (Siap Tanam): ${czVal}`);
    }
  }

  await prisma.$disconnect();
}
run();
