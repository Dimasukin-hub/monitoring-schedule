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

async function main() {
  console.log('🚀 Memulai Sinkronisasi Data Lahan (Wilayah s/d pH) dari Sheet Master ke Database...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const sheet = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(sheet['!ref']);
  const getCell = (r, c) => sheet[xlsx.utils.encode_cell({ r, c })]?.v;

  // Build master mapping: mapping per lokasi (latest cycle)
  const masterMap = new Map();

  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1' || rawLokasi === 'LOKASI') continue;
    const lokasi = String(rawLokasi).trim();

    let rawWilayah = parseString(getCell(r, 2));
    const wilayah = rawWilayah ? rawWilayah.toUpperCase().trim() : null;
    const luasBruto = parseNumber(getCell(r, 4)) || 0;
    const luasNetto = parseNumber(getCell(r, 5)) || 0;
    const status = cleanStatus(getCell(r, 6));
    const eks = parseString(getCell(r, 7));
    const sejarah = parseString(getCell(r, 8));
    const phBk = parseNumber(getCell(r, 9));
    const phSn = parseNumber(getCell(r, 10));

    // Store/overwrite so latest cycle row in Master is retained
    masterMap.set(lokasi.toUpperCase(), {
      wilayah,
      luasBruto,
      luasNetto,
      status,
      eks,
      sejarah,
      phBk,
      phSn,
    });
  }

  console.log(`📋 Ditemukan ${masterMap.size} lokasi unik di Sheet Master.`);

  // Update existing DB lands
  const dbLands = await prisma.land.findMany({
    select: { id: true, lokasi: true, wilayah: true, luasBruto: true, luasNetto: true, status: true, eks: true, sejarah: true, phBk: true, phSn: true }
  });

  console.log(`🔍 Memeriksa ${dbLands.length} record Land di database...`);

  let updatedCount = 0;
  for (const land of dbLands) {
    const master = masterMap.get(land.lokasi.toUpperCase());
    if (master) {
      const updateData = {};
      if (master.wilayah && master.wilayah !== land.wilayah) updateData.wilayah = master.wilayah;
      if (master.luasBruto !== null && Math.abs((land.luasBruto || 0) - master.luasBruto) > 0.001) updateData.luasBruto = master.luasBruto;
      if (master.luasNetto !== null && Math.abs((land.luasNetto || 0) - master.luasNetto) > 0.001) updateData.luasNetto = master.luasNetto;
      if (master.status && master.status !== land.status) updateData.status = master.status;
      if (master.eks !== (land.eks || null)) updateData.eks = master.eks;
      if (master.sejarah !== (land.sejarah || null)) updateData.sejarah = master.sejarah;
      if (master.phBk !== (land.phBk || null)) updateData.phBk = master.phBk;
      if (master.phSn !== (land.phSn || null)) updateData.phSn = master.phSn;

      if (Object.keys(updateData).length > 0) {
        await prisma.land.update({
          where: { id: land.id },
          data: updateData,
        });
        updatedCount++;
      }
    }
  }

  console.log(`✅ Berhasil memperbarui ${updatedCount} record lahan di tabel Land database.`);
  await prisma.$disconnect();
}

main().catch(console.error);
