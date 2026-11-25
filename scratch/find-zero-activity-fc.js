const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [rows, drops, saps, trx] = await Promise.all([
    prisma.lokasiOrderGorongGorong.findMany({}),
    prisma.masterDataDropGorongGorong.findMany({}),
    prisma.masterSapGorongGorong.findMany({}),
    prisma.transaksiGorongGorong.findMany({}),
  ]);

  const dropMap = new Map();
  for (const d of drops) {
    const k = d.lokasi.trim().toUpperCase();
    dropMap.set(k, (dropMap.get(k) || 0) + (d.diameter40 || 0));
  }
  for (const t of trx) {
    if (t.jenisTransaksi === 'DROP') {
      const k = t.lokasi.trim().toUpperCase();
      dropMap.set(k, (dropMap.get(k) || 0) + (t.qtyD40 || t.diameter40 || 0));
    }
  }

  const sapMap = new Map();
  for (const s of saps) {
    if (s.diameter === 40) {
      const k = s.lokasi.trim().toUpperCase();
      sapMap.set(k, (sapMap.get(k) || 0) + s.qty);
      if (s.referensiLokasi) {
        const refLok = s.referensiLokasi.trim().toUpperCase();
        if (refLok !== k) {
          lokasiSapMap.set(refLok, (lokasiSapMap.get(refLok) || 0) + s.qty);
        }
      }
    }
  }

  const zeroActivityFc = [];
  for (const r of rows) {
    const lok = r.lokasi.trim().toUpperCase();
    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');
    if (!isFc || yr !== '2026') continue;

    const drp = dropMap.get(lok) || r.dropD40 || 0;
    const psg = sapMap.get(lok) || r.pasangSapD40 || 0;
    const ord = r.orderD40 || 0;

    if (drp === 0 && psg === 0) {
      zeroActivityFc.push({
        lokasi: lok,
        wilayah: r.wilayah,
        luas: r.luas || 0,
        ord,
        drp,
        psg,
        st40: r.statusD40,
        stAll: r.statusAll,
        isClosedExcel: r.isClosedExcel
      });
    }
  }

  console.log(`Found ${zeroActivityFc.length} FC petaks with drp=0 and psg=0:`);
  console.table(zeroActivityFc);
}

main().catch(console.error).finally(() => prisma.$disconnect());

