const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [dbLokasiOrder, masterDrops, masterManuals, allSap, allTrx] = await Promise.all([
    prisma.lokasiOrderGorongGorong.findMany({}),
    prisma.masterDataDropGorongGorong.findMany({}),
    prisma.masterDataPasangManual.findMany({}),
    prisma.masterSapGorongGorong.findMany({}),
    prisma.transaksiGorongGorong.findMany({}),
  ]);

  const masterDropMap = new Map();
  for (const d of masterDrops) {
    const k = (d.lokasi || '').trim().toUpperCase();
    masterDropMap.set(k, (masterDropMap.get(k) || 0) + (d.diameter40 || 0));
  }
  for (const t of allTrx) {
    if (t.jenisTransaksi === 'DROP') {
      const k = (t.lokasi || '').trim().toUpperCase();
      masterDropMap.set(k, (masterDropMap.get(k) || 0) + (t.qtyD40 || t.diameter40 || 0));
    }
  }

  const masterManualMap = new Map();
  for (const m of masterManuals) {
    const k = (m.lokasi || '').trim().toUpperCase();
    masterManualMap.set(k, (masterManualMap.get(k) || 0) + (m.diameter40 || 0));
  }
  for (const t of allTrx) {
    if (t.jenisTransaksi === 'PASANG_MANUAL') {
      const k = (t.lokasi || '').trim().toUpperCase();
      masterManualMap.set(k, (masterManualMap.get(k) || 0) + (t.qtyD40 || t.diameter40 || 0));
    }
  }

  const lokasiSapMap = new Map();
  for (const s of allSap) {
    if (s.diameter === 40) {
      const k = (s.lokasi || '').trim().toUpperCase();
      lokasiSapMap.set(k, (lokasiSapMap.get(k) || 0) + s.qty);
      if (s.referensiLokasi) {
        const refLok = s.referensiLokasi.trim().toUpperCase();
        if (refLok !== k) {
          lokasiSapMap.set(refLok, (lokasiSapMap.get(refLok) || 0) + s.qty);
        }
      }
    }
  }

  const petaks = [];
  for (const row of dbLokasiOrder) {
    const lok = row.lokasi.trim().toUpperCase();
    const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (row.statusD40 || '-').trim().toLowerCase();
    const isOpen40 = !isPetakClosed && (st40 === 'open' || st40 === '-');

    const drp = masterDropMap.has(lok) ? masterDropMap.get(lok) : (row.dropD40 || 0);
    const pman = masterManualMap.has(lok) ? masterManualMap.get(lok) : (row.pasangManD40 || 0);
    const psap = lokasiSapMap.has(lok) ? lokasiSapMap.get(lok) : (row.pasangSapD40 || 0);
    const psg = Math.max(pman, psap);
    const sld = drp - psg;

    const w = row.wilayah || 'Unknown';
    const isFc = String(row.statusTanaman || '').toUpperCase().includes('FC');
    const yr = row.tanggalOrder ? row.tanggalOrder.slice(0, 4) : '2026';

    petaks.push({
      lokasi: lok,
      wilayah: w,
      luas: row.luas || 0,
      isFc,
      yr,
      drp,
      psg,
      sld,
      orderD40: row.orderD40 || 0,
      isOpen40,
      isPetakClosed,
      statusD40: row.statusD40,
      statusAll: row.statusAll,
      isClosedExcel: row.isClosedExcel
    });
  }

  const openPetaks = petaks.filter(p => p.isOpen40);
  console.log('Total Lokasi in DB:', petaks.length);
  console.log('Total Open Petaks:', openPetaks.length);

  let currentSaldo = 0;
  let currentFcHa = 0;
  let openOrd = 0;
  let openDrp = 0;
  let openPsg = 0;
  const wilMap = {};

  for (const p of openPetaks) {
    currentSaldo += p.sld;
    openOrd += p.orderD40;
    openDrp += p.drp;
    openPsg += p.psg;
    if (p.isFc && p.yr === '2026') {
      currentFcHa += p.luas;
    }
    if (!wilMap[p.wilayah]) wilMap[p.wilayah] = { ord: 0, drp: 0, psg: 0, sld: 0, count: 0, fcHa: 0 };
    wilMap[p.wilayah].ord += p.orderD40;
    wilMap[p.wilayah].drp += p.drp;
    wilMap[p.wilayah].psg += p.psg;
    wilMap[p.wilayah].sld += p.sld;
    wilMap[p.wilayah].count++;
    if (p.isFc && p.yr === '2026') wilMap[p.wilayah].fcHa += p.luas;
  }

  console.log({
    currentSaldo,
    currentFcHa: Number(currentFcHa.toFixed(2)),
    pctKedatangan: openOrd > 0 ? ((openDrp / openOrd) * 100).toFixed(1) + '%' : '0%',
    pctPasang: openDrp > 0 ? ((openPsg / openDrp) * 100).toFixed(1) + '%' : '0%',
  });

  const sortedWil = Object.entries(wilMap).map(([w, d]) => ({
    wilayah: w,
    ...d,
    pctKedatangan: d.ord > 0 ? ((d.drp / d.ord) * 100).toFixed(1) + '%' : '0%',
    pctPasang: d.drp > 0 ? ((d.psg / d.drp) * 100).toFixed(1) + '%' : '0%',
  }));
  sortedWil.sort((a, b) => parseFloat(a.pctKedatangan) - parseFloat(b.pctKedatangan));
  console.table(sortedWil);
}

main().catch(console.error).finally(() => prisma.$disconnect());
