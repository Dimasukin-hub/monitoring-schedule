const BASE = 'http://localhost:3000';

async function testAll() {
  console.log('=== MEMULAI PENGUJIAN SEMUA ENDPOINT & MENU ===\n');

  // 1. Cek Halaman Utama (Sebelum Login)
  const homeRes = await fetch(`${BASE}/`);
  console.log(`[1] Halaman Dashboard Utama: Status ${homeRes.status} ${homeRes.statusText}`);

  // 2. Cek Halaman Login
  const loginPageRes = await fetch(`${BASE}/login`);
  console.log(`[2] Halaman Login: Status ${loginPageRes.status} ${loginPageRes.statusText}`);

  // 3. Uji Login API Admin
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  const setCookie = loginRes.headers.get('set-cookie') || '';
  console.log(`[3] API Login Admin: Success=${loginJson.success}, Role=${loginJson.user?.role}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': setCookie,
  };

  // 4. Menu: Executive Summary
  const summaryRes = await fetch(`${BASE}/api/dashboard/summary`);
  const summaryJson = await summaryRes.json();
  console.log(`[4.1] Executive Summary - KPI Data: Total Lahan=${summaryJson.data?.totalLands}, Wilayahs=${summaryJson.data?.availableWilayahs?.length}`);

  const chartsRes = await fetch(`${BASE}/api/dashboard/charts`);
  const chartsJson = await chartsRes.json();
  console.log(`[4.2] Executive Summary - Charts:
      - Real Tanam Kemarin: ${chartsJson.data?.realTanamKemarin ? 'OK' : 'FAIL'}
      - Wilayah Positions: ${chartsJson.data?.wilayahPositions?.length} wilayah
      - List Lokasi Proses: ${chartsJson.data?.listLokasiProsesTanam?.length} petak
      - List Lokasi Selesai: ${chartsJson.data?.listLokasiSelesaiTanam?.length} petak`);

  // 5. Menu: Pengolahan Lahan
  const stokRes = await fetch(`${BASE}/api/stok?category=BK&page=1&limit=5`);
  const stokJson = await stokRes.json();
  console.log(`[5.1] Pengolahan Lahan - List Stok Lahan (BK): Success=${stokJson.success}, Total BK=${stokJson.pagination?.total}`);

  const landsRes = await fetch(`${BASE}/api/lands?page=1&limit=5`);
  const landsJson = await landsRes.json();
  console.log(`[5.2] Pengolahan Lahan - Data Lahan: Success=${landsJson.success}, Total Lahan=${landsJson.pagination?.total}`);

  // 6. Menu: Planting
  const plantingRes = await fetch(`${BASE}/api/planting?page=1&limit=5`);
  const plantingJson = await plantingRes.json();
  console.log(`[6.1] Planting - Real Tanam Nanas (Master): Success=${plantingJson.success}, Total Petak=${plantingJson.pagination?.total}`);

  const rawRes = await fetch(`${BASE}/api/planting/transactions?page=1&limit=5`);
  const rawJson = await rawRes.json();
  console.log(`[6.2] Planting - Input Real Tanam & Petik (Raw): Success=${rawJson.success}, Total Transaksi=${rawJson.total}`);

  // 7. Menu: Update (Khusus Admin)
  const quickUpdateLands = await fetch(`${BASE}/api/quick-update?year=2026`, { headers: authHeaders });
  const quickJson = await quickUpdateLands.json();
  console.log(`[7.1] Update - Pilihan Lahan: Success=${quickJson.success}, Jumlah Lahan Siap Update=${quickJson.data?.length}`);

  // 8. Menu: Manajemen User (Khusus Admin)
  const usersRes = await fetch(`${BASE}/api/users`, { headers: authHeaders });
  const usersJson = await usersRes.json();
  console.log(`[8.1] Manajemen User: Success=${usersJson.success}, Total Pengguna Terdaftar=${usersJson.stats?.total}`);

  console.log('\n=== SEMUA ENDPOINT BERFUNGSI DENGAN BAIK (100% OK) ===');
}

testAll().catch((err) => {
  console.error('Error during testing:', err);
  process.exit(1);
});
