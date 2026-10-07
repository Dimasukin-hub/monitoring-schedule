const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);

  const dbLands = await prisma.land.findMany({
    select: {
      id: true,
      lokasi: true,
      wilayah: true,
      luasBruto: true,
      luasNetto: true,
      status: true,
      eks: true,
      sejarah: true,
      phBk: true,
      phSn: true,
    }
  });

  const dbMap = new Map();
  dbLands.forEach(l => dbMap.set(l.lokasi.toUpperCase().trim(), l));

  const masterRows = [];
  const duplicateLokasi = new Map();

  for (let r = 11; r <= range.e.r; r++) {
    const lokasiCell = ws[xlsx.utils.encode_cell({ r, c: 3 })];
    if (!lokasiCell || lokasiCell.v === undefined) continue;
    const lokasi = String(lokasiCell.v).trim();
    if (!lokasi || lokasi === '1' || lokasi === 'LOKASI') continue;

    const wilCell = ws[xlsx.utils.encode_cell({ r, c: 2 })];
    const brutoCell = ws[xlsx.utils.encode_cell({ r, c: 4 })];
    const nettoCell = ws[xlsx.utils.encode_cell({ r, c: 5 })];
    const stsCell = ws[xlsx.utils.encode_cell({ r, c: 6 })];
    const eksCell = ws[xlsx.utils.encode_cell({ r, c: 7 })];
    const sejCell = ws[xlsx.utils.encode_cell({ r, c: 8 })];
    const phBkCell = ws[xlsx.utils.encode_cell({ r, c: 9 })];
    const phSnCell = ws[xlsx.utils.encode_cell({ r, c: 10 })];

    const item = {
      row: r + 1,
      lokasi,
      wilayah: wilCell?.v !== undefined ? String(wilCell.v).trim() : null,
      luasBruto: brutoCell?.v !== undefined && typeof brutoCell.v === 'number' ? brutoCell.v : (parseFloat(brutoCell?.v) || 0),
      luasNetto: nettoCell?.v !== undefined && typeof nettoCell.v === 'number' ? nettoCell.v : (parseFloat(nettoCell?.v) || 0),
      status: stsCell?.v !== undefined ? String(stsCell.v).trim() : null,
      eks: eksCell?.v !== undefined ? String(eksCell.v).trim() : null,
      sejarah: sejCell?.v !== undefined ? String(sejCell.v).trim() : null,
      phBk: phBkCell?.v !== undefined && !isNaN(parseFloat(phBkCell.v)) ? parseFloat(phBkCell.v) : null,
      phSn: phSnCell?.v !== undefined && !isNaN(parseFloat(phSnCell.v)) ? parseFloat(phSnCell.v) : null,
    };

    const key = lokasi.toUpperCase();
    if (duplicateLokasi.has(key)) {
      duplicateLokasi.set(key, duplicateLokasi.get(key) + 1);
    } else {
      duplicateLokasi.set(key, 1);
    }

    masterRows.push(item);
  }

  console.log('=== COMPARISON SUMMARY ===');
  console.log('Total Land records in DB:', dbLands.length);
  console.log('Total valid rows in Sheet Master:', masterRows.length);

  let inDbAndMaster = 0;
  let inMasterNotDb = 0;
  let differencesCount = 0;
  const sampleDiffs = [];

  for (const m of masterRows) {
    const dbItem = dbMap.get(m.lokasi.toUpperCase());
    if (dbItem) {
      inDbAndMaster++;
      const diffFields = [];
      if (Math.abs((dbItem.luasBruto || 0) - (m.luasBruto || 0)) > 0.01) diffFields.push(`luasBruto (DB:${dbItem.luasBruto} vs Master:${m.luasBruto})`);
      if (Math.abs((dbItem.luasNetto || 0) - (m.luasNetto || 0)) > 0.01) diffFields.push(`luasNetto (DB:${dbItem.luasNetto} vs Master:${m.luasNetto})`);
      if ((dbItem.status || '') !== (m.status || '')) diffFields.push(`status (DB:${dbItem.status} vs Master:${m.status})`);
      if ((dbItem.eks || '') !== (m.eks || '')) diffFields.push(`eks (DB:${dbItem.eks} vs Master:${m.eks})`);
      if ((dbItem.phBk || null) !== (m.phBk || null)) diffFields.push(`phBk (DB:${dbItem.phBk} vs Master:${m.phBk})`);
      if ((dbItem.phSn || null) !== (m.phSn || null)) diffFields.push(`phSn (DB:${dbItem.phSn} vs Master:${m.phSn})`);

      if (diffFields.length > 0) {
        differencesCount++;
        if (sampleDiffs.length < 5) {
          sampleDiffs.push({ lokasi: m.lokasi, diffs: diffFields });
        }
      }
    } else {
      inMasterNotDb++;
    }
  }

  console.log('Master rows found in current DB:', inDbAndMaster);
  console.log('Master rows NEW (not yet in DB):', inMasterNotDb);
  console.log('Master rows that have updated/different values compared to DB:', differencesCount);
  console.log('Sample differences:', JSON.stringify(sampleDiffs, null, 2));

  let dupCount = 0;
  for (const [k, count] of duplicateLokasi.entries()) {
    if (count > 1) dupCount++;
  }
  console.log('Duplicate lokasi keys in Sheet Master:', dupCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
