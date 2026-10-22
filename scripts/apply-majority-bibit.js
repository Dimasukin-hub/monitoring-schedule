const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== START APPLY MAJORITY BIBIT TO PLANTING TABLE ===');

  const plantings = await prisma.planting.findMany({
    orderBy: { lokasi: 'asc' }
  });
  const details = await prisma.plantingDetail.findMany({
    orderBy: { id: 'asc' }
  });

  // Group details by uppercase lokasi
  const detailMap = new Map();
  for (const d of details) {
    if (!d.lokasi) continue;
    const loc = d.lokasi.trim().toUpperCase();
    if (!detailMap.has(loc)) detailMap.set(loc, []);
    detailMap.get(loc).push(d);
  }

  let updateCount = 0;
  const updateLogs = [];

  for (const p of plantings) {
    const loc = p.lokasi.trim().toUpperCase();
    const rows = detailMap.get(loc);
    if (!rows || rows.length === 0) continue;

    // Sum hectares per class
    const classSums = {
      'Besar': 0,
      'Sedang': 0,
      'Kecil': 0,
      'Extra Kecil': 0,
      'Standar': 0
    };

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

    const activeClasses = Object.entries(classSums).filter(([_, sum]) => sum > 0.0001);
    if (activeClasses.length === 0) continue;

    // Pick majority class
    activeClasses.sort((a, b) => b[1] - a[1]);
    const winningClass = activeClasses[0][0];

    // Pick jenis bibit (rule: follows winning class, or if all same keep it)
    const distinctJenis = Object.keys(overallJenisSums);
    let winningJenis = p.jenisBibit;

    if (distinctJenis.length === 1) {
      winningJenis = distinctJenis[0];
    } else if (distinctJenis.length > 1) {
      const winningClassJenisEntries = Object.entries(classJenisMap[winningClass] || {});
      if (winningClassJenisEntries.length > 0) {
        winningClassJenisEntries.sort((a, b) => b[1] - a[1]);
        winningJenis = winningClassJenisEntries[0][0];
      } else {
        const overallEntries = Object.entries(overallJenisSums);
        overallEntries.sort((a, b) => b[1] - a[1]);
        winningJenis = overallEntries[0][0];
      }
    }

    if (p.kelasBibit !== winningClass || p.jenisBibit !== winningJenis) {
      updateLogs.push({
        lokasi: p.lokasi,
        oldKelas: p.kelasBibit,
        newKelas: winningClass,
        oldJenis: p.jenisBibit,
        newJenis: winningJenis,
        breakdown: activeClasses.map(c => `${c[0]}: ${c[1].toFixed(2)} Ha`).join(', ')
      });

      await prisma.planting.update({
        where: { id: p.id },
        data: {
          kelasBibit: winningClass,
          jenisBibit: winningJenis
        }
      });
      updateCount++;
    }
  }

  console.log(`Successfully updated ${updateCount} locations with calculated majority.`);
  console.log('List of all updated locations:');
  updateLogs.forEach((l, i) => {
    console.log(`${i + 1}. [${l.lokasi}] Kelas: "${l.oldKelas}" -> "${l.newKelas}" | Jenis: "${l.oldJenis}" -> "${l.newJenis}" (${l.breakdown})`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
