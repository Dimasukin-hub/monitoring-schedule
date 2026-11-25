const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery() {
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['078A', '029A2', '029A3', '042B3', '020C', '002B2', '089D1', '086D', '004B', '089A', '050B2B'] } },
    data: { statusD40: '-', statusAll: 'Open', isClosedExcel: false }
  });

  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['078B', '077A', '078E2', '078J', '010C1', '028A'] } },
    data: { statusD40: 'Close', statusAll: 'Close', isClosedExcel: true }
  });

  console.log('Test query applied locally.');
}

testQuery().catch(console.error).finally(() => prisma.$disconnect());
