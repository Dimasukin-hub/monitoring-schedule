const { PrismaClient } = require('d:/sulam_project/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const sample = await prisma.listSulam.findMany({
      take: 10,
      select: { lokasi: true, wilayah: true, spekBibit: true, keteranganProses: true, keteranganMati: true, keteranganRitase: true },
    });
    console.log('ListSulam sample:', sample);

    const distinctSpek = await prisma.listSulam.findMany({
      select: { spekBibit: true },
      distinct: ['spekBibit'],
    });
    console.log('Distinct spekBibit in ListSulam:', distinctSpek);

    const formTikets = await prisma.formTiketOrderSulam.findMany({
      select: { lokasi: true, keterangan: true },
    });
    console.log('FormTiket count & sample:', formTikets.length, formTikets.slice(0, 10));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
