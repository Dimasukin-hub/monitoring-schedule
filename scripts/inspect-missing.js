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

async function inspectMissing() {
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

  const masterMap = new Map();

  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1' || rawLokasi === 'LOKASI') continue;
    const lokasi = String(rawLokasi).trim();
    const key = lokasi.toUpperCase();

    const wilayah = parseString(getCell(r, 2)) ? parseString(getCell(r, 2)).toUpperCase() : null;
    const luasBruto = parseNumber(getCell(r, 4)) || 0;
    const luasNetto = parseNumber(getCell(r, 5)) || 0;
    const status = cleanStatus(getCell(r, 6));
    const eks = parseString(getCell(r, 7));
    const sejarah = parseString(getCell(r, 8));
    const phBk = parseNumber(getCell(r, 9));
    const phSn = parseNumber(getCell(r, 10));

    if (!masterMap.has(key)) {
      masterMap.set(key, {
        lokasi,
        wilayah,
        luasBruto,
        luasNetto,
        status,
        eks,
        sejarah,
        phBk,
        phSn,
        latestRow: r + 1,
      });
    } else {
      const prev = masterMap.get(key);
      masterMap.set(key, {
        lokasi,
        wilayah: wilayah || prev.wilayah,
        luasBruto: luasBruto > 0 ? luasBruto : prev.luasBruto,
        luasNetto: luasNetto > 0 ? luasNetto : prev.luasNetto,
        status: status || prev.status,
        eks: eks || prev.eks,
        sejarah: sejarah || prev.sejarah,
        phBk: phBk !== null ? phBk : prev.phBk,
        phSn: phSn !== null ? phSn : prev.phSn,
        latestRow: r + 1,
      });
    }
  }

  const dbLands = await prisma.land.findMany({ select: { id: true, lokasi: true } });
  const dbLokasiSet = new Set(dbLands.map(l => l.lokasi.toUpperCase()));

  const missing = [];
  for (const [key, item] of masterMap.entries()) {
    if (!dbLokasiSet.has(key)) {
      missing.push(item);
    }
  }

  console.log(`Missing in DB: ${missing.length} records.`);
  console.log(missing);

  await prisma.$disconnect();
}

inspectMissing().catch(console.error);
