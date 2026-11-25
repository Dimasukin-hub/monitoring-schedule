const fs = require('fs');
const content = fs.readFileSync('C:/Users/HYPE AMD/.gemini/antigravity/brain/080fdd65-20c3-4564-b313-e142ca6f9367/lokasi_order_nov24.sql', 'utf8');

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
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
      statusD40: cols[20]
    });
  }
}

// Year 2026 filter!
const byWil2026 = {};
let totalOpenSaldo = 0;
let totalOpenDrop = 0;
let totalOpenPasang = 0;
let totalOpenFcHa = 0;

for (const r of rows) {
  const itemYear = String(
    (r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026')
  );
  if (itemYear !== '2026') continue;

  const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
  if (isClose) continue;

  const pmax = Math.max(r.pasangManD40, r.pasangSapD40);
  const sld = r.dropD40 - pmax;
  const w = r.wilayah || 'UNKNOWN';
  if (!byWil2026[w]) byWil2026[w] = { totalDrop: 0, totalPasang: 0, totalSaldo: 0, petaks: [] };
  byWil2026[w].totalDrop += r.dropD40;
  byWil2026[w].totalPasang += pmax;
  byWil2026[w].totalSaldo += sld;
  byWil2026[w].petaks.push({ lok: r.lokasi, drp: r.dropD40, psg: pmax, sld });

  totalOpenSaldo += sld;
  totalOpenDrop += r.dropD40;
  totalOpenPasang += pmax;

  const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
  if (isFC) {
    totalOpenFcHa += (r.luas || 0);
  }
}

console.log('--- 2026 ONLY ---');
console.log({ totalOpenSaldo, totalOpenDrop, totalOpenPasang, totalOpenFcHa: totalOpenFcHa.toFixed(2) });
for (const [w, d] of Object.entries(byWil2026)) {
  console.log(`Wilayah ${w}: Drop=${d.totalDrop}, Pasang=${d.totalPasang}, Saldo=${d.totalSaldo}`);
}

