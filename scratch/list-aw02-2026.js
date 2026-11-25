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
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
    });
  }
}

const aw02_2026 = rows.filter(r => {
  const itemYear = String((r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026'));
  return r.wilayah === 'AW02' && itemYear === '2026';
});

console.log('AW02 2026 petaks (' + aw02_2026.length + '):');
for (const p of aw02_2026) {
  const pmax = Math.max(p.pasangManD40, p.pasangSapD40);
  console.log(`${p.lokasi.padEnd(8)} drp:${String(p.dropD40).padStart(3)} psg:${String(pmax).padStart(3)} sld:${String(p.dropD40 - pmax).padStart(3)} stAll:${p.statusAll} st40:${p.statusD40}`);
}

