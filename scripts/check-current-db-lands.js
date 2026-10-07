const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.land.count();
  console.log('Total lands in DB:', count);

  const sample = await prisma.land.findMany({
    take: 5,
    select: {
      id: true,
      lokasi: true,
      wilayah: true,
      luasBruto: true,
      luasNetto: true,
      status: true,
      eks: true,
      sejarah: true,
      phBk: true,
      phSn: true,
    }
  });
  console.log('Sample lands:', sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
