const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function main() {
  const land = await prisma.land.findFirst({
    where: { lokasi: '003D', wilayah: 'W01', year: 2026 },
    include: { activities: true },
  });

  const stokMaster = await prisma.stokLahanMaster.findFirst({
    where: { lokasi: '003D', wilayah: 'W01' },
  });

  if (!land) {
    console.error('Petak 003D tidak ditemukan!');
    return;
  }

  const backupData = {
    land,
    stokMaster,
  };

  const backupPath = path.join(__dirname, 'backup_petak_003d.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log('Backup 003D berhasil dibuat di:', backupPath);
  console.log('Data awal 003D:');
  console.log({
    id: land.id,
    lokasi: land.lokasi,
    wilayah: land.wilayah,
    year: land.year,
    luasNetto: land.luasNetto,
    category: stokMaster?.category,
    aplikasiTerakhir: land.aplikasiTerakhir,
    realBkr: land.realBkr,
    rencBkr: land.rencBkr,
    realBajak: land.realBajak,
    rencBajak: land.rencBajak,
    bulanSn: land.bulanSn,
  });
}

main().finally(() => prisma.$disconnect());
