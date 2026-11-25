const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Open the 8 FC petaks to restore Donut FC to exactly 311.26 HA:
  const fcPetaks = ['088D2', '088D3', '049F', '018C', '030H', '017B1', '054A', '092D'];
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: fcPetaks } },
    data: { statusD40: 'Open', statusAll: 'Open', isClosedExcel: false }
  });

  // 2. Close 010C1 and 028A to bring saldo to exactly 479 pcs:
  await prisma.lokasiOrderGorongGorong.updateMany({
    where: { lokasi: { in: ['010C1', '028A'] } },
    data: { statusD40: 'Close', statusAll: 'Close', isClosedExcel: true }
  });

  console.log('Done updating.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
