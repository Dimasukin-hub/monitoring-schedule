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
      statusD40: cols[20],
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
    });
  }
}

const fc2026 = rows.filter(r => {
  const itemYear = String((r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026'));
  const isClose = (r.statusAll || '').trim().toLowerCase() === 'close' || (r.statusD40 || '').trim().toLowerCase() === 'close';
  const isFC = (r.statusTanaman || '').toUpperCase() === 'FC' || (r.statusTanaman || '').toUpperCase().endsWith('FC');
  return itemYear === '2026' && !isClose && isFC;
});

console.log('Total open 2026 FC petaks:', fc2026.length);
let sumHa = 0;
for (const p of fc2026) {
  sumHa += p.luas;
  const pmax = Math.max(p.pasangManD40, p.pasangSapD40);
  console.log(`${p.lokasi.padEnd(8)} wil:${p.wilayah} luas:${p.luas.toFixed(2).padStart(6)} drp:${String(p.dropD40).padStart(3)} psg:${String(pmax).padStart(3)} sld:${String(p.dropD40 - pmax).padStart(3)}`);
}
console.log('Total Ha:', sumHa.toFixed(2));

