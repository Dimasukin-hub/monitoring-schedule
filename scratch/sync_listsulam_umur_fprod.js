const { PrismaClient } = require('d:/monitor_schedule/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Memulai sinkronisasi umurForcing di tabel ListSulam ---');

  // 1. Update ListSulam.umurForcing dan tglFProd dari MasterStatusLokasi
  const updateCountDirect = await prisma.$executeRawUnsafe(`
    UPDATE "ListSulam" ls
    SET 
      "umurForcing" = ms."umurFProd",
      "tglFProd" = COALESCE(ms."forcingGabungan", ms."forcing2027", ms."forcingProd2026", ls."tglFProd"),
      "updatedAt" = NOW()
    FROM "MasterStatusLokasi" ms
    WHERE UPPER(TRIM(ls.lokasi)) = UPPER(TRIM(ms.lokasi))
      AND ms."umurFProd" IS NOT NULL;
  `);
  console.log(`Updated ${updateCountDirect} baris dari MasterStatusLokasi.umurFProd langsung.`);

  // 2. Untuk lokasi yang umurFProd di MasterStatusLokasi null, hitung dari rumus umurFProd: (NOW() - forcingDate) / 30.4
  const updateCountFormula = await prisma.$executeRawUnsafe(`
    UPDATE "ListSulam" ls
    SET 
      "umurForcing" = ROUND((EXTRACT(EPOCH FROM (NOW() - COALESCE(ms."forcingGabungan", ms."forcing2027", ms."forcingProd2026"))) / 86400) / 30.4)::integer,
      "tglFProd" = COALESCE(ms."forcingGabungan", ms."forcing2027", ms."forcingProd2026"),
      "updatedAt" = NOW()
    FROM "MasterStatusLokasi" ms
    WHERE UPPER(TRIM(ls.lokasi)) = UPPER(TRIM(ms.lokasi))
      AND ls."umurForcing" IS NULL
      AND COALESCE(ms."forcingGabungan", ms."forcing2027", ms."forcingProd2026") IS NOT NULL;
  `);
  console.log(`Updated ${updateCountFormula} baris menggunakan kalkulasi rumus tanggal forcing produksi.`);

  // 3. Verifikasi hasil setelah update
  const sampleAfter = await prisma.$queryRawUnsafe(`
    SELECT 
      ls.lokasi,
      ls."umurForcing" as ls_umur_forcing,
      ms."umurFProd" as ms_umur_fprod,
      ls."tglFProd" as ls_tgl_fprod,
      COALESCE(ms."forcingGabungan", ms."forcing2027", ms."forcingProd2026") as ms_forcing_prod_date
    FROM "ListSulam" ls
    JOIN "MasterStatusLokasi" ms ON UPPER(TRIM(ls.lokasi)) = UPPER(TRIM(ms.lokasi))
    ORDER BY ls.lokasi ASC
    LIMIT 15;
  `);
  console.log('\nSample data ListSulam setelah update:');
  console.table(sampleAfter);

  const totalFilled = await prisma.$queryRawUnsafe(`
    SELECT 
      COUNT(*) as total_rows,
      COUNT("umurForcing") as filled_umur_forcing,
      COUNT(*) - COUNT("umurForcing") as null_umur_forcing
    FROM "ListSulam";
  `);
  console.log('\nTotal status ListSulam:', totalFilled);
}

main()
  .catch((e) => {
    console.error('Error saat sinkronisasi:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

