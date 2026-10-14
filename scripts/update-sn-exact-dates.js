const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');
const path = require('path');

function parseDate(val) {
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

async function updateSnDates() {
  console.log('🔄 Memperbarui tanggal realSn presisi di StokLahanMaster dari Sheet Master...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);

  const snLands = await prisma.stokLahanMaster.findMany({
    where: { category: 'SN' },
    select: { id: true, lokasi: true, realSn: true }
  });

  const snMap = new Map();
  snLands.forEach(l => snMap.set(l.lokasi, l));

  // Loop Master rows 1690 - 1730 (2026 SN rows)
  let updatedCount = 0;
  for (let r = 1680; r <= 1735; r++) {
    const lokCell = ws[xlsx.utils.encode_cell({ r, c: 3 })];
    if (!lokCell || !lokCell.v) continue;
    const lok = String(lokCell.v).trim();
    if (snMap.has(lok)) {
      const czVal = ws[xlsx.utils.encode_cell({ r, c: 103 })]?.v; // Col CZ: Siap Tanam
      const cyVal = ws[xlsx.utils.encode_cell({ r, c: 102 })]?.v; // Col CY: Jalan & Sal
      const parsedDate = parseDate(czVal) || parseDate(cyVal);
      if (parsedDate) {
        await prisma.stokLahanMaster.update({
          where: { lokasi: lok },
          data: { realSn: parsedDate }
        });
        console.log(`✅ ${lok}: realSn diupdate menjadi ${parsedDate}`);
        updatedCount++;
      }
    }
  }

  console.log(`\n🎉 Selesai memperbarui ${updatedCount} lokasi SN dengan tanggal presisi!`);
  await prisma.$disconnect();
}

updateSnDates().catch(console.error);
