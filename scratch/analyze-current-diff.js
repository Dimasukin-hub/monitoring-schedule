const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

// Let's see what is currently in snap for all petaks
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

// Let's see all open petaks
let totalSaldo = 0;
let openPetaks = [];

for (const p of items) {
  const isClose = (p.statusAll || '').trim().toLowerCase() === 'close';
  if (isClose) continue;

  const diaList = [
    { dia: 40, ord: p.orderD40 || 0, drp: p.dropD40 || 0, psap: p.pasangSapD40 || 0, pman: p.pasangManD40 || 0, st: p.statusD40 },
    { dia: 60, ord: p.orderD60 || 0, drp: p.dropD60 || 0, psap: p.pasangSapD60 || 0, pman: p.pasangManD60 || 0, st: p.statusD60 },
    { dia: 80, ord: p.orderD80 || 0, drp: p.dropD80 || 0, psap: p.pasangSapD80 || 0, pman: p.pasangManD80 || 0, st: p.statusD80 },
    { dia: 100, ord: p.orderD100 || 0, drp: p.dropD100 || 0, psap: p.pasangSapD100 || 0, pman: p.pasangManD100 || 0, st: p.statusD100 },
  ];

  let petakSaldo = 0;
  for (const d of diaList) {
    if (d.dia !== 40) continue; // selected diameter 40
    const st = (d.st || '-').trim().toLowerCase();
    if (st !== 'close') {
      const pmax = Math.max(d.psap, d.pman);
      const sld = d.drp - pmax;
      petakSaldo += sld;
    }
  }

  totalSaldo += petakSaldo;
  if (petakSaldo !== 0) {
    openPetaks.push({
      lok: p.lokasi,
      wil: p.wilayah,
      luas: p.luas,
      stTanaman: p.statusTanaman,
      ord: p.orderD40,
      drp: p.dropD40,
      psap: p.pasangSapD40,
      pman: p.pasangManD40,
      sld: petakSaldo,
      st40: p.statusD40,
      stAll: p.statusAll
    });
  }
}

console.log('Current total saldo in simulation:', totalSaldo);
console.log('Open petaks with non-zero saldo (' + openPetaks.length + '):');
for (const p of openPetaks) {
  console.log(`${p.lok.padEnd(8)} wil:${p.wil} luas:${String(p.luas).padStart(5)} stTan:${p.stTanaman} sld:${String(p.sld).padStart(4)} drp:${p.drp} psg:${Math.max(p.psap, p.pman)} st40:${p.st40} stAll:${p.stAll}`);
}

