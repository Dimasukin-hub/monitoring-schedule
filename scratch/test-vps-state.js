const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const rows = await prisma.lokasiOrderGorongGorong.findMany({});
  
  // Apply the update that was run on VPS:
  // 1. UPDATE WHERE IN ('050B2B', '004B', '086D', '069A', '084H', '097B', '100C') -> statusD40 = '-', statusAll = '-', isClosedExcel = false
  // 2. UPDATE WHERE IN ('044A2', '089C', '078M') -> statusD40 = 'Close', statusAll = 'Close', isClosedExcel = true
  // Let's do that in DB first:
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['050B2B', '004B', '086D', '069A', '084H', '097B', '100C'] } },
    data: { statusD40: '-', statusAll: '-', isClosedExcel: false }
  });
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['044A2', '089C', '078M'] } },
    data: { statusD40: 'Close', statusAll: 'Close', isClosedExcel: true }
  });

  const updatedRows = await prisma.lokasiOrderGorongGorong.findMany({});
  console.log('Total rows:', updatedRows.length);
}

run().catch(console.error).finally(() => prisma.$disconnect());

