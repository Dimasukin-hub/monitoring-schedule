const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const originalDetails = {
    eks: 'PS',
    sejarah: 'PS',
    phBk: 5.54,
    phSn: null,
    cuttingBanana: '29/10/2022',
    realCuttingBanana: '29/10/2022',
    dpCross: '09/12/2022',
    belerang: '09/12/2022',
    rencAwalMb5Btr: '29/11/2022',
    mph: '29/11/2022',
    realBkr: '29/10/2022',
    realBajak: '29/11/2022',
    realDp1: '14/11/2022',
    realRotaryFh1: '12/12/2022',
    realRidger: '16/12/2022',
    realJalanSal: '19/12/2022',
    realSiapTanam: '06/01/2023',
    realMulaiTanam: '07/01/2023',
    realSelesaiTanam: '31/01/2023',
    rencanaBero: null,
    chopper: null,
    realChopper: null,
    chopperLu: null,
    realChopperLu: null,
    rh1: null,
    realRh1: null,
    dolomit: null,
    realDolomit: null,
    bajakAwalMb5Btr: null,
    realBajakAwalMb5Btr: null,
    subsoilerSs1: null,
    realSubsoilerSs1: null,
    finishingRotaryFh1: null,
    ridger: null,
    jalanSal: null,
  };

  await prisma.land.update({
    where: { id: 8270 },
    data: {
      wilayah: 'W01',
      lokasi: '001A',
      luasBruto: 7.50,
      luasNetto: 5.86,
      status: 'NSFC2302',
      eks: 'PS',
      sejarah: 'PS',
      phBk: 5.54,
      phSn: null,
      bulanSn: '122022',
      bulanTanam: '122022',
      rencBkr: null,
      realBkr: '29/10/2022',
      rencBajak: null,
      realBajak: '29/11/2022',
      rencMulaiTanam: null,
      realMulaiTanam: '07/01/2023',
      rencSelesaiTanam: '31/01/2023',
      realSelesaiTanam: '31/01/2023',
      hariWaktu: 20,
      progressTanam: 100,
      statusProduksi: 'Selesai tanam',
      aplikasiTerakhir: 'Selesai tanam',
      aplikasiDetails: originalDetails,
    },
  });

  const actCodesToClearRenc = [
    '01.CHOPPER',
    '02.CHOPPER_LU',
    '03.RH1',
    '05.DOLOMIT',
    '11.BAJAK_AWAL',
    '17.SUBSOILER',
    '19.FINISHING_ROTARY',
    '21.RIDGER',
    '22.JALAN_SAL',
  ];

  for (const code of actCodesToClearRenc) {
    await prisma.landActivity.updateMany({
      where: { landId: 8270, code },
      data: { rencanaDate: null },
    });
  }

  // Set exact real/rencana dates for activities as in Excel row 935
  const exactActivities = [
    { code: '01.CHOPPER', renc: null, real: null, status: 'PENDING' },
    { code: '02.CHOPPER_LU', renc: null, real: null, status: 'PENDING' },
    { code: '03.RH1', renc: null, real: null, status: 'PENDING' },
    { code: '04.CUTTING_BANANA', renc: '29/10/2022', real: '29/10/2022', status: 'COMPLETED' },
    { code: '05.DOLOMIT', renc: null, real: null, status: 'PENDING' },
    { code: '06.DP1', renc: null, real: '14/11/2022', status: 'COMPLETED' },
    { code: '07.DP_CROSS', renc: '09/12/2022', real: null, status: 'IN_PROGRESS' },
    { code: '08.DP2', renc: null, real: null, status: 'PENDING' },
    { code: '09.BELERANG', renc: '09/12/2022', real: null, status: 'IN_PROGRESS' },
    { code: '10.KOMPOS', renc: null, real: null, status: 'PENDING' },
    { code: '11.BAJAK_AWAL', renc: null, real: '29/11/2022', status: 'COMPLETED' },
    { code: '17.SUBSOILER', renc: null, real: null, status: 'PENDING' },
    { code: '19.FINISHING_ROTARY', renc: null, real: '12/12/2022', status: 'COMPLETED' },
    { code: '21.RIDGER', renc: null, real: '16/12/2022', status: 'COMPLETED' },
    { code: '22.JALAN_SAL', renc: null, real: '19/12/2022', status: 'COMPLETED' },
    { code: '22.SIAP_TANAM', renc: null, real: '06/01/2023', status: 'COMPLETED' },
    { code: '23.PROSES_TNM', renc: null, real: '07/01/2023', status: 'COMPLETED' },
    { code: '24.SLS_TANAM', renc: null, real: '31/01/2023', status: 'COMPLETED' },
  ];

  for (const act of exactActivities) {
    const existing = await prisma.landActivity.findFirst({ where: { landId: 8270, code: act.code } });
    if (existing) {
      await prisma.landActivity.update({
        where: { id: existing.id },
        data: { rencanaDate: act.renc, realisasiDate: act.real, status: act.status },
      });
    } else {
      await prisma.landActivity.create({
        data: {
          landId: 8270,
          code: act.code,
          name: act.code,
          stepOrder: 99,
          rencanaDate: act.renc,
          realisasiDate: act.real,
          status: act.status,
        },
      });
    }
  }

  console.log('001A (ID 8270) has been fully restored to original state!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
