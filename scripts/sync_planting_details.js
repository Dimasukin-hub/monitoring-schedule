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
    // Create Date at local noon to avoid any timezone boundary drift
    const date = new Date(year, d.m - 1, d.d, 12, 0, 0);
    return { str: `${day}/${month}/${year}`, date };
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return { str: null, date: null };
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return { str: `${day}/${month}/${year}`, date: val };
  }
  if (typeof val === 'string') {
    const clean = val.trim();
    if (!clean || clean === '-') return { str: null, date: null };
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      return { str: clean, date: new Date(year, month - 1, day, 12, 0, 0) };
    }
    const parsed = new Date(clean);
    return { str: clean, date: isNaN(parsed.getTime()) ? null : parsed };
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
  console.log('--- START SYNC PLANTING DETAILS ---');
  const excelPath = path.join(__dirname, '../excel/Monitor Siap Nanas Update.xlsx');
  const wb = xlsx.readFile(excelPath, { cellDates: false });
  const sheetName = 'Input Real Tanam&Petik Nanas';
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Sheet ${sheetName} not found in ${excelPath}`);
  }

  const rawData = xlsx.utils.sheet_to_json(ws, { header: 1 });
  console.log(`Raw rows in ${sheetName}: ${rawData.length}`);

  const records = [];
  // Row 0 to 5 are headers/empty, data starts at index 6 (Excel Row 7)
  for (let i = 6; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[1]) continue;
    const lokasi = String(row[1]).trim();
    if (!lokasi || lokasi === 'Lokasi' || lokasi === '-' || lokasi === '0') continue;

    const tglInfo = parseExcelDate(row[0]);
    const awalInfo = parseExcelDate(row[11]);
    const slsInfo = parseExcelDate(row[12]);

    records.push({
      lokasi,
      tanggal: tglInfo.str,
      tanggalDate: tglInfo.date,
      luasNetto: parseNum(row[2]) || null,
      aktivitas: row[3] ? String(row[3]).trim() : null,
      standar: parseNum(row[4]),
      besar: parseNum(row[5]),
      sedang: parseNum(row[6]),
      kecil: parseNum(row[7]),
      total: parseNum(row[8]),
      jenisBibit: row[9] ? String(row[9]).trim() : null,
      wilayah: row[10] ? String(row[10]).trim() : null,
      awalTanam: awalInfo.str,
      selesaiTanam: slsInfo.str,
      akumTanam: parseNum(row[13]),
      persenTanam: parseNum(row[14]),
      petikKe: row[15] !== undefined && row[15] !== null ? String(row[15]).trim() : null,
      sourceFile: 'Monitor Siap Nanas Update.xlsx',
      sourceSheet: sheetName,
    });
  }

  console.log(`Parsed ${records.length} valid transaction records.`);

  // Delete existing records to avoid duplicates when re-syncing
  const deleted = await prisma.plantingDetail.deleteMany({});
  console.log(`Cleared ${deleted.count} old records in PlantingDetail.`);

  // Batch insert into PlantingDetail
  const BATCH_SIZE = 500;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await prisma.plantingDetail.createMany({
      data: batch,
    });
    console.log(`Inserted batch ${i + 1} - ${Math.min(i + BATCH_SIZE, records.length)}`);
  }

  const finalCount = await prisma.plantingDetail.count();
  console.log(`--- SUCCESS: Total ${finalCount} records in PlantingDetail ---`);
}

main()
  .catch((err) => {
    console.error('Error syncing planting details:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
