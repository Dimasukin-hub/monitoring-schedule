const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const [drops, saps, trx] = await Promise.all([
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

  const petakList = ['044A2', '089C', '078M', '050B2B', '004B', '086D', '078A', '029A2', '029A3', '042B3', '089D1'];
  const dbRows = await prisma.lokasiOrderGorongGorong.findMany({
    where: { lokasi: { in: petakList } }
  });

  console.log('--- Detail Petak ---');
  for (const r of dbRows) {
    const k = r.lokasi.trim().toUpperCase();
    const drp = dropMap.get(k) || r.dropD40 || 0;
    const psg = sapMap.get(k) || r.pasangSapD40 || 0;
    const sld = drp - psg;
    console.log(`${k.padEnd(8)} wil:${r.wilayah} luas:${r.luas} stTan:${r.statusTanaman} drp:${drp} psg:${psg} sld:${sld} st40:${r.statusD40} isClosed:${r.isClosedExcel}`);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());

