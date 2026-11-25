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

  // To close AW06:
  // In AW06, which petaks are open?
  const aw06Open = rows.filter(r => {
    if (r.wilayah !== 'AW06') return false;
    const isPetakClosed = r.isClosedExcel === true || (r.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    return !isPetakClosed && (st40 === 'open' || st40 === '-');
  });

  console.log('AW06 open petaks:', aw06Open.length);
  for (const r of aw06Open) {
    const k = r.lokasi.trim().toUpperCase();
    const drp = dropMap.get(k) || r.dropD40 || 0;
    const psg = sapMap.get(k) || r.pasangSapD40 || 0;
    console.log(`AW06: ${k} luas:${r.luas} drp:${drp} psg:${psg} sld:${drp - psg}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

