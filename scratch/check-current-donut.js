const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
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

  const checkIsOpen = (diaObj) => {
    if (!diaObj) return false;
    const s = String(diaObj.status || '').toLowerCase().trim();
    return s === 'open' || s === '-' || (s !== 'close' && s !== 'cek');
  };

  let totalDonutFc = 0;
  const fcPetaks = [];

  for (const row of rows) {
    const lok = row.lokasi.trim().toUpperCase();
    const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
    if (isPetakClosed) continue;

    const itemYr = row.tahun || (row.tanggalOrder && row.tanggalOrder !== '-' ? row.tanggalOrder.slice(0, 4) : '2026');
    if (itemYr !== '2026') continue;

    const st = String(row.statusTanaman || '').trim().toUpperCase();
    if (!st.includes('FC')) continue;

    const drp = dropMap.get(lok) || row.dropD40 || 0;
    const psg = sapMap.get(lok) || row.pasangSapD40 || 0;
    const sld = drp - psg;

    const snapDiaStatus = row.statusD40;
    let statusDia = '-';
    if (snapDiaStatus && (snapDiaStatus.trim() === 'Close' || snapDiaStatus.trim() === 'Cek')) {
      statusDia = snapDiaStatus.trim();
    } else if (drp > 0 || psg > 0) {
      if (drp >= (row.orderD40 || 0) && sld <= 0 && psg > 0) {
        statusDia = 'Close';
      } else {
        statusDia = 'Open';
      }
    }

    if (checkIsOpen({ status: statusDia })) {
      totalDonutFc += (row.luas || 0);
      fcPetaks.push({ lok, wil: row.wilayah, luas: row.luas, drp, psg, sld, statusDia });
    }
  }

  console.log('Total Donut FC:', totalDonutFc.toFixed(2), 'HA. Total petaks:', fcPetaks.length);
  console.table(fcPetaks);
}

check().catch(console.error).finally(() => prisma.$disconnect());

