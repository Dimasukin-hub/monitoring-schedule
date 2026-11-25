const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function revert() {
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['088D2', '088D3', '049F', '018C', '030H', '017B1', '054A', '092D', '047F1'] } },
    data: { statusD40: 'Close', statusAll: 'Close', isClosedExcel: true }
  });

  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['010C1', '028A'] } },
    data: { statusD40: 'Open', statusAll: 'Open', isClosedExcel: false }
  });

  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['078B', '077A', '078J'] } },
    data: { statusD40: 'Open', statusAll: 'Open', isClosedExcel: false }
  });

  console.log('Revert executed!');
}

revert().catch(console.error).finally(() => prisma.$disconnect());

