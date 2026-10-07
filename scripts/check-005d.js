const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.land.findFirst({ where: { lokasi: '005D' } })
  .then(l => console.log('005D in DB:', {
    lokasi: l.lokasi,
    wilayah: l.wilayah,
    luasBruto: l.luasBruto,
    luasNetto: l.luasNetto,
    status: l.status,
    eks: l.eks,
    sejarah: l.sejarah,
    phBk: l.phBk,
    phSn: l.phSn,
  }))
  .finally(() => prisma.$disconnect());
