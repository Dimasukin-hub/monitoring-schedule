const path = require('path');
const fs = require('fs');
const { PrismaClient } = require(path.join(process.cwd(), 'node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  console.log('Generating listLokasiSelesaiTanam.json and listLokasiProsesTanam.json...');

  const [chartsRes, plantings, lands] = await Promise.all([
    fetch('http://localhost:3000/api/dashboard/charts').then(r => r.json()),
    prisma.planting.findMany({
      orderBy: { id: 'asc' }
    }),
    prisma.land.findMany({
      select: {
        lokasi: true,
        wilayah: true,
        jenisBibit: true,
        kelasBibit: true,
        luasNetto: true,
      }
    })
  ]);

  const plantingMap = {};
  plantings.forEach(p => {
    plantingMap[p.lokasi] = p;
  });

  const landMap = {};
  lands.forEach(l => {
    landMap[l.lokasi] = l;
  });

  const normalizeWilayah = (rawW) => {
    if (!rawW) return 'W01';
    const clean = rawW.trim().toUpperCase();
    if (clean === 'ARS1') return 'W07';
    if (clean === 'SAG1' || clean === 'MD2') return 'W04';
    if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
    if (clean.startsWith('AW')) {
      const num = clean.slice(2);
      return num.length === 1 ? `W0${num}` : `W${num}`;
    }
    return clean;
  };

  // 1. Selesai Tanam Table Data (from charts.wilayahPositions.selesaiLocations)
  const wp = chartsRes.data?.wilayahPositions || [];
  const selesaiList = [];

  wp.forEach(w => {
    (w.selesaiLocations || []).forEach(loc => {
      const pl = plantingMap[loc];
      const ld = landMap[loc];

      const jenis = pl?.jenisBibit || ld?.jenisBibit || 'Crown';
      const kelas = pl?.kelasBibit || ld?.kelasBibit || '';
      const bibitFormatted = kelas ? `${jenis} (${kelas})` : jenis;

      selesaiList.push({
        wilayah: w.wilayah,
        lokasi: loc,
        jenisBibit: jenis,
        kelasBibit: kelas,
        bibit: bibitFormatted,
        tanggalSelesai: pl?.estSelesai && pl.estSelesai !== '-' ? pl.estSelesai : (pl?.awalTanam || '-'),
        luasHa: pl?.luas || ld?.luasNetto || 0,
        progress: pl?.progress ?? 100,
      });
    });
  });

  // Sort selesaiList by Wilayah asc, then Lokasi asc
  selesaiList.sort((a, b) => {
    const wCmp = a.wilayah.localeCompare(b.wilayah, undefined, { numeric: true });
    if (wCmp !== 0) return wCmp;
    return a.lokasi.localeCompare(b.lokasi, undefined, { numeric: true });
  });

  // 2. Proses Tanam Table Data (from sub menu Real Tanam Nanas where status === 'PROSES' or 0 < progress < 100)
  const prosesPlantings = plantings.filter(p => p.status === 'PROSES' || (p.progress > 0 && p.progress < 100));
  const prosesList = prosesPlantings.map(p => {
    const ld = landMap[p.lokasi];
    const w = ld ? normalizeWilayah(ld.wilayah) : 'W01';
    const jenis = p.jenisBibit || ld?.jenisBibit || 'Crown';
    const kelas = p.kelasBibit || ld?.kelasBibit || '';
    const bibitFormatted = kelas ? `${jenis} (${kelas})` : jenis;

    return {
      wilayah: w,
      lokasi: p.lokasi,
      jenisBibit: jenis,
      kelasBibit: kelas,
      bibit: bibitFormatted,
      progress: p.progress ?? 0,
      realTanam: p.realTanam || 0,
      luasHa: p.luas || ld?.luasNetto || 0,
      sisaHa: p.sisa || 0,
      estSelesai: p.estSelesai || '-',
      status: p.status || 'PROSES',
    };
  });

  // Sort prosesList by Progress desc (highest progress first), or Wilayah
  prosesList.sort((a, b) => {
    return b.progress - a.progress;
  });

  console.log(`Generated ${selesaiList.length} selesai locations and ${prosesList.length} proses locations.`);

  const selesaiPath = path.join(process.cwd(), 'lib/listLokasiSelesaiTanam.json');
  fs.writeFileSync(selesaiPath, JSON.stringify(selesaiList, null, 2));
  console.log(`Saved ${selesaiPath}`);

  const prosesPath = path.join(process.cwd(), 'lib/listLokasiProsesTanam.json');
  fs.writeFileSync(prosesPath, JSON.stringify(prosesList, null, 2));
  console.log(`Saved ${prosesPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
