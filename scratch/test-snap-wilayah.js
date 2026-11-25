const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const validWilayahList = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
const map = new Map();
for (const wil of validWilayahList) {
  map.set(wil, {
    wilayah: wil,
    order: 0,
    drop: 0,
    pasang: 0,
    totalPasang: 0,
    saldo: 0,
    openOrder: 0,
    openDrop: 0,
    openPasang: 0,
  });
}

for (const k of Object.keys(snap)) {
  const item = snap[k];
  const wil = String(item.wilayah || '').trim().toUpperCase();
  if (!map.has(wil)) continue;
  const entry = map.get(wil);

  // Check dia 40, 60, 80, 100
  const diaKeys = [
    { dia: 40, ord: item.orderD40, drp: item.dropD40, psap: item.pasangSapD40, pman: item.pasangManD40, st: item.statusD40 },
    { dia: 60, ord: item.orderD60, drp: item.dropD60, psap: item.pasangSapD60, pman: item.pasangManD60, st: item.statusD60 },
    { dia: 80, ord: item.orderD80, drp: item.dropD80, psap: item.pasangSapD80, pman: item.pasangManD80, st: item.statusD80 },
    { dia: 100, ord: item.orderD100, drp: item.dropD100, psap: item.pasangSapD100, pman: item.pasangManD100, st: item.statusD100 },
  ];

  for (const d of diaKeys) {
    const st = (d.st || '-').trim().toLowerCase();
    const isOpen = (st === 'open' || st === '-' || st === 'cek') && item.statusAll !== 'Close';
    if (!isOpen) continue;

    const ord = Number(d.ord) || 0;
    const drp = Number(d.drp) || 0;
    const psap = Number(d.psap) || 0;
    const pman = Number(d.pman) || 0;
    const pmax = Math.max(pman, psap);
    const sld = drp - pmax;

    entry.order += ord;
    entry.drop += drp;
    entry.pasang += pmax;
    entry.totalPasang += pmax;
    entry.saldo += sld;
    entry.openOrder += ord;
    entry.openDrop += drp;
    entry.openPasang += pmax;
  }
}

const result = Array.from(map.values()).map((w) => {
  const pctK = w.openOrder > 0 ? (w.openDrop / w.openOrder) * 100 : 0;
  const pctP = w.openDrop > 0 ? (w.openPasang / w.openDrop) * 100 : 0;
  return {
    wilayah: w.wilayah,
    display: `${w.pasang} / ${w.drop} pcs`,
    pctKedatangan: parseFloat(pctK.toFixed(1)),
    pctPasang: parseFloat(pctP.toFixed(1)),
    openOrder: w.openOrder,
    openDrop: w.openDrop,
    openPasang: w.openPasang,
    saldo: w.saldo
  };
});

result.sort((a, b) => a.pctKedatangan - b.pctKedatangan);
console.log(result);

