const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lok = '057C';
  const apply = process.argv.includes('--apply');

  const [orders, drops, pindahs, manuals, saps, trxs, lokOrder] = await Promise.all([
    prisma.masterDataOrderGorongGorong.findMany({ where: { lokasi: lok } }),
    prisma.masterDataDropGorongGorong.findMany({
      where: { lokasi: lok },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    }),
    prisma.masterDataPindahGorongGorong.findMany({
      where: { OR: [{ lokasiPengirim: lok }, { lokasiPenerima: lok }] },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    }),
    prisma.masterDataPasangManual.findMany({ where: { lokasi: lok } }),
    prisma.masterSapGorongGorong.findMany({
      where: { OR: [{ lokasi: lok }, { referensiLokasi: lok }] },
    }),
    prisma.transaksiGorongGorong.findMany({
      where: { OR: [{ lokasi: lok }, { lokasiAsal: lok }] },
    }),
    prisma.lokasiOrderGorongGorong.findUnique({ where: { lokasi: lok } }),
  ]);

  const sum = (arr, key) => arr.reduce((acc, it) => acc + (it[key] || 0), 0);
  const orderD40 = sum(orders, 'diameter40');
  const dropD40 = sum(drops, 'diameter40');
  const pindahNetD40 = pindahs.reduce((acc, p) => {
    let delta = 0;
    if ((p.lokasiPengirim || '').trim().toUpperCase() === lok) delta -= p.diameter40 || 0;
    if ((p.lokasiPenerima || '').trim().toUpperCase() === lok) delta += p.diameter40 || 0;
    return acc + delta;
  }, 0);
  const manualD40 = sum(manuals, 'diameter40');
  const sapD40 = saps.filter((s) => s.diameter === 40).reduce((acc, s) => acc + (s.qty || 0), 0);

  console.log('=== DATA LOKASI 057C SAAT INI ===');
  console.log({
    orderD40,
    dropD40,
    pindahNetD40,
    manualD40,
    sapD40,
    lokasiOrderDropD40: lokOrder?.dropD40,
    lokasiOrderPindahD40: lokOrder?.pindahD40,
    dropsRows: drops.map((d) => ({ id: d.id, transaksiId: d.transaksiId, tgl: d.tanggal, d40: d.diameter40 })),
    pindahRows: pindahs.map((p) => ({
      id: p.id,
      transaksiId: p.transaksiId,
      pengirim: p.lokasiPengirim,
      penerima: p.lokasiPenerima,
      d40: p.diameter40,
    })),
    trxRows: trxs.map((t) => ({
      id: t.id,
      jenis: t.jenisTransaksi,
      asal: t.lokasiAsal,
      lokasi: t.lokasi,
      d40: t.qtyD40,
    })),
  });

  if (!apply) {
    console.log('\nMode cek saja. Jalankan dengan flag --apply untuk menyesuaikan Drop 057C (37 -> 35).');
    return;
  }

  if (dropD40 === 35 && pindahNetD40 === -2) {
    console.log('\nData 057C sudah sesuai (Drop D40 = 35, Pindah = -2). Tidak ada perubahan.');
    return;
  }

  if (dropD40 === 37 && pindahNetD40 === -2) {
    const targetDropRow = drops.find((d) => (d.diameter40 || 0) >= 2);
    if (!targetDropRow) {
      console.log('\nTidak ditemukan baris MasterDataDropGorongGorong dengan diameter40 >= 2 untuk dipotong.');
      return;
    }

    await prisma.masterDataDropGorongGorong.update({
      where: { id: targetDropRow.id },
      data: { diameter40: (targetDropRow.diameter40 || 0) - 2 },
    });

    if (lokOrder) {
      await prisma.lokasiOrderGorongGorong.update({
        where: { lokasi: lok },
        data: { dropD40: 35, pindahD40: -2 },
      });
    }

    console.log(
      `\nBerhasil menyesuaikan baris drop id=${targetDropRow.id} dari ${targetDropRow.diameter40} menjadi ${
        targetDropRow.diameter40 - 2
      }. Total Drop D40 sekarang = 35 (Saldo = ${35 - Math.max(manualD40, sapD40)}).`
    );
  } else {
    console.log('\nKondisi 057C bukan (dropD40=37, pindahNetD40=-2), sehingga tidak diubah otomatis.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
