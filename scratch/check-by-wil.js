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

// Group by wilayah for positive saldo
const byWil = {};
for (const r of rows) {
  const pmax = Math.max(r.pasangManD40, r.pasangSapD40);
  const sld = r.dropD40 - pmax;
  const w = r.wilayah || 'UNKNOWN';
  if (!byWil[w]) byWil[w] = { totalDrop: 0, totalPasang: 0, totalSaldo: 0, petaks: [] };
  byWil[w].totalDrop += r.dropD40;
  byWil[w].totalPasang += pmax;
  byWil[w].totalSaldo += sld;
  if (sld > 0) {
    byWil[w].petaks.push({ lok: r.lokasi, drp: r.dropD40, psg: pmax, sld, ord: r.orderD40 });
  }
}

console.log('Summary by wilayah:');
for (const [w, d] of Object.entries(byWil)) {
  console.log(`Wilayah ${w}: Drop=${d.totalDrop}, Pasang=${d.totalPasang}, Saldo=${d.totalSaldo}, PosSaldoPetaks=${d.petaks.length}`);
}

