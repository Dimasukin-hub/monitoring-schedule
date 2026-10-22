import { prisma } from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import { recalculateAndPersistStageStocks, syncStokLahanMasterForLand } from '../lib/stageStockCalculator';

async function restoreCandidate(lokasi: string) {
  const backupFile = path.join(__dirname, 'backup_test_candidates.json');
  if (!fs.existsSync(backupFile)) {
    console.error('File backup tidak ditemukan!');
    return;
  }
  const allBackups = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const backup = allBackups[lokasi];
  if (!backup || !backup.land) {
    console.error(`Backup untuk petak ${lokasi} tidak ditemukan!`);
    return;
  }

  const { land } = backup;
  console.log(`Mengembalikan petak ${land.lokasi} (ID: ${land.id})...`);

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

  await recalculateAndPersistStageStocks(land.year || 2026);
  await syncStokLahanMasterForLand(land.id);
  console.log(`Petak ${land.lokasi} berhasil dikembalikan!`);
}

const target = process.argv[2] || '049B';
restoreCandidate(target).finally(() => prisma.$disconnect());
