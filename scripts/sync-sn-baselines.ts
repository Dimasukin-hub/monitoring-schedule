import { prisma } from '../lib/prisma';
import { recalculateAndPersistStageStocks, syncStokLahanMasterForLand } from '../lib/stageStockCalculator';

async function main() {
  const lands = await prisma.land.findMany({ where: { year: 2026 } });
  console.log(`Found ${lands.length} lands for 2026.`);

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  let updatedCount = 0;

  for (const l of lands) {
    const d = (l.aplikasiDetails as any) || {};
    const effectiveSn =
      (d.realSiapTanam && d.realSiapTanam !== '-' && d.realSiapTanam !== '0')
        ? d.realSiapTanam
        : (d.realJalanSal && d.realJalanSal !== '-' && d.realJalanSal !== '0')
        ? d.realJalanSal
        : null;

    if (effectiveSn) {
      const parts = String(effectiveSn).trim().split('/');
      if (parts.length === 3) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const yr = parts[2].slice(-2);
        if (mIdx >= 0 && mIdx < 12) {
          const expectedBulan = `${MONTH_NAMES[mIdx]}-${yr}`;
          if (l.bulanSn !== expectedBulan) {
            await prisma.land.update({
              where: { id: l.id },
              data: { bulanSn: expectedBulan },
            });
            updatedCount++;
            console.log(`Updated bulanSn for ${l.lokasi}: was '${l.bulanSn}' -> now '${expectedBulan}' (effectiveSn: ${effectiveSn})`);
          }
        }
      }
    }
  }

  console.log(`Updated bulanSn for ${updatedCount} lands.`);

  console.log('Recalculating StageStockSummary for 2026...');
  const summaries = await recalculateAndPersistStageStocks(2026);
  console.log(`Successfully recalculated ${summaries.length} months of StageStockSummary.`);

  console.log('Syncing StokLahanMaster categories for all lands...');
  for (const l of lands) {
    await syncStokLahanMasterForLand(l.id);
  }
  console.log('StokLahanMaster sync completed.');

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
