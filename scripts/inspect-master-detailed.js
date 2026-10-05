const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellDates: false });
  const sheet = wb.Sheets['Master'];
  const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log('Total rows in Master sheet:', rawData.length);

  // Check valid land rows:
  let validLandRows = 0;
  let wilayahs = new Set();
  let sampleRows = [];

  for (let r = 11; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row) continue;
    const lokasi = row[3] ? String(row[3]).trim() : '';
    const wilayah = row[2] ? String(row[2]).trim() : '';
    if (lokasi && lokasi !== '-' && lokasi !== '#N/A') {
      validLandRows++;
      if (wilayah) wilayahs.add(wilayah);
      if (sampleRows.length < 5) {
        sampleRows.push({
          rowIdx: r,
          wilayah,
          lokasi,
          bruto: row[4],
          netto: row[5],
          status: row[6],
          eks: row[7],
          sejarah: row[8],
          phBk: row[9],
          phSn: row[10],
          rencBkr: row[11],
          rencBajak: row[12],
          bibit: row[51],
          bulanSn: row[52],
          bulanTanam: row[53],
          aplikasiTerakhir: row[0],
          statusApl: row[48],
          mulaiTanam: row[47],
          selesaiTanam: row[48],
          realBkr: row[72],
          realBajak: row[73],
          realMulaiTnm: row[104],
          realSelesaiTnm: row[105]
        });
      }
    }
  }

  console.log('Valid land rows count:', validLandRows);
  console.log('Wilayahs found:', Array.from(wilayahs));
  console.log('Sample rows:', JSON.stringify(sampleRows, null, 2));

  // Check DB land count
  const dbLandCount = await prisma.land.count();
  console.log('Current DB land count:', dbLandCount);

  await prisma.$disconnect();
}

main().catch(console.error);
