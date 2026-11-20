const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupTkVerifikator() {
  console.log('--- Memulai Pembersihan TK Verifikator FE ---');

  // 1. Cari transaksi yang diinput oleh TK Verifikator
  const feTrx = await prisma.transaksiGorongGorong.findMany({
    where: {
      OR: [
        { userRole: { in: ['USER_FE', 'user_fe', 'TK_VERIFIKATOR_FE', 'tk_verifikator_fe'] } },
        { createdBy: { contains: 'Verifikator', mode: 'insensitive' } },
        { createdBy: { contains: 'User FE', mode: 'insensitive' } },
      ],
    },
  });

  console.log(`Ditemukan ${feTrx.length} transaksi dari TK Verifikator FE.`);

  for (const trx of feTrx) {
    console.log(`Membersihkan transaksi ID: ${trx.id}, Jenis: ${trx.jenisTransaksi}, Lokasi: ${trx.lokasi}`);

    // Hapus/revert Master Data
    if (trx.jenisTransaksi === 'ORDER') {
      await prisma.masterDataOrderGorongGorong.deleteMany({
        where: { OR: [{ transaksiId: trx.id }, { lokasi: trx.lokasi, diameter40: trx.qtyD40 || 0 }] },
      });
      // Revert LokasiOrderGorongGorong
      const lOrder = await prisma.lokasiOrderGorongGorong.findUnique({ where: { lokasi: trx.lokasi } });
      if (lOrder) {
        await prisma.lokasiOrderGorongGorong.update({
          where: { lokasi: trx.lokasi },
          data: {
            orderD40: Math.max(0, (lOrder.orderD40 || 0) - (trx.qtyD40 || 0)),
            orderD60: Math.max(0, (lOrder.orderD60 || 0) - (trx.qtyD60 || 0)),
            orderD80: Math.max(0, (lOrder.orderD80 || 0) - (trx.qtyD80 || 0)),
            orderD100: Math.max(0, (lOrder.orderD100 || 0) - (trx.qtyD100 || 0)),
          },
        });
      }
    } else if (trx.jenisTransaksi === 'DROP') {
      await prisma.masterDataDropGorongGorong.deleteMany({
        where: { OR: [{ transaksiId: trx.id }, { lokasi: trx.lokasi, diameter40: trx.qtyD40 || 0 }] },
      });
      if (trx.lokasiAsal) {
        await prisma.masterDataPindahGorongGorong.deleteMany({
          where: { OR: [{ transaksiId: trx.id }, { lokasiPengirim: trx.lokasiAsal, lokasiPenerima: trx.lokasi }] },
        });
      }
      // Revert LokasiOrderGorongGorong
      const lOrder = await prisma.lokasiOrderGorongGorong.findUnique({ where: { lokasi: trx.lokasi } });
      if (lOrder) {
        await prisma.lokasiOrderGorongGorong.update({
          where: { lokasi: trx.lokasi },
          data: {
            dropD40: Math.max(0, (lOrder.dropD40 || 0) - (trx.qtyD40 || 0)),
            dropD60: Math.max(0, (lOrder.dropD60 || 0) - (trx.qtyD60 || 0)),
            dropD80: Math.max(0, (lOrder.dropD80 || 0) - (trx.qtyD80 || 0)),
            dropD100: Math.max(0, (lOrder.dropD100 || 0) - (trx.qtyD100 || 0)),
          },
        });
      }
    } else if (trx.jenisTransaksi === 'PASANG_MANUAL') {
      await prisma.masterDataPasangManual.deleteMany({
        where: { OR: [{ transaksiId: trx.id }, { lokasi: trx.lokasi, diameter40: trx.qtyD40 || 0 }] },
      });
      // Revert LokasiOrderGorongGorong
      const lOrder = await prisma.lokasiOrderGorongGorong.findUnique({ where: { lokasi: trx.lokasi } });
      if (lOrder) {
        await prisma.lokasiOrderGorongGorong.update({
          where: { lokasi: trx.lokasi },
          data: {
            pasangManD40: Math.max(0, (lOrder.pasangManD40 || 0) - (trx.qtyD40 || 0)),
            pasangManD60: Math.max(0, (lOrder.pasangManD60 || 0) - (trx.qtyD60 || 0)),
            pasangManD80: Math.max(0, (lOrder.pasangManD80 || 0) - (trx.qtyD80 || 0)),
            pasangManD100: Math.max(0, (lOrder.pasangManD100 || 0) - (trx.qtyD100 || 0)),
          },
        });
      }
    }

    // Hapus baris transaksi itu sendiri
    await prisma.transaksiGorongGorong.delete({ where: { id: trx.id } });
  }

  // 2. Hapus akun pengguna TK Verifikator FE
  const delUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { role: 'user_fe' },
        { email: 'fe' },
        { name: { contains: 'Verifikator', mode: 'insensitive' } },
      ],
    },
  });
  console.log(`Berhasil menghapus ${delUsers.count} akun pengguna TK Verifikator FE dari database.`);

  console.log('--- Pembersihan Selesai Sukses! ---');
}

cleanupTkVerifikator()
  .catch((e) => console.error('Error saat pembersihan:', e))
  .finally(() => prisma.$disconnect());
