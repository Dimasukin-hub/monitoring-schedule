const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

// If dbLokasiOrder has the rows from snap:
const rows = Object.values(snap);

console.log('Total entries in snapshot:', rows.length);

let totalOrder2026 = 8045; // MasterDataOrder
let totalTerpasang2026 = 7021; // MasterSap
let totalOpenSaldo = 0;
let openOrderSum = 0;
let openDropSum = 0;
let openPasangSum = 0;
let openFcHa = 0;
const byWil = {};

for (const r of rows) {
  const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
  const itemYr = String(r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026');
  const pmax = Math.max(r.pasangManD40 || 0, r.pasangSapD40 || 0);
  const drp = r.dropD40 || 0;
  const ord = r.orderD40 || 0;
  const sld = drp - pmax;

  if (!isClose) {
    totalOpenSaldo += sld;

    if (itemYr === '2026') {
      const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
      if (isFC) openFcHa += (r.luas || 0);

      openOrderSum += ord;
      openDropSum += drp;
      openPasangSum += pmax;

      const w = r.wilayah || 'UNKNOWN';
      if (!byWil[w]) byWil[w] = { drop: 0, pasang: 0, order: 0 };
      byWil[w].drop += drp;
      byWil[w].pasang += pmax;
      byWil[w].order += ord;
    }
  }
}

console.log({
  totalOrder2026,
  totalTerpasang2026,
  totalOpenSaldo,
  openOrderSum,
  openDropSum,
  openPasangSum,
  pctKedatangan: (openDropSum / openOrderSum * 100).toFixed(1),
  pctPemasangan: (openPasangSum / openDropSum * 100).toFixed(1),
  openFcHa: openFcHa.toFixed(2)
});

console.log('Wilayah breakdown:');
for (const [w, d] of Object.entries(byWil)) {
  const k = (d.drop / d.order * 100).toFixed(1);
  const p = (d.pasang / d.drop * 100).toFixed(1);
  console.log(`${w}: ${d.pasang} / ${d.drop} pcs (Kedatangan: ${k}%, Terpasang: ${p}%)`);
}

