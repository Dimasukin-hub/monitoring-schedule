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

async function syncListStokMaster() {
  console.log('🚀 Memulai Sinkronisasi Data Master Lahan dari Schedule 2026 Update 09.xlsx (Sheet Master)...');
  const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
  const wb = xlsx.readFile(filePath, { cellFormula: true });
  const ws = wb.Sheets['Master'];
  const range = xlsx.utils.decode_range(ws['!ref']);
  const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

  // Map lokasi unik ke baris mutakhir (baris terbawah)
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

    const rencBkr = parseDateString(getCell(r, 11));
    const rencBajak = parseDateString(getCell(r, 12));
    const realBkr = parseDateString(getCell(r, 72));
    const realBajak = parseDateString(getCell(r, 73));
    const realSn = parseDateString(getCell(r, 103));
    const realMulaiTanam = parseDateString(getCell(r, 104));
    const realSelesaiTanam = parseDateString(getCell(r, 105));

    // Baris yang lebih bawah adalah siklus paling mutakhir
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
      rencBkr,
      rencBajak,
      realBkr,
      realBajak,
      realSn,
      realMulaiTanam,
      realSelesaiTanam,
      latestRow: r + 1,
    });
  }

  console.log(`📋 Total lokasi unik ditemukan di Sheet Master: ${masterMap.size} lokasi`);

  const dbLands = await prisma.land.findMany({
    select: { id: true, lokasi: true, year: true }
  });
  const dbLocationsSet = new Set(dbLands.map(l => l.lokasi.toUpperCase()));

  let updatedLocations = 0;
  let insertedLocations = 0;

  for (const [key, master] of masterMap.entries()) {
    const updatePayload = {
      wilayah: master.wilayah || undefined,
      luasBruto: master.luasBruto > 0 ? master.luasBruto : undefined,
      luasNetto: master.luasNetto > 0 ? master.luasNetto : undefined,
      status: master.status || undefined,
      eks: master.eks,
      sejarah: master.sejarah,
      phBk: master.phBk,
      phSn: master.phSn,
    };
    if (master.aplikasiTerakhir) {
      updatePayload.aplikasiTerakhir = master.aplikasiTerakhir;
    }

    if (dbLocationsSet.has(key)) {
      await prisma.land.updateMany({
        where: {
          lokasi: { equals: master.lokasi, mode: 'insensitive' }
        },
        data: updatePayload
      });
      updatedLocations++;
    } else {
      await prisma.land.create({
        data: {
          lokasi: master.lokasi,
          wilayah: master.wilayah || 'W01',
          year: 2026,
          luasBruto: master.luasBruto || 0,
          luasNetto: master.luasNetto || 0,
          status: master.status,
          eks: master.eks,
          sejarah: master.sejarah,
          phBk: master.phBk,
          phSn: master.phSn,
          aplikasiTerakhir: master.aplikasiTerakhir,
          rencBkr: master.rencBkr,
          rencBajak: master.rencBajak,
          realBkr: master.realBkr,
          realBajak: master.realBajak,
          realMulaiTanam: master.realMulaiTanam,
          realSelesaiTanam: master.realSelesaiTanam,
        }
      });
      insertedLocations++;
    }
  }

  console.log(`✅ Sinkronisasi Master Selesai!`);
  console.log(`   - Lokasi diperbarui di database: ${updatedLocations} lokasi`);
  console.log(`   - Lokasi baru ditambahkan: ${insertedLocations} lokasi`);

  await prisma.$disconnect();
}

syncListStokMaster().catch(console.error);
