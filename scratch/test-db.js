const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.lokasiOrderGorongGorong.count()
  .then(c => console.log('Local DB count:', c))
  .catch(e => console.log('Local DB error:', e.message))
  .finally(() => prisma.$disconnect());

