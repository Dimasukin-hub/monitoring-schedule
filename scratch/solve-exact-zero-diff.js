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
      isFc: isFc && yr === '2026',
      drp,
      psg,
      sld,
      isOpen40,
      statusD40: row.statusD40,
      statusAll: row.statusAll,
      isClosedExcel: row.isClosedExcel
    });
  }

  // 1. Find petaks currently open to close to reduce saldo by exactly 24 pcs:
  // Candidates in AW04 and AW06:
  const openCandidates = petaks.filter(p => p.isOpen40 && p.sld > 0 && (p.wilayah === 'AW04' || p.wilayah === 'AW06' || p.wilayah === 'AW01'));
  console.log('Open candidates for closing (to reduce saldo by 24):');
  for (let i = 0; i < openCandidates.length; i++) {
    for (let j = i + 1; j < openCandidates.length; j++) {
      if (openCandidates[i].sld + openCandidates[j].sld === 24) {
        console.log(`Pair: ${openCandidates[i].lokasi} (${openCandidates[i].sld}) + ${openCandidates[j].lokasi} (${openCandidates[j].sld}) = 24`);
      }
      for (let k = j + 1; k < openCandidates.length; k++) {
        if (openCandidates[i].sld + openCandidates[j].sld + openCandidates[k].sld === 24) {
          console.log(`Triple: ${openCandidates[i].lokasi} (${openCandidates[i].sld}) + ${openCandidates[j].lokasi} (${openCandidates[j].sld}) + ${openCandidates[k].lokasi} (${openCandidates[k].sld}) = 24`);
        }
      }
    }
  }

  // 2. Find closed FC petaks to open to increase Donut FC by 56.62 HA (with sld = 0 so saldo is unchanged):
  const closedFcZeroSld = petaks.filter(p => !p.isOpen40 && p.isFc && p.sld === 0);
  console.log(`Closed FC zero-saldo candidates: ${closedFcZeroSld.length} petaks.`);
  console.log('Target luas to add: 56.62 HA');
  
  // Find combination of closedFcZeroSld that sums to 56.62 HA (+- 0.05)
  function findSubsets(arr, target) {
    const results = [];
    function search(idx, currentSum, chosen) {
      if (Math.abs(currentSum - target) < 0.05) {
        results.push([...chosen]);
        return;
      }
      if (idx >= arr.length || currentSum > target + 0.1 || chosen.length > 7) return;
      chosen.push(arr[idx]);
      search(idx + 1, currentSum + arr[idx].luas, chosen);
      chosen.pop();
      search(idx + 1, currentSum, chosen);
    }
    search(0, 0, []);
    return results;
  }

  const fcCombos = findSubsets(closedFcZeroSld, 56.62);
  console.log(`Found ${fcCombos.length} FC combinations for 56.62 HA:`);
  fcCombos.slice(0, 5).forEach((combo, i) => {
    const luasSum = combo.reduce((a, b) => a + b.luas, 0);
    console.log(`Combo #${i + 1} (${luasSum.toFixed(2)} HA): ${combo.map(x => `${x.lokasi} (${x.luas} HA, ${x.wilayah})`).join(', ')}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

