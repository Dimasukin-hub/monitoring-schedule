const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Month map for dates
const MONTH_MAP = {
  'Jan-26': { monthNum: 1, str: '15/01/2026', date: new Date(2026, 0, 15, 12, 0, 0) },
  'Feb-26': { monthNum: 2, str: '15/02/2026', date: new Date(2026, 1, 15, 12, 0, 0) },
  'Mar-26': { monthNum: 3, str: '15/03/2026', date: new Date(2026, 2, 15, 12, 0, 0) },
  'Apr-26': { monthNum: 4, str: '15/04/2026', date: new Date(2026, 3, 15, 12, 0, 0) },
  'Mei-26': { monthNum: 5, str: '15/05/2026', date: new Date(2026, 4, 15, 12, 0, 0) },
  'Jun-26': { monthNum: 6, str: '15/06/2026', date: new Date(2026, 5, 15, 12, 0, 0) },
  'Jul-26': { monthNum: 7, str: '15/07/2026', date: new Date(2026, 6, 15, 12, 0, 0) },
  'Agu-26': { monthNum: 8, str: '15/08/2026', date: new Date(2026, 7, 15, 12, 0, 0) },
  'Agt-26': { monthNum: 8, str: '15/08/2026', date: new Date(2026, 7, 15, 12, 0, 0) },
  'Sep-26': { monthNum: 9, str: '15/09/2026', date: new Date(2026, 8, 15, 12, 0, 0) },
  'Okt-26': { monthNum: 10, str: '15/10/2026', date: new Date(2026, 9, 15, 12, 0, 0) },
  'Nov-26': { monthNum: 11, str: '15/11/2026', date: new Date(2026, 10, 15, 12, 0, 0) },
  'Des-26': { monthNum: 12, str: '15/12/2026', date: new Date(2026, 11, 15, 12, 0, 0) },
};

