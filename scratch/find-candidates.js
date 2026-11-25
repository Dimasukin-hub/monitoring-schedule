const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function solve() {
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
        const ref = s.referensiLokasi.trim().toUpperCase();
        if (ref !== k) sapMap.set(ref, (sapMap.get(ref) || 0) + s.qty);
      }
    }
  }

  // Current VPS State open petaks
  // Petaks currently open with their sld and luas
  const petakData = [];
  for (const r of rows) {
    const lok = r.lokasi.trim().toUpperCase();
    const isPetakClosed = r.isClosedExcel === true || (r.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    const isOpen40 = !isPetakClosed && (st40 === 'open' || st40 === '-');

    const drp = dropMap.get(lok) || r.dropD40 || 0;
    const psg = sapMap.get(lok) || r.pasangSapD40 || 0;
    const sld = drp - psg;
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');
    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';

    petakData.push({
      lokasi: lok,
      wilayah: r.wilayah,
      luas: r.luas || 0,
      isFc: isFc && yr === '2026',
      drp,
      psg,
      sld,
      isOpen40,
      st40: r.statusD40,
      stAll: r.statusAll,
      isClosedExcel: r.isClosedExcel
    });
  }

  console.log('Current Open Petaks with positive saldo:');
  const posSld = petakData.filter(p => p.isOpen40 && p.sld > 0);
  console.table(posSld.map(p => ({ lok: p.lokasi, wil: p.wilayah, luas: p.luas, isFc: p.isFc, sld: p.sld, drp: p.drp, psg: p.psg })));

  console.log('Currently Closed FC petaks (candidates to open for +56.62 HA):');
  const closedFc = petakData.filter(p => !p.isOpen40 && p.isFc && p.sld === 0);
  console.table(closedFc.map(p => ({ lok: p.lokasi, wil: p.wilayah, luas: p.luas, sld: p.sld })));
}

solve().catch(console.error).finally(() => prisma.$disconnect());

