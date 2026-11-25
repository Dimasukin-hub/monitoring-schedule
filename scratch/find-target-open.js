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
      statusAll: cols[11],
      isClosedExcel: cols[12] === 't',
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
      statusD40: cols[20],
      saldoD40: (parseInt(cols[15]) || 0) - Math.max(parseInt(cols[18]) || 0, parseInt(cols[19]) || 0)
    });
  }
}

// Let's inspect AW07: Target drop=149, pasang=110, saldo = 39!
const aw07 = rows.filter(r => r.wilayah === 'AW07');
console.log('AW07 petaks:');
for (const r of aw07) {
  const psg = Math.max(r.pasangManD40, r.pasangSapD40);
  console.log(`${r.lokasi.padEnd(8)} drp:${String(r.dropD40).padStart(3)} psg:${String(psg).padStart(3)} sld:${String(r.saldoD40).padStart(3)} st40:${r.statusD40}`);
}

