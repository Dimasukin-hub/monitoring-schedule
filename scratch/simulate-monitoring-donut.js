const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulateMonitoringApi() {
  const [allTrx, allSap, masterStatusList, dbLokasiOrder, masterDrops, masterManuals] = await Promise.all([
    prisma.transaksiGorongGorong.findMany({}),
    prisma.masterSapGorongGorong.findMany({}),
    prisma.masterStatusLokasi.findMany({ select: { lokasi: true, strucPlant: true } }),
    prisma.lokasiOrderGorongGorong.findMany({}),
    prisma.masterDataDropGorongGorong.findMany({}),
    prisma.masterDataPasangManual.findMany({}),
  ]);

  const snapMap = new Map();
  for (const row of dbLokasiOrder) snapMap.set(row.lokasi.trim().toUpperCase(), row);

  const trxMap = new Map();
  for (const t of allTrx) {
    const k = t.lokasi.trim().toUpperCase();
    if (!trxMap.has(k)) trxMap.set(k, { orders: [], drops: [], manuals: [] });
    if (t.jenisTransaksi === 'ORDER') trxMap.get(k).orders.push(t);
    else if (t.jenisTransaksi === 'DROP') trxMap.get(k).drops.push(t);
    else if (t.jenisTransaksi === 'PASANG_MANUAL') trxMap.get(k).manuals.push(t);
  }

  const dropMap = new Map();
  for (const d of masterDrops) {
    const k = d.lokasi.trim().toUpperCase();
    dropMap.set(k, (dropMap.get(k) || 0) + (d.diameter40 || 0));
  }

  const manualMap = new Map();
  for (const m of masterManuals) {
    const k = m.lokasi.trim().toUpperCase();
    manualMap.set(k, (manualMap.get(k) || 0) + (m.diameter40 || 0));
  }

  const sapMap = new Map();
  for (const s of allSap) {
    if (s.diameter === 40) {
      const k = s.lokasi.trim().toUpperCase();
      sapMap.set(k, (sapMap.get(k) || 0) + s.qty);
      if (s.referensiLokasi) {
        const ref = s.referensiLokasi.trim().toUpperCase();
        if (ref !== k) sapMap.set(ref, (sapMap.get(ref) || 0) + s.qty);
      }
    }
  }

  const listLokasiOrder = [];

  for (const row of dbLokasiOrder) {
    const lok = row.lokasi.trim().toUpperCase();
    const snap = snapMap.get(lok);
    const tData = trxMap.get(lok) || { orders: [], drops: [], manuals: [] };

    // diameter 40 calculation:
    const ordQty = (row.orderD40 || 0);
    const masterDrpQty = dropMap.get(lok) || 0;
    const trxDrpQty = tData.drops.reduce((acc, x) => acc + (x.qtyD40 || 0), 0);
    const dropQty = masterDrpQty + trxDrpQty;

    const masterManQty = manualMap.get(lok) || 0;
    const trxManQty = tData.manuals.reduce((acc, x) => acc + (x.qtyD40 || 0), 0);
    const manQty = masterManQty + trxManQty;

    const sapQty = sapMap.get(lok) || 0;
    const totalPasangDia = Math.max(manQty, sapQty);
    const saldoDia = dropQty - totalPasangDia;

    const snapDiaStatus = row.statusD40;
    let statusDia = '-';
    if (snapDiaStatus && (snapDiaStatus.trim() === 'Close' || snapDiaStatus.trim() === 'Cek')) {
      statusDia = snapDiaStatus.trim();
    } else if (ordQty > 0 || dropQty > 0 || totalPasangDia > 0) {
      if (dropQty >= ordQty && saldoDia <= 0 && totalPasangDia > 0) {
        statusDia = 'Close';
      } else {
        statusDia = 'Open';
      }
    }

    // Status All
    const hasAnyOpen = statusDia === 'Open';
    const hasAnyClose = statusDia === 'Close';
    const statusAll = hasAnyOpen ? 'Open' : (hasAnyClose ? 'Close' : '-');

    listLokasiOrder.push({
      lokasi: lok,
      wilayah: row.wilayah,
      luas: row.luas || 0,
      status: row.statusTanaman,
      tahun: row.tanggalOrder ? row.tanggalOrder.slice(0, 4) : '2026',
      statusAll,
      isClosedExcel: row.isClosedExcel,
      d40: {
        order: ordQty,
        drop: dropQty,
        pasangManual: manQty,
        pasangSap: sapQty,
        totalPasang: totalPasangDia,
        saldo: saldoDia,
        status: statusDia,
      }
    });
  }

  // Now simulate donutFcOpenData in MonitorGorongGorongView.tsx:
  const checkIsOpen = (diaObj) => {
    if (!diaObj) return false;
    const s = String(diaObj.status || '').toLowerCase().trim();
    return s === 'open' || s === '-' || (s !== 'close' && s !== 'cek');
  };

  let totalLuasOpenFc = 0;
  const includedPetaks = [];

  for (const item of listLokasiOrder) {
    if (String(item.statusAll || '').toLowerCase() === 'close') continue;
    const itemYr = item.tahun || '2026';
    if (itemYr !== '2026') continue;
    const st = String(item.status || '').trim().toUpperCase();
    if (!st.includes('FC')) continue;

    // Ø40 filter
    const isOpenDiameter = checkIsOpen(item.d40);
    if (isOpenDiameter) {
      totalLuasOpenFc += item.luas;
      includedPetaks.push(item);
    }
  }

  console.log('SIMULATED DONUT FC:', totalLuasOpenFc.toFixed(2), 'HA. Total petaks included:', includedPetaks.length);
  return { listLokasiOrder, includedPetaks };
}

simulateMonitoringApi().catch(console.error).finally(() => prisma.$disconnect());

