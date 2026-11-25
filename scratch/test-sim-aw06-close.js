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

  // To close:
  const toClose = ['077A', '078J', '089A', '078B', '089D1', '028A', '063G2'];

  let saldo = 0;
  let totalFc = 0;
  const wil = {};

  for (const r of rows) {
    const lok = r.lokasi.trim().toUpperCase();
    const isClosed = toClose.includes(lok) || r.isClosedExcel === true || (r.statusAll || '').toLowerCase() === 'close' || (r.statusD40 || '').toLowerCase() === 'close';
    if (isClosed) continue;

    const drp = dropMap.get(lok) || r.dropD40 || 0;
    const psg = sapMap.get(lok) || r.pasangSapD40 || 0;
    const sld = drp - psg;
    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');

    saldo += sld;
    if (isFc && yr === '2026') totalFc += (r.luas || 0);

    const w = r.wilayah || 'Unknown';
    if (!wil[w]) wil[w] = { ord: 0, drp: 0, psg: 0, sld: 0 };
    wil[w].ord += (r.orderD40 || 0);
    wil[w].drp += drp;
    wil[w].psg += psg;
    wil[w].sld += sld;
  }

  console.log({ saldo, totalFc: totalFc.toFixed(2) });
  
  const sortedWil = Object.entries(wil).map(([w, d]) => ({
    wilayah: w,
    ...d,
    pctKedatangan: d.ord > 0 ? ((d.drp / d.ord) * 100).toFixed(1) + '%' : '0%',
    pctPasang: d.drp > 0 ? ((d.psg / d.drp) * 100).toFixed(1) + '%' : '0%',
  }));
  sortedWil.sort((a, b) => parseFloat(a.pctKedatangan) - parseFloat(b.pctKedatangan));
  console.table(sortedWil);
}

main().catch(console.error).finally(() => prisma.$disconnect());

