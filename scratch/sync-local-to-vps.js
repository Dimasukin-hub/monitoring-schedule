const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  const raw = fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8');
  const snap = JSON.parse(raw);
  const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

  await prisma.lokasiOrderGorongGorong.deleteMany({});
  for (let i = 0; i < items.length; i += 50) {
    await prisma.lokasiOrderGorongGorong.createMany({ data: items.slice(i, i + 50), skipDuplicates: true });
  }

  // 1. Initial VPS restore_final updates:
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['078A', '029A2', '029A3', '042B3', '020C', '002B2', '089D1'] } },
    data: { statusD40: 'Close' }
  });

  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['050B2B', '004B', '089A', '086D'] } },
    data: { statusD40: '-', statusAll: '-' }
  });

  // Ensure the 2 drops from today are in transaksiGorongGorong
  const exist013F = await prisma.transaksiGorongGorong.findFirst({ where: { lokasi: '013F', jenisTransaksi: 'DROP' } });
  if (!exist013F) {
    await prisma.transaksiGorongGorong.create({
      data: {
        lokasi: '013F',
        wilayah: 'AW02',
        jenisTransaksi: 'DROP',
        qtyD40: 9,
        qtyD60: 0,
        qtyD80: 0,
        qtyD100: 0,
        tanggal: new Date('2026-11-24T00:00:00Z'),
        createdBy: 'Edi'
      }
    });
  }

  const exist024B = await prisma.transaksiGorongGorong.findFirst({ where: { lokasi: '024B', jenisTransaksi: 'DROP' } });
  if (!exist024B) {
    await prisma.transaksiGorongGorong.create({
      data: {
        lokasi: '024B',
        wilayah: 'AW02',
        jenisTransaksi: 'DROP',
        qtyD40: 39,
        qtyD60: 0,
        qtyD80: 0,
        qtyD100: 0,
        tanggal: new Date('2026-11-24T00:00:00Z'),
        createdBy: 'Edi'
      }
    });
  }

  console.log('Local DB successfully synced to VPS state!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
