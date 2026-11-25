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

  // Let's check which closed FC petaks have drp=0 and psg=0:
  const closedFcZeroTrx = [];
  for (const r of rows) {
    const lok = r.lokasi.trim().toUpperCase();
    const isPetakClosed = r.isClosedExcel === true || (r.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    const isClosed = isPetakClosed || st40 === 'close';

    const drp = dropMap.get(lok) || r.dropD40 || 0;
    const psg = sapMap.get(lok) || r.pasangSapD40 || 0;
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');
    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';

    if (isClosed && isFc && yr === '2026' && drp === 0 && psg === 0) {
      closedFcZeroTrx.push({
        lokasi: lok,
        wilayah: r.wilayah,
        luas: r.luas || 0,
        ord: r.orderD40 || 0,
        drp,
        psg
      });
    }
  }

  console.log(`Found ${closedFcZeroTrx.length} closed FC petaks with drp=0 and psg=0:`);
  console.table(closedFcZeroTrx);

  // Search combination of these that sums to 56.62 HA:
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

  const combos = findSubsets(closedFcZeroTrx, 56.62);
  console.log(`Found ${combos.length} combinations:`);
  combos.slice(0, 3).forEach((c, i) => {
    console.log(`Combo ${i+1}:`, c.map(x => `${x.lokasi} (${x.luas} HA)`).join(', '));
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

