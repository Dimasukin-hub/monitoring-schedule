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

  // Let's inspect AW03 in rows
  const aw03 = rows.filter(r => r.wilayah === 'AW03');
  console.log('AW03 petaks total:', aw03.length);
  let aw03drp = 0, aw03psg = 0;
  for (const r of aw03) {
    const k = r.lokasi.trim().toUpperCase();
    const d = dropMap.get(k) || r.dropD40 || 0;
    const p = sapMap.get(k) || r.pasangSapD40 || 0;
    const st = (r.statusD40 || '-').toLowerCase();
    const isClose = r.isClosedExcel === true || (r.statusAll || '').toLowerCase() === 'close' || st === 'close';
    if (!isClose) {
      aw03drp += d;
      aw03psg += p;
      console.log(`AW03 open: ${k} drp:${d} psg:${p} sld:${d-p} luas:${r.luas}`);
    }
  }
  console.log({ aw03drp, aw03psg });
}

main().catch(console.error).finally(() => prisma.$disconnect());

