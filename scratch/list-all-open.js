const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

const open = items.filter(x => (x.statusAll || '') !== 'Close' && (x.statusD40 || '') !== 'Close');
console.log('Open petaks count:', open.length);
open.forEach(p => {
  const pmax = Math.max(p.pasangManD40 || 0, p.pasangSapD40 || 0);
  const fc = String(p.statusTanaman || '').toUpperCase().includes('FC') ? 'FC' : '--';
  const yr = p.tanggalOrder ? p.tanggalOrder.slice(0, 4) : '????';
  const sld = (p.dropD40 || 0) - pmax;
  console.log(`${p.lokasi.padEnd(8)} wil:${p.wilayah} luas:${String(p.luas).padStart(5)} fc:${fc} yr:${yr} ord:${String(p.orderD40).padStart(3)} drp:${String(p.dropD40).padStart(3)} psg:${String(pmax).padStart(3)} sld:${String(sld).padStart(4)}`);
});

