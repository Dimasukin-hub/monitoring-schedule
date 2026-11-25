const fs = require('fs');
const content = fs.readFileSync('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov24.sql', 'utf8');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const rows = [];
const lines = content.split('\n');
let inCopy = false;

for (const line of lines) {
  if (line.startsWith('COPY public."LokasiOrderGorongGorong"')) {
    inCopy = true;
    continue;
  }
  if (inCopy) {
    if (line.startsWith('\\.') || !line.trim()) {
      inCopy = false;
      continue;
    }
    const cols = line.split('\t');
    rows.push({
      lokasi: cols[1],
      wilayah: cols[2],
      luas: parseFloat(cols[3]) || 0,
      statusTanaman: cols[4],
      tanggalOrder: cols[6],
      statusAll: cols[11],
      statusD40: cols[20],
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
    });
  }
}

// Check which locations in snap have statusAll = 'Close' or statusD40 = 'Close'
const closedLocationsInSnap = [];
for (const [lok, val] of Object.entries(snap)) {
  if ((val.statusAll && val.statusAll.trim() === 'Close') || (val.statusD40 && val.statusD40.trim() === 'Close')) {
    closedLocationsInSnap.push(lok.trim().toUpperCase());
  }
}

console.log('Total closed locations in snapshot json:', closedLocationsInSnap.length);

// Apply to rows
for (const r of rows) {
  if (closedLocationsInSnap.includes(r.lokasi.trim().toUpperCase())) {
    r.statusAll = 'Close';
    r.statusD40 = 'Close';
  }
}

// Calculate 2026 Donut FC and KPIs
let openSaldo = 0;
let openDrop = 0;
let openPasang = 0;
let openFcHa = 0;
const byWil = {};

for (const r of rows) {
  const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
  if (isClose) continue;

  const itemYear = String((r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026'));
  const pmax = Math.max(r.pasangManD40, r.pasangSapD40);
  const sld = r.dropD40 - pmax;

  // Saldo Open di semua tahun
  openSaldo += sld;

  if (itemYear === '2026') {
    openDrop += r.dropD40;
    openPasang += pmax;

    const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
    if (isFC) {
      openFcHa += r.luas;
    }

    const w = r.wilayah || 'UNKNOWN';
    if (!byWil[w]) byWil[w] = { drop: 0, pasang: 0, sld: 0 };
    byWil[w].drop += r.dropD40;
    byWil[w].pasang += pmax;
    byWil[w].sld += sld;
  }
}

console.log({
  openSaldoAllYears: openSaldo,
  openDrop2026: openDrop,
  openPasang2026: openPasang,
  openFcHa2026: openFcHa.toFixed(2),
  pctPemasangan: (openPasang / openDrop * 100).toFixed(1)
});

console.log('byWil:', byWil);

