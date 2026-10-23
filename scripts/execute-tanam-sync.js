const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function main() {
  console.log('🔄 Memulai sinkronisasi dan normalisasi data Tanam...');

  // 1. Ambil seluruh data Planting
  const plantings = await prisma.planting.findMany({
    orderBy: { id: 'asc' }
  });
  console.log(`Ditemukan ${plantings.length} baris di tabel Planting.`);

  let fixedSisaCount = 0;
  let syncedStokCount = 0;
  let syncedLandCount = 0;

  for (const p of plantings) {
    const luas = p.luas || 0;
    const real = p.realTanam || 0;
    let progress = luas > 0 ? Number(((real / luas) * 100).toFixed(1)) : 0;

    // Tentukan status yang konsisten
    let status = p.status || 'PROSES';
    if (progress >= 100 || (luas > 0 && real >= luas) || (Math.abs(real - luas) <= 0.05 && real > 0)) {
      status = 'SELESAI';
      progress = 100;
    } else if (progress > 95) {
      status = 'CEK SELESAI';
    } else if (real > 0 || progress > 0) {
      status = 'PROSES';
    } else {
      status = 'BELUM TANAM';
    }

    const correctSisa = status === 'SELESAI' ? 0 : Math.max(0, Number((luas - real).toFixed(2)));

    // Normalisasi data Planting di DB jika ada perbedaan
    if (p.sisa !== correctSisa || p.status !== status || p.progress !== progress) {
      await prisma.planting.update({
        where: { id: p.id },
        data: {
          sisa: correctSisa,
          status: status,
          progress: progress,
        }
      });
      fixedSisaCount++;
    }

    // Tentukan label untuk StokLahanMaster & Land
    const isSelesai = status === 'SELESAI';
    const isCekSelesai = status === 'CEK SELESAI';
    const isProses = status === 'PROSES' || isCekSelesai;
    const category = isSelesai ? 'SELESAI' : (isProses ? 'PROSES' : undefined);
    const aplikasiTerakhir = isSelesai
      ? 'Selesai Tanam'
      : isCekSelesai
      ? 'Cek Selesai'
      : 'Proses Tanam';
    const statusAplikasi = isSelesai
      ? '24.Sls Tanam'
      : isCekSelesai
      ? 'Cek Selesai'
      : '23.Proses Tnm';

    // Sinkronisasi ke StokLahanMaster
    const cleanLokasi = p.lokasi.trim();
    const existingStok = await prisma.stokLahanMaster.findFirst({
      where: { lokasi: cleanLokasi }
    });

    if (existingStok) {
      const updateData = {
        progressTanam: progress,
        aplikasiTerakhir,
        statusAplikasi,
      };
      if (category) {
        updateData.category = category;
      }
      if (p.awalTanam && !existingStok.realMulaiTanam) {
        updateData.realMulaiTanam = p.awalTanam;
      }
      if (isSelesai && (p.estSelesai || p.awalTanam)) {
        updateData.realSelesaiTanam = p.estSelesai || p.awalTanam;
      }

      await prisma.stokLahanMaster.update({
        where: { id: existingStok.id },
        data: updateData,
      });
      syncedStokCount++;
    }

    // Sinkronisasi ke Land
    const existingLand = await prisma.land.findFirst({
      where: { lokasi: cleanLokasi }
    });

    if (existingLand) {
      const landUpdate = {
        progressTanam: progress,
        aplikasiTerakhir,
        statusAplikasi,
      };
      if (p.awalTanam && !existingLand.realMulaiTanam) {
        landUpdate.realMulaiTanam = p.awalTanam;
      }
      if (isSelesai && (p.estSelesai || p.awalTanam)) {
        landUpdate.realSelesaiTanam = p.estSelesai || p.awalTanam;
      }

      await prisma.land.update({
        where: { id: existingLand.id },
        data: landUpdate,
      });
      syncedLandCount++;
    }
  }

  console.log(`✅ Berhasil menormalkan ${fixedSisaCount} baris sisa di tabel Planting.`);
  console.log(`✅ Berhasil menyinkronkan ${syncedStokCount} lokasi ke StokLahanMaster.`);
  console.log(`✅ Berhasil menyinkronkan ${syncedLandCount} lokasi ke tabel Land.`);

  // 2. Refresh listLokasiProsesTanam.json dan listLokasiSelesaiTanam.json
  const [allUpdatedPlantings, lands] = await Promise.all([
    prisma.planting.findMany({ orderBy: { id: 'asc' } }),
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

  const landMap = {};
  lands.forEach(l => {
    if (l.lokasi) landMap[l.lokasi.trim().toUpperCase()] = l;
  });

  const prosesPlantings = allUpdatedPlantings.filter(
    p => p.status === 'PROSES' || p.status === 'CEK SELESAI' || (p.progress > 0 && p.progress < 100)
  );

  const prosesList = prosesPlantings.map(p => {
    const ld = landMap[p.lokasi.trim().toUpperCase()];
    const w = ld ? normalizeWilayah(ld.wilayah) : 'W01';
    const jenis = p.jenisBibit || ld?.jenisBibit || 'Crown';
    const kelas = p.kelasBibit || ld?.kelasBibit || '';
    const bibitFormatted = kelas ? `${jenis} (${kelas})` : jenis;
    const luas = p.luas || ld?.luasNetto || 0;
    const real = p.realTanam || 0;
    const sisa = p.status === 'SELESAI' ? 0 : Math.max(0, Number((luas - real).toFixed(2)));

    return {
      wilayah: w,
      lokasi: p.lokasi,
      jenisBibit: jenis,
      kelasBibit: kelas,
      bibit: bibitFormatted,
      progress: p.progress ?? 0,
      realTanam: Number(real.toFixed(2)),
      luasHa: Number(luas.toFixed(2)),
      sisaHa: sisa,
      estSelesai: p.estSelesai || '-',
      status: p.status || (p.progress > 95 ? 'CEK SELESAI' : 'PROSES'),
    };
  });

  prosesList.sort((a, b) => b.progress - a.progress);

  const prosesPath = path.join(process.cwd(), 'lib/listLokasiProsesTanam.json');
  fs.writeFileSync(prosesPath, JSON.stringify(prosesList, null, 2));
  console.log(`✅ Berhasil memperbarui ${prosesPath} dengan ${prosesList.length} lokasi proses.`);

  console.log('🎉 Selesai!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
