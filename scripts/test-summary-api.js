async function testApi() {
  const res = await fetch('http://localhost:3000/api/dashboard/summary?year=2026&month=CURRENT');
  if (res.ok) {
    const json = await res.json();
    console.log('API Summary Success:');
    console.log('realisasiTanamSummary:', json.data.realisasiTanamSummary);
    console.log('realisasiTanamMtdSummary:', json.data.realisasiTanamMtdSummary);
    console.log('prosesTanamSummary:', json.data.prosesTanamSummary);
  } else {
    console.log('API Error:', res.status, await res.text());
  }
}
testApi().catch(console.error);
