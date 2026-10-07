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

async function syncListStokMaster() {
  console.log('🚀 Memulai Pembaruan Data List Stok Lahan dari Schedule 2026 Update 09 (Sheet Master)...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

  // Map per lokasi
  const masterMap = new Map();

  for (let r = 11; r <= range.e.r; r++) {
    const rawLokasi = getCell(r, 3);
    if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
    if (rawLokasi === 1 || rawLokasi === '1' || rawLokasi === 'LOKASI') continue;
    const lokasi = String(rawLokasi).trim();
    const key = lokasi.toUpperCase();

    const aplikasiTerakhir = parseString(getCell(r, 0));
    const rawWilayah = parseString(getCell(r, 2));
    const wilayah = rawWilayah ? rawWilayah.toUpperCase() : null;
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
        aplikasiTerakhir,
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
        aplikasiTerakhir: aplikasiTerakhir || prev.aplikasiTerakhir,
        latestRow: r + 1,
      });
    }
  }

  console.log(`📋 Total lokasi unik ditemukan di Sheet Master: ${masterMap.size}`);

  const dbLands = await prisma.land.findMany();
  const dbMap = new Map();
  for (const l of dbLands) {
    dbMap.set(l.lokasi.toUpperCase(), l);
  }

  let updatedCount = 0;
  let insertedCount = 0;

  for (const [key, master] of masterMap.entries()) {
    if (dbMap.has(key)) {
      const existing = dbMap.get(key);
      const updateData = {};

      if (master.wilayah && master.wilayah !== existing.wilayah) updateData.wilayah = master.wilayah;
      if (master.luasBruto > 0 && Math.abs(existing.luasBruto - master.luasBruto) > 0.001) updateData.luasBruto = master.luasBruto;
      if (master.luasNetto > 0 && Math.abs(existing.luasNetto - master.luasNetto) > 0.001) updateData.luasNetto = master.luasNetto;
      if (master.status && master.status !== existing.status) updateData.status = master.status;
      if (master.eks && master.eks !== existing.eks) updateData.eks = master.eks;
      if (master.sejarah && master.sejarah !== existing.sejarah) updateData.sejarah = master.sejarah;
      if (master.phBk !== null && master.phBk !== existing.phBk) updateData.phBk = master.phBk;
      if (master.phSn !== null && master.phSn !== existing.phSn) updateData.phSn = master.phSn;
      if (master.aplikasiTerakhir && master.aplikasiTerakhir !== existing.aplikasiTerakhir) {
        updateData.aplikasiTerakhir = master.aplikasiTerakhir;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.land.update({
          where: { id: existing.id },
          data: updateData,
        });
        updatedCount++;
      }
    } else {
      // Insert new land record
      await prisma.land.create({
        data: {
          lokasi: master.lokasi,
          wilayah: master.wilayah || 'W01',
          luasBruto: master.luasBruto || 0,
          luasNetto: master.luasNetto || 0,
          status: master.status,
          eks: master.eks,
          sejarah: master.sejarah,
          phBk: master.phBk,
          phSn: master.phSn,
          aplikasiTerakhir: master.aplikasiTerakhir,
        },
      });
      insertedCount++;
    }
  }

  console.log(`✅ Sinkronisasi Selesai!`);
  console.log(`   - Data petak lahan diperbarui: ${updatedCount} petak`);
  console.log(`   - Petak baru ditambahkan ke database: ${insertedCount} petak`);
  console.log(`   - Total petak terdaftar di DB sekarang: ${dbLands.length + insertedCount} petak`);

  await prisma.$disconnect();
}

syncListStokMaster().catch(console.error);
