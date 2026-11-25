const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

let openFcHa = 0;
let openFcList = [];

for (const k of Object.keys(snap)) {
  const p = snap[k];
  const itemYear = String((p.tanggalOrder && p.tanggalOrder !== '-' ? p.tanggalOrder.slice(0, 4) : '2026'));
  const isClose = (p.statusAll || '').trim().toLowerCase() === 'close' || (p.statusD40 || '').trim().toLowerCase() === 'close';
  const isFC = (p.statusTanaman || '').toUpperCase() === 'FC' || (p.statusTanaman || '').toUpperCase().endsWith('FC');
  
  if (itemYear === '2026' && !isClose && isFC) {
    openFcHa += (p.luas || 0);
    openFcList.push(p);
  }
}

console.log('Open FC in snapshot count:', openFcList.length, 'Total Ha:', openFcHa.toFixed(2));

