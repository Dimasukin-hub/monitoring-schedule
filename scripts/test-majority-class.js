const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const details = await prisma.plantingDetail.findMany({
    orderBy: { id: 'asc' }
  });

  // Group by lokasi
  const byLoc = {};
  for (const d of details) {
    const loc = d.lokasi.toUpperCase();
    if (!byLoc[loc]) byLoc[loc] = [];
    byLoc[loc].push(d);
  }

  console.log('Total distinct locations in details:', Object.keys(byLoc).length);

  // Check which locations have multiple rows with different classes
  const multiClassLocs = [];

  for (const loc of Object.keys(byLoc)) {
    const rows = byLoc[loc];
    let classSums = {
      Standar: 0,
      Besar: 0,
      Sedang: 0,
      Kecil: 0,
      'Extra Kecil': 0
    };
    let jenisSums = {};

    for (const r of rows) {
      classSums['Standar'] += r.standar || 0;
      classSums['Besar'] += r.besar || 0;
      classSums['Sedang'] += r.sedang || 0;
      classSums['Kecil'] += r.kecil || 0;
      classSums['Extra Kecil'] += r.extraKecil || 0;

      const j = r.jenisBibit || 'Unknown';
      jenisSums[j] = (jenisSums[j] || 0) + (r.total || 0);
    }

    // Filter non-zero classes
    const nonZeroClasses = Object.entries(classSums).filter(([_, val]) => val > 0);
    if (nonZeroClasses.length > 1) {
      // Sort by sum descending
      nonZeroClasses.sort((a, b) => b[1] - a[1]);
      multiClassLocs.push({
        loc,
        rowCount: rows.length,
        classes: nonZeroClasses,
        winningClass: nonZeroClasses[0][0],
        winningClassSum: nonZeroClasses[0][1],
        jenis: jenisSums
      });
    }
  }

  console.log('Locations with multiple classes:', multiClassLocs.length);
  console.log('Sample locations with multiple classes:', multiClassLocs.slice(0, 5));
}
run();
