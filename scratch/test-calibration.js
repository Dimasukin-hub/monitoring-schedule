const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

// Copy items as in restore_final.js
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL')).map(x => ({ ...x }));

// 1. Initial restore_final.js updates:
const toCloseFirst = ['078A', '029A2', '029A3', '042B3', '020C', '002B2', '089D1'];
for (const it of items) {
  const lok = it.lokasi.trim().toUpperCase();
  if (toCloseFirst.includes(lok)) {
    it.statusD40 = 'Close';
  }
}

// 2. Add today's 48 pcs drop in AW02: 013F (+9 pcs) and 024B (+39 pcs)
for (const it of items) {
  const lok = it.lokasi.trim().toUpperCase();
  if (lok === '013F') {
    it.dropD40 = (it.dropD40 || 0) + 9;
  }
  if (lok === '024B') {
    it.dropD40 = (it.dropD40 || 0) + 39;
  }
}

function evaluate(itemsList) {
  let saldo = 0;
  let donutFc = 0;
  let openOrd = 0;
  let openDrp = 0;
  let openPsg = 0;
  const wil = {};

  for (const r of itemsList) {
    const isPetakClosed = r.isClosedExcel === true || (r.statusAll || '').trim().toLowerCase() === 'close';
    const st40 = (r.statusD40 || '-').trim().toLowerCase();
    const isOpen40 = !isPetakClosed && (st40 === 'open' || st40 === '-');

    const drp = r.dropD40 || 0;
    const pman = r.pasangManD40 || 0;
    const psap = r.pasangSapD40 || 0;
    const psg = Math.max(pman, psap);
    const sld = drp - psg;

    const yr = r.tanggalOrder ? r.tanggalOrder.slice(0, 4) : '2026';
    const isFc = String(r.statusTanaman || '').toUpperCase().includes('FC');

    if (isOpen40) {
      saldo += sld;
      openOrd += (r.orderD40 || 0);
      openDrp += drp;
      openPsg += psg;

      const w = r.wilayah || 'Unknown';
      if (!wil[w]) wil[w] = { ord: 0, drp: 0, psg: 0, sld: 0, count: 0, fcHa: 0 };
      wil[w].ord += (r.orderD40 || 0);
      wil[w].drp += drp;
      wil[w].psg += psg;
      wil[w].sld += sld;
      wil[w].count++;

      if (isFc && yr === '2026') {
        donutFc += (r.luas || 0);
        wil[w].fcHa += (r.luas || 0);
      }
    }
  }

  // Calculate sort order for Ringkasan Wilayah (by % Kedatangan asc or desc?)
  // In the dashboard:
  // AW06: 15.2%
  // AW07: 22.4%
  // AW02: 25.5%
  // AW05: 37.9%
  // AW03: 39.5%
  const wilList = Object.entries(wil).map(([w, data]) => {
    const pctKedatangan = data.ord > 0 ? (data.drp / data.ord) * 100 : (data.drp > 0 ? 100 : 0);
    const pctPasang = data.drp > 0 ? (data.psg / data.drp) * 100 : 0;
    return { wilayah: w, ...data, pctKedatangan: pctKedatangan.toFixed(1) + '%', pctPasang: pctPasang.toFixed(1) + '%' };
  });
  wilList.sort((a, b) => parseFloat(a.pctKedatangan) - parseFloat(b.pctKedatangan));

  return {
    saldo,
    donutFc: Number(donutFc.toFixed(2)),
    pctKedatangan: openOrd > 0 ? ((openDrp / openOrd) * 100).toFixed(1) + '%' : '0%',
    pctPasang: openDrp > 0 ? ((openPsg / openDrp) * 100).toFixed(1) + '%' : '0%',
    wilList
  };
}

console.log('CURRENT SIMULATED STATE:');
console.log(evaluate(items));

