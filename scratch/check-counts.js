const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const [drops, manuals, saps] = await Promise.all([
    prisma.masterDataDropGorongGorong.count(),
    prisma.masterDataPasangManual.count(),
    prisma.masterSapGorongGorong.count(),
  ]);
  console.log({ drops, manuals, saps });
}

check().catch(console.error).finally(() => prisma.$disconnect());

