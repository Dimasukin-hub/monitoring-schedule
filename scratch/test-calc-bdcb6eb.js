const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

// In bdcb6eb, let's see how summary/route.ts computed saldoOpen2025_2026:
let saldoOpen2025_2026 = 0;
let openOrderSum = 0;
let openDropSum = 0;
let openPasangSum = 0;

for (const [lok, row] of Object.entries(snap)) {
  const isPetakClosed = row.isClosedExcel === true || (row.statusAll || '').trim().toLowerCase() === 'close';
  if (isPetakClosed) continue;

  const diaList = [
    { dia: 40, ord: row.orderD40 || 0, drop: row.dropD40 || 0, pman: row.pasangManD40 || 0, psap: row.pasangSapD40 || 0, status: row.statusD40 },
    { dia: 60, ord: row.orderD60 || 0, drop: row.dropD60 || 0, pman: row.pasangManD60 || 0, psap: row.pasangSapD60 || 0, status: row.statusD60 },
    { dia: 80, ord: row.orderD80 || 0, drop: row.dropD80 || 0, pman: row.pasangManD80 || 0, psap: row.pasangSapD80 || 0, status: row.statusD80 },
    { dia: 100, ord: row.orderD100 || 0, drop: row.dropD100 || 0, pman: row.pasangManD100 || 0, psap: row.pasangSapD100 || 0, status: row.statusD100 },
  ];

  for (const d of diaList) {
    if (d.dia !== 40) continue; // diameter 40 selected!
    const st = (d.status || '-').trim().toLowerCase();
    const isOpen = st === 'open' || st === '-' || st === 'cek';
    if (isOpen) {
      const bestPasang = Math.max(d.pman, d.psap);
      const sld = d.drop - bestPasang;
      saldoOpen2025_2026 += sld;
      openOrderSum += d.ord;
      openDropSum += d.drop;
      openPasangSum += bestPasang;
    }
  }
}

const pctKedatangan = openOrderSum > 0 ? (openDropSum / openOrderSum * 100).toFixed(1) : 0;
const pctPemasangan = openDropSum > 0 ? (openPasangSum / openDropSum * 100).toFixed(1) : 0;

console.log({
  saldoOpen2025_2026,
  openOrderSum,
  openDropSum,
  openPasangSum,
  pctKedatangan,
  pctPemasangan
});

