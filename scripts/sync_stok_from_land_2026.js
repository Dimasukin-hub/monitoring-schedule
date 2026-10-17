const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
  console.log('=== SINKRONISASI STOK LAHAN MASTER DARI DATA LAHAN (2026) ===');

  const lands2026 = await prisma.land.findMany({ where: { year: 2026 } });
  console.log(`Found ${lands2026.length} Land records with year=2026`);
  const landMap = new Map(lands2026.map((l) => [l.lokasi.toUpperCase(), l]));

  // Also query other lands as fallback for locations like 012D
  const allLands = await prisma.land.findMany();
  const fallbackMap = new Map(allLands.map((l) => [l.lokasi.toUpperCase(), l]));

  const stoks = await prisma.stokLahanMaster.findMany();
  console.log(`Found ${stoks.length} StokLahanMaster records to sync`);

  let updatedCount = 0;
  for (const st of stoks) {
    const key = st.lokasi.toUpperCase();
    const ld = landMap.get(key) || fallbackMap.get(key);

    if (!ld) {
      console.warn(`Warning: Location ${st.lokasi} not found in Land table!`);
      continue;
    }

    const merged = {
      ...st,
      ...ld,
      // Keep real dates if either has them
      realBkr: ld.realBkr || st.realBkr,
      realBajak: ld.realBajak || st.realBajak,
      realSn: ld.realSn || st.realSn,
      realMulaiTanam: ld.realMulaiTanam || st.realMulaiTanam,
      realSelesaiTanam: ld.realSelesaiTanam || st.realSelesaiTanam,
      aplikasiTerakhir: ld.aplikasiTerakhir || st.aplikasiTerakhir,
      statusAplikasi: ld.statusAplikasi || st.statusAplikasi,
      progressTanam: ld.progressTanam !== null && ld.progressTanam !== undefined ? ld.progressTanam : st.progressTanam,
    };

    const newCategory = getStokCategory(merged);

    await prisma.stokLahanMaster.update({
      where: { id: st.id },
      data: {
        wilayah: ld.wilayah,
        luasBruto: ld.luasBruto,
        luasNetto: ld.luasNetto,
        status: ld.status,
        eks: ld.eks,
        sejarah: ld.sejarah,
        aplikasiTerakhir: ld.aplikasiTerakhir || st.aplikasiTerakhir,
        statusAplikasi: ld.statusAplikasi || st.statusAplikasi,
        realBkr: merged.realBkr,
        realBajak: merged.realBajak,
        realSn: merged.realSn,
        realMulaiTanam: merged.realMulaiTanam,
        realSelesaiTanam: merged.realSelesaiTanam,
        progressTanam: merged.progressTanam,
        category: newCategory,
        // phBk and phSn are strictly preserved from StokLahanMaster
      },
    });

    updatedCount++;
  }

  console.log(`Successfully synced ${updatedCount} StokLahanMaster records.`);

  // Print summary by category
  const categories = await prisma.stokLahanMaster.groupBy({
    by: ['category'],
    _count: { lokasi: true },
    _sum: { luasNetto: true },
  });

  console.log('\n--- KATEGORI STOK LAHAN TERBARU ---');
  categories.forEach((c) => {
    console.log(`${c.category}: ${c._count.lokasi} Lokasi, Total Netto: ${(c._sum.luasNetto || 0).toFixed(2)} Ha`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error syncing:', err);
  process.exit(1);
});
