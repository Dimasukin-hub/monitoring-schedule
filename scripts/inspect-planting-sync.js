const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plantings = await prisma.planting.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('Total plantings:', plantings.length);
  const prosesPlantings = plantings.filter(p => p.status === 'PROSES' || p.status === 'CEK SELESAI' || (p.progress > 0 && p.progress < 100));
  console.log('Proses/Cek Selesai count in Planting:', prosesPlantings.length);
  prosesPlantings.forEach(p => {
    console.log(`Lokasi: ${p.lokasi}, Luas: ${p.luas}, Real: ${p.realTanam}, Sisa: ${p.sisa}, Progress: ${p.progress}%, Status: ${p.status}`);
  });

  const stokProses = await prisma.stokLahanMaster.findMany({
    where: { category: 'PROSES' },
    orderBy: { lokasi: 'asc' }
  });
  console.log('\nStokLahanMaster category=PROSES count:', stokProses.length);
  stokProses.forEach(s => {
    console.log(`Lokasi: ${s.lokasi}, Wil: ${s.wilayah}, Netto: ${s.luasNetto}, progressTanam: ${s.progressTanam}, statusAplikasi: ${s.statusAplikasi}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
