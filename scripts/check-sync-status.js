const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function parseNumber(val) {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseString(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '#N/A' || s === '0') return null;
  return s;
}

function cleanStatus(val) {
  const s = parseString(val);
  if (!s) return null;
  const cleaned = s.replace(/\d+/g, '').trim();
  return cleaned || s;
}

async function check() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

  const masterRows = [];
  const masterLokasiMap = new Map();
  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1' || rawLokasi === 'LOKASI') continue;
    const lokasi = String(rawLokasi).trim();
    const key = lokasi.toUpperCase();

    const rowData = {
      row: r + 1,
      wilayah: parseString(getCell(r, 2)) ? parseString(getCell(r, 2)).toUpperCase() : null,
      lokasi: lokasi,
      luasBruto: parseNumber(getCell(r, 4)) || 0,
      luasNetto: parseNumber(getCell(r, 5)) || 0,
      status: cleanStatus(getCell(r, 6)),
      eks: parseString(getCell(r, 7)),
      sejarah: parseString(getCell(r, 8)),
      phBk: parseNumber(getCell(r, 9)),
      phSn: parseNumber(getCell(r, 10)),
    };
    masterRows.push(rowData);
    masterLokasiMap.set(key, rowData);
  }

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

  const dbLokasiMap = new Map();
  for (const l of dbLands) {
    dbLokasiMap.set(l.lokasi.toUpperCase(), l);
  }

  console.log('Total baris terisi di Sheet Master:', masterRows.length);
  console.log('Lokasi unik di Sheet Master:', masterLokasiMap.size);
  console.log('Total lahan di Database (Land table):', dbLands.length);

  // Missing in DB
  const missingInDb = [];
  for (const [key, val] of masterLokasiMap.entries()) {
    if (!dbLokasiMap.has(key)) missingInDb.push(val);
  }
  console.log('Lokasi ada di Master tapi BELUM ada di DB:', missingInDb.length);
  if (missingInDb.length > 0) {
    console.log('Contoh yang belum ada:', missingInDb.slice(0, 10));
  }

  // Check differences between Master and DB
  let diffCount = 0;
  const sampleDiffs = [];
  for (const [key, master] of masterLokasiMap.entries()) {
    const db = dbLokasiMap.get(key);
    if (!db) continue;
    const diffs = [];
    if (master.wilayah && master.wilayah !== db.wilayah) diffs.push(`wilayah: ${db.wilayah} -> ${master.wilayah}`);
    if (Math.abs((db.luasBruto || 0) - (master.luasBruto || 0)) > 0.01) diffs.push(`bruto: ${db.luasBruto} -> ${master.luasBruto}`);
    if (Math.abs((db.luasNetto || 0) - (master.luasNetto || 0)) > 0.01) diffs.push(`netto: ${db.luasNetto} -> ${master.luasNetto}`);
    if (master.status && master.status !== db.status) diffs.push(`status: ${db.status} -> ${master.status}`);
    if (master.eks !== (db.eks || null)) diffs.push(`eks: ${db.eks} -> ${master.eks}`);
    if (master.sejarah !== (db.sejarah || null)) diffs.push(`sejarah: ${db.sejarah} -> ${master.sejarah}`);
    if (master.phBk !== (db.phBk || null)) diffs.push(`phBk: ${db.phBk} -> ${master.phBk}`);
    if (master.phSn !== (db.phSn || null)) diffs.push(`phSn: ${db.phSn} -> ${master.phSn}`);

    if (diffs.length > 0) {
      diffCount++;
      if (sampleDiffs.length < 5) {
        sampleDiffs.push({ lokasi: master.lokasi, diffs });
      }
    }
  }

  console.log('Jumlah petak yang berbeda datanya antara DB & Master:', diffCount);
  if (sampleDiffs.length > 0) {
    console.log('Contoh perbedaan:', JSON.stringify(sampleDiffs, null, 2));
  }

  await prisma.$disconnect();
}

check().catch(console.error);
