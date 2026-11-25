const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  const list = ['050B2B', '004B', '086D', '069A', '084H', '097B', '100C'];
  const rows = await prisma.lokasiOrderGorongGorong.findMany({
    where: { lokasi: { in: list } }
  });
  console.table(rows.map(r => ({
    lokasi: r.lokasi,
    wilayah: r.wilayah,
    luas: r.luas,
    stTanaman: r.statusTanaman,
    yr: r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026',
    stD40: r.statusD40,
    stAll: r.statusAll,
    isClosedExcel: r.isClosedExcel,
    drp40: r.dropD40,
    psap40: r.pasangSapD40
  })));
}

inspect().catch(console.error).finally(() => prisma.$disconnect());

