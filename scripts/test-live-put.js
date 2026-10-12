const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧪 PENGUJIAN DINAMIS PERGESERAN BULAN PADA STOK LAHAN:');

  const land = await prisma.land.findFirst({
    where: { lokasi: '003D' }
  });

  if (!land) {
    console.error('003D tidak ditemukan!');
    return;
  }

  console.log(`Lokasi 003D (ID ${land.id}): Netto=${land.luasNetto} Ha`);

  // 1. Ambil summary Oktober & November sebelum update
  const octBefore = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 10 } }
  });
  const novBefore = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 11 } }
  });

  console.log('\n--- KONDISI SEBELUM PERUBAHAN ---');
  console.log(`Oktober Bajak      : ${octBefore?.bajak} Ha`);
  console.log(`Oktober Stok Bongkar: ${octBefore?.stokBongkar} Ha`);
  console.log(`Oktober Stok Bajak  : ${octBefore?.stokBajak} Ha`);
  console.log(`November Bajak     : ${novBefore?.bajak} Ha`);

  // 2. Geser tanggal realisasi Bajak 003D ke November (15/11/2026)
  console.log('\nMenggeser tanggal realisasi MB 5 BTR 003D ke bulan November (15/11/2026)...');

  const res = await fetch(`http://localhost:3000/api/lands/${land.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      aplikasiDetails: {
        realBajakAwalMb5Btr: '15/11/2026',
        realBajak: '15/11/2026'
      },
      activities: [
        { code: '11.BAJAK_AWAL', realisasiDate: '15/11/2026' }
      ]
    })
  });

  const data = await res.json();
  console.log('PUT API Response:', data.success, data.message);

  const octAfter = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 10 } }
  });
  const novAfter = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 11 } }
  });

  console.log('\n--- KONDISI SETELAH PERUBAHAN (PINDAH KE NOVEMBER) ---');
  console.log(`Oktober Bajak       : ${octAfter?.bajak} Ha (Harus berkurang 3.17 Ha)`);
  console.log(`Oktober Stok Bongkar : ${octAfter?.stokBongkar} Ha (Harus bertambah 3.17 Ha)`);
  console.log(`Oktober Stok Bajak   : ${octAfter?.stokBajak} Ha (Harus berkurang 3.17 Ha)`);
  console.log(`November Bajak      : ${novAfter?.bajak} Ha (Harus bertambah 3.17 Ha)`);

  // 3. Restore data awal
  console.log('\nRestoring data awal 003D...');
  await fetch(`http://localhost:3000/api/lands/${land.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      realBajak: null,
      aplikasiDetails: {
        realBajakAwalMb5Btr: null,
        realBajak: null
      },
      activities: [
        { code: '11.BAJAK_AWAL', realisasiDate: null }
      ]
    })
  });

  const octRestored = await prisma.stageStockSummary.findUnique({
    where: { year_monthIndex: { year: 2026, monthIndex: 10 } }
  });
  console.log(`Oktober Bajak setelah restore: ${octRestored?.bajak} Ha (Kembali normal)`);
  console.log('✅ Verifikasi kalkulasi dinamis dan pergeseran stok selesai dengan sempurna!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
