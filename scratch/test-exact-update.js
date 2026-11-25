const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));
const sap = JSON.parse(fs.readFileSync('data/master-sap-gorong-gorong.json', 'utf8'));

// Copy items
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

// Apply SQL update
const toClose = ['078A', '029A2', '029A3', '042B3', '020C', '002B2', '089D1'];
const toOpen = ['050B2B', '004B', '089A', '086D'];

for (const it of items) {
  const lok = it.lokasi.trim().toUpperCase();
  if (toClose.includes(lok)) {
    it.statusD40 = 'Close';
  }
  if (toOpen.includes(lok)) {
    it.statusD40 = '-';
    it.statusAll = '-';
  }
}

// Check FC Luas (Donut)
let donutFc = 0;
for (const item of items) {
  if (String(item.statusAll || '').toLowerCase() === 'close') continue;
  const itemYr = item.tahun || (item.tanggalOrder && item.tanggalOrder !== '-' ? item.tanggalOrder.slice(0, 4) : '2026');
  if (itemYr !== '2026') continue;
  const st = String(item.statusTanaman || item.status || '').trim().toUpperCase();
  if (!st.includes('FC')) continue;

  const s = String(item.statusD40 || '-').toLowerCase().trim();
  const isOpen = s === 'open' || s === '-' || (s !== 'close' && s !== 'cek');
  if (isOpen) {
    donutFc += Number(item.luas || 0);
  }
}

console.log('Donut FC after update on snapshot:', donutFc.toFixed(2), 'HA');

