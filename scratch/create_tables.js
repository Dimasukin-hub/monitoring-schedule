const { PrismaClient } = require('d:/monitor_schedule/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FormDropSulam" (
      "id" SERIAL PRIMARY KEY,
      "lokasi" TEXT NOT NULL,
      "wilayah" TEXT,
      "tanggal" TIMESTAMP(3),
      "cd" INTEGER NOT NULL DEFAULT 0,
      "fuso" INTEGER NOT NULL DEFAULT 0,
      "kelasBibit" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormDropSulam_lokasi_idx" ON "FormDropSulam" ("lokasi");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormDropSulam_wilayah_idx" ON "FormDropSulam" ("wilayah");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormDropSulam_tanggal_idx" ON "FormDropSulam" ("tanggal");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "FormRealisasiSulam" (
      "id" SERIAL PRIMARY KEY,
      "lokasi" TEXT NOT NULL,
      "wilayah" TEXT,
      "tanggal" TIMESTAMP(3),
      "jumlahTk" INTEGER NOT NULL DEFAULT 0,
      "jumlahBibit" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormRealisasiSulam_lokasi_idx" ON "FormRealisasiSulam" ("lokasi");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormRealisasiSulam_wilayah_idx" ON "FormRealisasiSulam" ("wilayah");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "FormRealisasiSulam_tanggal_idx" ON "FormRealisasiSulam" ("tanggal");
  `);
  console.log('Tables FormDropSulam & FormRealisasiSulam created successfully in PostgreSQL!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
