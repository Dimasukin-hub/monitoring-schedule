import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { recalculateAndPersistStageStocks, syncStokLahanMasterForLand } from '../lib/stageStockCalculator';

async function restore() {
  const backupPath = path.join(__dirname, 'backup_petak_003d.json');
  if (!fs.existsSync(backupPath)) {
    console.error('File backup tidak ditemukan di:', backupPath);
    return;
  }

  const { land } = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log(`Mengembalikan petak ${land.lokasi} (ID: ${land.id}) ke kondisi semula...`);

  // 1. Restore Land
  await prisma.land.update({
    where: { id: land.id },
    data: {
      aplikasiTerakhir: land.aplikasiTerakhir,
      realBajak: land.realBajak,
      rencBajak: land.rencBajak,
      realBkr: land.realBkr,
      rencBkr: land.rencBkr,
      bulanSn: land.bulanSn,
      statusAplikasi: land.statusAplikasi,
      aplikasiDetails: land.aplikasiDetails,
    },
  });

  // 2. Restore Activities
  if (land.activities && Array.isArray(land.activities)) {
    for (const act of land.activities) {
      const existing = await prisma.landActivity.findFirst({
        where: { landId: land.id, code: act.code },
      });
      if (existing) {
        await prisma.landActivity.update({
          where: { id: existing.id },
          data: {
            rencanaDate: act.rencanaDate,
            realisasiDate: act.realisasiDate,
            status: act.status,
          },
        });
      }
    }
  }

  // 3. Recalculate Stocks & Sync
  await recalculateAndPersistStageStocks(land.year || 2026);
  await syncStokLahanMasterForLand(land.id);

  console.log(`Petak ${land.lokasi} berhasil dikembalikan ke kondisi semula!`);
}

restore()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
