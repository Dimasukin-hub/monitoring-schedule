const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulate() {
  const plantings = await prisma.planting.findMany({
    orderBy: { lokasi: 'asc' }
  });
  const details = await prisma.plantingDetail.findMany({
    orderBy: { id: 'asc' }
  });

  // Group details by lokasi (case-insensitive)
  const detailMap = new Map();
  for (const d of details) {
    if (!d.lokasi) continue;
    const loc = d.lokasi.trim().toUpperCase();
    if (!detailMap.has(loc)) detailMap.set(loc, []);
    detailMap.get(loc).push(d);
  }

  const updates = [];
  const unchanged = [];
  const noDetails = [];

  for (const p of plantings) {
    const loc = p.lokasi.trim().toUpperCase();
    const rows = detailMap.get(loc);

    if (!rows || rows.length === 0) {
      noDetails.push({ lokasi: p.lokasi, currentJenis: p.jenisBibit, currentKelas: p.kelasBibit, status: p.status });
      continue;
    }

    // Accumulate hectares per class and track which jenisBibit belongs to each class
    const classSums = {
      'Besar': 0,
      'Sedang': 0,
      'Kecil': 0,
      'Extra Kecil': 0,
      'Standar': 0
    };

    // Track jenisBibit per class: classJenisMap[className] = { 'Crown': sumHa, 'Sucker': sumHa }
    const classJenisMap = {
      'Besar': {},
      'Sedang': {},
      'Kecil': {},
      'Extra Kecil': {},
      'Standar': {}
    };

    const overallJenisSums = {};

    for (const r of rows) {
      const j = r.jenisBibit ? r.jenisBibit.trim() : null;
      if (j) {
        overallJenisSums[j] = (overallJenisSums[j] || 0) + (r.total || 0);
      }

      const addClass = (className, val) => {
        if (!val || val <= 0) return;
        classSums[className] += val;
        if (j) {
          classJenisMap[className][j] = (classJenisMap[className][j] || 0) + val;
        }
      };

      addClass('Besar', r.besar);
      addClass('Sedang', r.sedang);
      addClass('Kecil', r.kecil);
      addClass('Extra Kecil', r.extraKecil);
      addClass('Standar', r.standar);
    }

    // Filter non-zero classes
    const activeClasses = Object.entries(classSums).filter(([_, sum]) => sum > 0.0001);

    if (activeClasses.length === 0) {
      // No positive class hectares, retain current
      unchanged.push({ lokasi: p.lokasi, reason: 'zero_class_hectares' });
      continue;
    }

    // Sort classes descending by sum
    activeClasses.sort((a, b) => b[1] - a[1]);
    const winningClass = activeClasses[0][0];
    const winningClassSum = activeClasses[0][1];

    // Determine Jenis Bibit:
    // Rule: "kalau untuk jenis bibitnya mengikuti kelas bibitnya besar yang mana kalkulasinya, tapi kalau semua isi jenis bibitnya sama ya tidak perlu berubah cukup itu saja."
    const distinctJenis = Object.keys(overallJenisSums);
    let winningJenis = p.jenisBibit;

    if (distinctJenis.length === 1) {
      winningJenis = distinctJenis[0];
    } else if (distinctJenis.length > 1) {
      // Check which jenis is majority for the winning class
      const winningClassJenisEntries = Object.entries(classJenisMap[winningClass] || {});
      if (winningClassJenisEntries.length > 0) {
        winningClassJenisEntries.sort((a, b) => b[1] - a[1]);
        winningJenis = winningClassJenisEntries[0][0];
      } else {
        // Fallback to overall majority jenis
        const overallEntries = Object.entries(overallJenisSums);
        overallEntries.sort((a, b) => b[1] - a[1]);
        winningJenis = overallEntries[0][0];
      }
    }

    const isKelasChanged = p.kelasBibit !== winningClass;
    const isJenisChanged = p.jenisBibit !== winningJenis;

    if (isKelasChanged || isJenisChanged) {
      updates.push({
        id: p.id,
        lokasi: p.lokasi,
        status: p.status,
        oldKelas: p.kelasBibit,
        newKelas: winningClass,
        oldJenis: p.jenisBibit,
        newJenis: winningJenis,
        classes: activeClasses,
        detailCount: rows.length
      });
    } else {
      unchanged.push({ lokasi: p.lokasi, kelas: winningClass, jenis: winningJenis });
    }
  }

  console.log(`Total Plantings: ${plantings.length}`);
  console.log(`No Details (retaining Excel master): ${noDetails.length}`);
  console.log(`Unchanged (already matching majority): ${unchanged.length}`);
  console.log(`Will be Updated with new majority: ${updates.length}`);

  console.log('\n--- SAMPLE UPDATES ---');
  updates.slice(0, 15).forEach((u, i) => {
    console.log(`${i + 1}. [${u.lokasi}] Status: ${u.status}`);
    console.log(`   Kelas: "${u.oldKelas}" -> "${u.newKelas}" | Jenis: "${u.oldJenis}" -> "${u.newJenis}"`);
    console.log(`   Breakdown:`, u.classes.map(c => `${c[0]}: ${c[1].toFixed(2)} Ha`).join(', '));
  });

  // Check 001B1 specifically
  const u001b1 = updates.find(u => u.lokasi.toUpperCase() === '001B1') || unchanged.find(u => u.lokasi.toUpperCase() === '001B1');
  console.log('\n--- Check 001B1 ---', u001b1);

  await prisma.$disconnect();
}

simulate();
