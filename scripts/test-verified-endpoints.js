async function testEndpoints() {
  console.log('Testing endpoints on http://localhost:3000 ...\n');

  // 1. Summary
  const sumRes = await fetch('http://localhost:3000/api/dashboard/summary').then(r => r.json());
  console.log('--- 1. /api/dashboard/summary ---');
  console.log('prosesTanamSummary:', sumRes.data?.prosesTanamSummary);

  // 2. Planting Summary
  const plRes = await fetch('http://localhost:3000/api/planting?page=1&limit=15').then(r => r.json());
  console.log('\n--- 2. /api/planting ---');
  console.log('Planting summary:', plRes.summary);

  // 3. Stok Lahan PROSES
  const stokRes = await fetch('http://localhost:3000/api/stok?category=PROSES').then(r => r.json());
  console.log('\n--- 3. /api/stok?category=PROSES ---');
  console.log('Total PROSES in Stok:', stokRes.data?.length);
  stokRes.data?.slice(0, 5).forEach((item, idx) => {
    console.log(`[${idx + 1}] Lokasi: ${item.lokasi}, Netto: ${item.luasNetto}, progressTanam: ${item.progressTanam}%, statusAplikasi: ${item.statusAplikasi}`);
  });

  // 4. Charts listLokasiProsesTanam
  const chartsRes = await fetch('http://localhost:3000/api/dashboard/charts').then(r => r.json());
  console.log('\n--- 4. /api/dashboard/charts listLokasiProsesTanam ---');
  const prosesList = chartsRes.data?.listLokasiProsesTanam || [];
  console.log('Total listLokasiProsesTanam:', prosesList.length);
  prosesList.slice(0, 5).forEach((item, idx) => {
    console.log(`[${idx + 1}] Lokasi: ${item.lokasi}, Bibit: ${item.bibit}, Prog: ${item.progress}%, Sisa: ${item.sisaHa} Ha, Status: ${item.status}`);
  });
}

testEndpoints().catch(console.error);