async function main() {
  console.log('=== SYNC PLANTING DETAILS FROM CHART DATASETS ===');
  
  // 1. Read JSON source of truth
  const jsonPath = path.join(__dirname, '../lib/sebaranBibitBulan.json');
  const sebaranData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 2. Fetch Land & Planting metadata to enrich records
  const lands = await prisma.land.findMany({
    select: { lokasi: true, wilayah: true, luasNetto: true, realMulaiTanam: true, realSelesaiTanam: true }
  });
  const plantings = await prisma.planting.findMany({
    select: { lokasi: true, luas: true, awalTanam: true, estSelesai: true, status: true }
  });

  const landMap = new Map();
  for (const l of lands) {
    if (l.lokasi) landMap.set(l.lokasi.trim().toUpperCase(), l);
  }

  const plantingMap = new Map();
  for (const p of plantings) {
    if (p.lokasi) plantingMap.set(p.lokasi.trim().toUpperCase(), p);
  }

  // 3. Flatten all location records across months and classes
  const rawRecords = [];

  for (const m of sebaranData) {
    const monthInfo = MONTH_MAP[m.monthKey] || {
      monthNum: 1,
      str: '15/01/2026',
      date: new Date(2026, 0, 15, 12, 0, 0)
    };

    for (const [classKey, classObj] of Object.entries(m.classes || {})) {
      const locations = classObj.locations || [];
      if (locations.length === 0) continue;

      const jenisBibit = classKey.startsWith('crown_') ? 'Crown' : 'Sucker';
      
      let isBesar = classKey.endsWith('_B');
      let isSedang = classKey.endsWith('_S');
      let isKecil = classKey.endsWith('_K');
      let isExtraKecil = classKey.endsWith('_M');

      for (const loc of locations) {
        const cleanLokasi = String(loc.lokasi || '').trim().toUpperCase();
        if (!cleanLokasi) continue;

        const luasHa = Number(loc.luasHa) || 0;
        const landMeta = landMap.get(cleanLokasi);
        const plantingMeta = plantingMap.get(cleanLokasi);

        const luasNetto = landMeta?.luasNetto || plantingMeta?.luas || luasHa;
        const wilayah = landMeta?.wilayah || null;
        const awalTanam = plantingMeta?.awalTanam || monthInfo.str;
        const selesaiTanam = plantingMeta?.estSelesai || null;

        rawRecords.push({
          lokasi: cleanLokasi,
          tanggal: monthInfo.str,
          tanggalDate: monthInfo.date,
          luasNetto: luasNetto ? Number(luasNetto.toFixed(2)) : null,
          aktivitas: 'Tanam Bibit',
          standar: 0,
          besar: isBesar ? luasHa : 0,
          sedang: isSedang ? luasHa : 0,
          kecil: isKecil ? luasHa : 0,
          extraKecil: isExtraKecil ? luasHa : 0,
          total: luasHa,
          jenisBibit,
          wilayah,
          awalTanam,
          selesaiTanam,
          petikKe: null,
          sourceFile: 'lib/sebaranBibitBulan.json',
          sourceSheet: `Sebaran Bibit ${m.monthKey}`,
        });
      }
    }
  }

  console.log(`Extracted total ${rawRecords.length} records from sebaranBibitBulan.json.`);

  // 4. Calculate cumulative akumTanam and persenTanam grouped by lokasi sorted chronologically
  // Group by lokasi
  const locGroups = new Map();
  for (const r of rawRecords) {
    if (!locGroups.has(r.lokasi)) {
      locGroups.set(r.lokasi, []);
    }
    locGroups.get(r.lokasi).push(r);
  }

  const finalRecords = [];
  for (const [lok, items] of locGroups.entries()) {
    // Sort items chronologically by tanggalDate
    items.sort((a, b) => a.tanggalDate.getTime() - b.tanggalDate.getTime());

    let runningAkum = 0;
    for (const item of items) {
      runningAkum += item.total;
      const netto = item.luasNetto || runningAkum;
      const pct = netto > 0 ? Number(((runningAkum / netto) * 100).toFixed(1)) : 100;

      finalRecords.push({
        ...item,
        akumTanam: Number(runningAkum.toFixed(2)),
        persenTanam: pct,
      });
    }
  }

  // Sort finalRecords by date asc, then lokasi asc
  finalRecords.sort((a, b) => {
    const diff = a.tanggalDate.getTime() - b.tanggalDate.getTime();
    if (diff !== 0) return diff;
    return a.lokasi.localeCompare(b.lokasi);
  });

  const totalLuasInserted = finalRecords.reduce((sum, r) => sum + r.total, 0);
  console.log(`Total records prepared: ${finalRecords.length}, Total Luas: ${totalLuasInserted.toFixed(2)} Ha`);

  // 5. Delete existing records from PlantingDetail to prevent duplicates
  const deleted = await prisma.plantingDetail.deleteMany({});
  console.log(`Cleared ${deleted.count} old records from PlantingDetail.`);

  // 6. Batch insert into PlantingDetail
  const BATCH_SIZE = 100;
  for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
    const batch = finalRecords.slice(i, i + BATCH_SIZE);
    await prisma.plantingDetail.createMany({
      data: batch,
    });
    console.log(`Inserted batch ${i + 1} - ${Math.min(i + BATCH_SIZE, finalRecords.length)}`);
  }

  const countAfter = await prisma.plantingDetail.count();
  console.log(`--- FINISHED: Successfully inserted ${countAfter} records into PlantingDetail! ---`);

  // 7. Verification: Check extraKecil count and total
  const extraKecilStats = await prisma.plantingDetail.aggregate({
    _sum: { extraKecil: true, kecil: true, sedang: true, besar: true, total: true },
    _count: { id: true },
  });
  console.log('Database verification aggregate:', extraKecilStats);
}

main()
  .catch((e) => {
    console.error('Error during sync:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
