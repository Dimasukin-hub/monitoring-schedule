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

// 1. Close D40 list
const closeD40 = [];
const closeAll = [];
for (const [k, v] of Object.entries(snap)) {
  const lok = k.trim().toUpperCase();
  if (v.statusD40 && v.statusD40.trim().toLowerCase() === 'close') closeD40.push(lok);
  if (v.statusAll && v.statusAll.trim().toLowerCase() === 'close') closeAll.push(lok);
}

for (const r of rows) {
  const uLok = r.lokasi.trim().toUpperCase();
  if (closeD40.includes(uLok)) r.statusD40 = 'Close';
  if (closeAll.includes(uLok)) r.statusAll = 'Close';
}

// Now check AW02, AW07, AW05, AW03, Donut FC, and Saldo
const byWil = {};
let totalOpenFcHa = 0;
let totalOpenSaldo = 0;
let openOrderSum = 0;
let openDropSum = 0;
let openPasangSum = 0;

for (const r of rows) {
  const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
  if (isClose) continue;

  const itemYr = String(r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026');
  const pmax = Math.max(r.pasangManD40, r.pasangSapD40);
  const sld = r.dropD40 - pmax;

  totalOpenSaldo += sld;

  if (itemYr === '2026') {
    const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
    if (isFC) totalOpenFcHa += r.luas;

    openOrderSum += r.orderD40;
    openDropSum += r.dropD40;
    openPasangSum += pmax;

    const w = r.wilayah || 'UNKNOWN';
    if (!byWil[w]) byWil[w] = { drop: 0, pasang: 0, order: 0, petaks: [] };
    byWil[w].drop += r.dropD40;
    byWil[w].pasang += pmax;
    byWil[w].order += r.orderD40;
    byWil[w].petaks.push({ lok: r.lokasi, drp: r.dropD40, psg: pmax });
  }
}

console.log({
  totalOpenFcHa: totalOpenFcHa.toFixed(2),
  openDropSum,
  openPasangSum,
  pctPemasangan: (openPasangSum / openDropSum * 100).toFixed(1)
});

console.log('AW02:', byWil['AW02']);
console.log('AW07:', byWil['AW07']);
console.log('AW05:', byWil['AW05']);
console.log('AW03:', byWil['AW03']);

