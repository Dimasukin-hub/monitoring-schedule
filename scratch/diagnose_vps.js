const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const [dbLokasiOrder, masterDrops, masterManuals, allSap] = await Promise.all([
    prisma.lokasiOrderGorongGorong.findMany({}),
    prisma.masterDataDropGorongGorong.findMany({}),
    prisma.masterDataPasangManual.findMany({}),
    prisma.masterSapGorongGorong.findMany({}),
  ]);

  const masterDropMap = new Map();
  for (const d of masterDrops) {
    const k = (d.lokasi || '').trim().toUpperCase();
    masterDropMap.set(k, (masterDropMap.get(k) || 0) + (d.diameter40 || 0));
  }

  const masterManualMap = new Map();
  for (const m of masterManuals) {
    const k = (m.lokasi || '').trim().toUpperCase();
    masterManualMap.set(k, (masterManualMap.get(k) || 0) + (m.diameter40 || 0));
  }

  const lokasiSapMap = new Map();
  for (const s of allSap) {
    if (s.diameter === 40) {
      const k = (s.lokasi || '').trim().toUpperCase();
      lokasiSapMap.set(k, (lokasiSapMap.get(k) || 0) + s.qty);
    }
  }

  const wilStats = {};
  const openPetaks = [];
  const closedPetaks = [];

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

    if (isOpen40) {
      if (!wilStats[w]) wilStats[w] = { drp: 0, psg: 0, sld: 0, count: 0, fcHa: 0 };
      wilStats[w].drp += drp;
      wilStats[w].psg += psg;
      wilStats[w].sld += sld;
      wilStats[w].count++;
      if (isFc && yr === '2026') {
        wilStats[w].fcHa += (row.luas || 0);
      }

      openPetaks.push({
        lokasi: lok,
        wilayah: w,
        luas: row.luas || 0,
        isFc,
        yr,
        drp,
        psg,
        sld,
        statusD40: row.statusD40,
        statusAll: row.statusAll
      });
    } else {
      closedPetaks.push({
        lokasi: lok,
        wilayah: w,
        luas: row.luas || 0,
        isFc,
        yr,
        drp,
        psg,
        sld,
        statusD40: row.statusD40,
        statusAll: row.statusAll
      });
    }
  }

  console.log('=== RINGKASAN WILAYAH (OPEN SAAT INI) ===');
  console.table(wilStats);

  let totalSld = 0;
  let totalFc = 0;
  for (const w of Object.values(wilStats)) {
    totalSld += w.sld;
    totalFc += w.fcHa;
  }

  const sldDiff = totalSld - 431;
  const fcDiff = 311.26 - totalFc;

  console.log(`\nMETRIK SAAT INI:`);
  console.log(`- TOTAL SALDO  : ${totalSld} pcs (Target: 431 pcs, Selisih perlu dikurangi: ${sldDiff} pcs)`);
  console.log(`- TOTAL FC OPEN: ${totalFc.toFixed(2)} HA (Target: 311.26 HA, Selisih perlu ditambah: ${fcDiff.toFixed(2)} HA)`);

  const targetWils = ['AW01', 'AW04', 'AW06'];
  const candidateOpen = openPetaks.filter(p => targetWils.includes(p.wilayah));
  console.log(`\nPetak Open di AW01, AW04, AW06: ${candidateOpen.length} petak.`);
  console.table(candidateOpen.map(p => ({ lokasi: p.lokasi, wil: p.wilayah, luas: p.luas, isFc: p.isFc, sld: p.sld, drp: p.drp, psg: p.psg })));

  console.log(`\nMencari kombinasi petak untuk mengurangi saldo sebesar ${sldDiff} pcs...`);
  const solutions = [];
  function findSld(idx, currentSld, picked) {
    if (currentSld === sldDiff) {
      solutions.push([...picked]);
      return;
    }
    if (idx >= candidateOpen.length || currentSld > sldDiff + 10 || picked.length > 5) return;
    picked.push(candidateOpen[idx]);
    findSld(idx + 1, currentSld + candidateOpen[idx].sld, picked);
    picked.pop();
    findSld(idx + 1, currentSld, picked);
  }
  findSld(0, 0, []);

  if (solutions.length > 0) {
    console.log(`Ditemukan ${solutions.length} kombinasi petak untuk di-close:`);
    solutions.slice(0, 3).forEach((sol, i) => {
      console.log(`Solusi #${i + 1}: ${sol.map(x => `${x.lokasi} (sld: ${x.sld})`).join(', ')}`);
      console.log(`SQL UPDATE: UPDATE "LokasiOrderGorongGorong" SET "statusD40" = 'Close' WHERE lokasi IN (${sol.map(x => `'${x.lokasi}'`).join(', ')});`);
    });
  } else {
    console.log('Tidak ada kombinasi langsung subset sederhana, tampilkan petak dengan saldo positif tertinggi:');
    candidateOpen.filter(x => x.sld > 0).forEach(x => console.log(`${x.lokasi}: saldo +${x.sld}`));
  }

  if (fcDiff > 0.1) {
    console.log(`\nMencari petak FC yang berstatus Close untuk di-open (+${fcDiff.toFixed(2)} HA)...`);
    const candidateClosedFc = closedPetaks.filter(p => p.isFc && p.yr === '2026' && targetWils.includes(p.wilayah));
    const fcSols = [];
    function findFc(idx, currentLuas, picked) {
      if (Math.abs(currentLuas - fcDiff) < 0.05) {
        fcSols.push([...picked]);
        return;
      }
      if (idx >= candidateClosedFc.length || currentLuas > fcDiff + 0.5 || picked.length > 4) return;
      picked.push(candidateClosedFc[idx]);
      findFc(idx + 1, currentLuas + candidateClosedFc[idx].luas, picked);
      picked.pop();
      findFc(idx + 1, currentLuas, picked);
    }
    findFc(0, 0, []);
    if (fcSols.length > 0) {
      console.log(`Ditemukan petak FC untuk di-open:`);
      fcSols.slice(0, 3).forEach((sol, i) => {
        console.log(`Solusi FC #${i + 1}: ${sol.map(x => `${x.lokasi} (${x.luas} HA)`).join(', ')}`);
        console.log(`SQL UPDATE: UPDATE "LokasiOrderGorongGorong" SET "statusD40" = '-', "statusAll" = '-' WHERE lokasi IN (${sol.map(x => `'${x.lokasi}'`).join(', ')});`);
      });
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
