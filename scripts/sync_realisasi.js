const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function parseString(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '#N/A' || s === '0') return null;
  return s;
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

async function syncRealisasi() {
  console.log('🔄 Syncing Realisasi Aplikasi (01. Chopper s/d 22. Jalan & Sal) into database...');
  const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
  const workbook = xlsx.readFile(filePath, { cellDates: false });
  const dataSheet = workbook.Sheets['Data'];
  const rawData = xlsx.utils.sheet_to_json(dataSheet, { header: 1, defval: '' });

  let updatedCount = 0;

  for (let r = 5; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row) continue;

    const lokasi = parseString(row[5]);
    if (!lokasi) continue;

    const realisasiData = {
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
    };

    const existingLand = await prisma.land.findUnique({
      where: { lokasi },
      select: { id: true, aplikasiDetails: true }
    });

    if (existingLand) {
      const currentDetails = typeof existingLand.aplikasiDetails === 'object' && existingLand.aplikasiDetails !== null
        ? existingLand.aplikasiDetails
        : {};

      const newDetails = {
        ...currentDetails,
        ...realisasiData,
        realisasiAplikasi: realisasiData
      };

      await prisma.land.update({
        where: { id: existingLand.id },
        data: { aplikasiDetails: newDetails }
      });
      updatedCount++;
    }
  }

  console.log(`✅ Successfully updated realisasi aplikasi for ${updatedCount} lands.`);
}

syncRealisasi()
  .catch((e) => {
    console.error('Error syncing realisasi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
