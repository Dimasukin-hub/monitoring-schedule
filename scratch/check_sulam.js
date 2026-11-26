const { PrismaClient } = require('d:/monitor_schedule/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stats = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total_ms,
      COUNT("umurFProd") as with_umur_fprod,
      COUNT("forcingProd2026") as with_fprod26,
      COUNT("forcing2027") as with_f27,
      COUNT("forcingGabungan") as with_fgab
    FROM "MasterStatusLokasi"
  `);
  console.log('MasterStatusLokasi stats:', stats);

  const lsStats = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total_ls,
      COUNT("umurForcing") as with_umur_forcing,
      COUNT(ms."umurFProd") as matched_with_ms_umur_fprod
    FROM "ListSulam" ls
    LEFT JOIN "MasterStatusLokasi" ms ON UPPER(TRIM(ls.lokasi)) = UPPER(TRIM(ms.lokasi))
  `);
  console.log('ListSulam match stats:', lsStats);

  // Cek contoh 10 lokasi di ListSulam dan bagaimana perbandingannya jika diupdate
  const diffs = await prisma.$queryRawUnsafe(`
    SELECT 
      ls.lokasi,
      ls."umurForcing" as current_ls_umur_forcing,
      ms."umurFProd" as ms_umur_fprod,
      ms."forcingProd2026" as ms_fprod26,
      ms."forcing2027" as ms_f27,
      ms."forcingStd" as ms_std
    FROM "ListSulam" ls
    JOIN "MasterStatusLokasi" ms ON UPPER(TRIM(ls.lokasi)) = UPPER(TRIM(ms.lokasi))
    WHERE ls."umurForcing" IS DISTINCT FROM ms."umurFProd"
    LIMIT 10
  `);
  console.log('Differences between current ListSulam.umurForcing and MasterStatusLokasi.umurFProd:');
  console.table(diffs);
}

main().finally(() => prisma.$disconnect());
