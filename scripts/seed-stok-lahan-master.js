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

function normalizeWilayah(w) {
  if (!w) return 'W01';
  const clean = String(w).trim().toUpperCase();
  if (clean === 'ARS1') return 'W07';
  if (clean === 'SAG1' || clean === 'MD2') return 'W04';
  if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
  if (clean.startsWith('AW')) {
    const num = clean.slice(2);
    return num.length === 1 ? 'W0' + num : 'W' + num;
  }
  return clean;
}

function getStokCategory(land) {
  const app = (land.aplikasiTerakhir || land.statusAplikasi || '').trim();
  const appLower = app.toLowerCase();

  // 1. Selesai Tanam
  if (
    land.progressTanam === 100 ||
    (land.realSelesaiTanam && land.realSelesaiTanam !== '-' && land.realSelesaiTanam !== '0') ||
    (app.includes('24.Sls Tanam') && (land.progressTanam ?? 0) >= 50)
  ) {
    return 'SELESAI';
  }

  // 2. Proses Tanam
  if (
    land.progressTanam === 50 ||
    (land.realMulaiTanam && !land.realSelesaiTanam) ||
    app.includes('23.Proses Tnm') ||
    appLower.includes('proses tnm') ||
    appLower.includes('proses tanam') ||
    appLower.includes('mulai tnm')
  ) {
    return 'PROSES';
  }

  // 3. SN
  if (
    (land.realSn && land.realSn !== '-' && land.realSn !== '0') ||
    app.includes('22.Siap Tanam') ||
    appLower.includes('siap tanam') ||
    app.includes('22.JALAN & SAL') ||
    appLower.includes('jalan & sal') ||
    appLower.includes('jalan dan sal')
  ) {
    return 'SN';
  }

  // 4. BJK
  const isRotaryPlough = appLower.includes('rotary plough');
  const bjkKeywords = [
    'mb 5 btr', 'mb 2.5', 'mb 5btr', 'howard', 'nardi', 'hr eks mb', 'exca',
    'tutup parit', 'gypsum', 'freeland', 'bedder', 'fh harrow', 'ss1', 'ss2',
    'subsoiler', 'fhk rent', 'rotary fh1', 'rotary fh2', 'finishing', 'ridger', 'bajak',
  ];

  if ((land.realBajak && land.realBajak !== '-' && land.realBajak !== '0') || (!isRotaryPlough && bjkKeywords.some((kw) => appLower.includes(kw)))) {
    return 'BJK';
  }

  // 5. BK
  return 'BK';
}

async function main() {
  console.log('🚀 Memulai Seed Tabel Baru StokLahanMaster dari Sheet Master...');
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

    // Filter khusus baris yang Bulan SN-nya tahun 2026 saja di Sheet Master (Kolom B / Col 1)
    const bCell = ws[xlsx.utils.encode_cell({ r, c: 1 })];
    if (!bCell) continue;

    let isSn2026 = false;
    if (typeof bCell.v === 'number' && bCell.v > 40000 && bCell.v < 60000) {
      const d = xlsx.SSF.parse_date_code(bCell.v);
      if (d.y === 2026) isSn2026 = true;
    } else if (bCell.w && (bCell.w.endsWith('-26') || bCell.w.includes('26'))) {
      isSn2026 = true;
    }
    if (!isSn2026) continue;

    const lokasi = String(rawLokasi).trim();
    const key = lokasi.toUpperCase();

    // Kolom Wilayah s/d pH (BK dan SN)
    const rawWilayah = parseString(getCell(r, 2));
    const wilayah = normalizeWilayah(rawWilayah);
    const luasBruto = parseNumber(getCell(r, 4)) || 0;
    let luasNetto = parseNumber(getCell(r, 5)) || 0;
    if (luasNetto === 0 && parseNumber(getCell(r, 10))) {
      // Untuk baris 2622-2623 yang luas netto tertulis di kolom 10
      luasNetto = parseNumber(getCell(r, 10)) || 0;
    }
    const status = cleanStatus(getCell(r, 6));
    const eks = parseString(getCell(r, 7));
    const sejarah = parseString(getCell(r, 8));
    const phBk = parseNumber(getCell(r, 9));
    const phSn = r >= 2622 && r <= 2623 ? null : parseNumber(getCell(r, 10));

    // Data aktivitas operasional untuk klasifikasi stok lahan
    const aplikasiTerakhir = parseString(getCell(r, 0));
    const realBkr = parseDateString(getCell(r, 72));
    const realBajak = parseDateString(getCell(r, 73));
    const realJalanSal = parseDateString(getCell(r, 102));
    const realSiapTanam = parseDateString(getCell(r, 103));
    const realSn = realSiapTanam || realJalanSal;
    const realMulaiTanam = parseDateString(getCell(r, 104));
    const realSelesaiTanam = parseDateString(getCell(r, 105));
    const statusAplikasi = parseString(getCell(r, 48)) || parseString(getCell(r, 111));

    let progressTanam = 0;
    if (realSelesaiTanam || (aplikasiTerakhir || '').toLowerCase().includes('selesai tanam')) progressTanam = 100;
    else if (realMulaiTanam || (aplikasiTerakhir || '').toLowerCase().includes('mulai tnm')) progressTanam = 50;
    else if (realBajak || realBkr) progressTanam = 25;

    const rowObj = {
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
      statusAplikasi,
      realBajak,
      realBkr,
      realSn,
      realMulaiTanam,
      realSelesaiTanam,
      progressTanam,
    };

    masterMap.set(key, rowObj);
  }

  console.log(`📋 Total lokasi unik Sheet Master: ${masterMap.size}`);

  // Kosongkan dan isi tabel StokLahanMaster
  await prisma.stokLahanMaster.deleteMany();

  const insertData = [];
  for (const [key, item] of masterMap.entries()) {
    const category = getStokCategory(item);
    insertData.push({
      ...item,
      category,
    });
  }

  // Batch insert
  const BATCH_SIZE = 100;
  for (let i = 0; i < insertData.length; i += BATCH_SIZE) {
    const chunk = insertData.slice(i, i + BATCH_SIZE);
    await prisma.stokLahanMaster.createMany({
      data: chunk,
    });
  }

  console.log(`✅ Berhasil menyimpan ${insertData.length} baris ke tabel StokLahanMaster!`);

  const summary = await prisma.stokLahanMaster.groupBy({
    by: ['category'],
    _count: { id: true },
    _sum: { luasNetto: true },
  });
  console.log('Klasifikasi StokLahanMaster:');
  console.table(summary);

  await prisma.$disconnect();
}

main().catch(console.error);
