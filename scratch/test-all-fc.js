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

  const allFc2026 = [];
  for (const r of rows) {
    const lok = r.lokasi.trim().toUpperCase();
    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');
    if (!isFc || yr !== '2026') continue;

    const drp = dropMap.get(lok) || r.dropD40 || 0;
    const psg = sapMap.get(lok) || r.pasangSapD40 || 0;
    const sld = drp - psg;

    const isPetakClosed = r.isClosedExcel === true || (r.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    const isClosed = isPetakClosed || st40 === 'close' || (drp >= (r.orderD40 || 0) && sld <= 0 && psg > 0 && st40 !== 'open');

    allFc2026.push({
      lokasi: lok,
      wilayah: r.wilayah,
      luas: r.luas || 0,
      drp,
      psg,
      sld,
      st40: r.statusD40,
      stAll: r.statusAll,
      isClosedExcel: r.isClosedExcel,
      isClosed
    });
  }

  const currentlyOpen = allFc2026.filter(p => !p.isClosed);
  const currentlyClosed = allFc2026.filter(p => p.isClosed);

  const openLuas = currentlyOpen.reduce((a, b) => a + b.luas, 0);
  console.log(`Currently Open FC 2026 luas: ${openLuas.toFixed(2)} HA (${currentlyOpen.length} petaks)`);
  console.log(`Currently Closed FC 2026 petaks: ${currentlyClosed.length}`);

  // Find subset of currentlyClosed to add to reach exactly 311.26 HA (diff: 311.26 - openLuas)
  const diff = 311.26 - openLuas;
  console.log(`Diff to 311.26: ${diff.toFixed(2)} HA`);

  function findSubsets(arr, target) {
    const results = [];
    function search(idx, currentSum, chosen) {
      if (Math.abs(currentSum - target) < 0.05) {
        results.push([...chosen]);
        return;
      }
      if (idx >= arr.length || currentSum > target + 0.1 || chosen.length > 6) return;
      chosen.push(arr[idx]);
      search(idx + 1, currentSum + arr[idx].luas, chosen);
      chosen.pop();
      search(idx + 1, currentSum, chosen);
    }
    search(0, 0, []);
    return results;
  }

  const solutions = findSubsets(currentlyClosed, diff);
  console.log(`Found ${solutions.length} solutions:`);
  solutions.slice(0, 5).forEach((sol, i) => {
    const sldSum = sol.reduce((a, b) => a + b.sld, 0);
    console.log(`Sol #${i+1} (sld sum: ${sldSum}):`, sol.map(x => `${x.lokasi} (${x.luas} HA, sld:${x.sld})`).join(', '));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

