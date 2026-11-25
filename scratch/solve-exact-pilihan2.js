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

console.log('Total rows loaded:', rows.length);

// In AW02:
// Target drop = 104, pasang = 40!
// Which petaks in AW02 were open?
// Let's see all petaks in AW02 that are in 2026:
const aw02 = rows.filter(r => r.wilayah === 'AW02' && String(r.tanggalOrder && r.tanggalOrder !== '-' ? r.tanggalOrder.slice(0, 4) : '2026') === '2026');
console.log('AW02 petaks count:', aw02.length);

// Target open in AW02: 024B (drp 65, psg 10) + 024C (drp 30, psg 30) = drp 95, psg 40... wait!
// What petaks make 104 and 40?
for (let i = 0; i < aw02.length; i++) {
  for (let j = i + 1; j < aw02.length; j++) {
    const dSum = aw02[i].dropD40 + aw02[j].dropD40;
    const pSum = Math.max(aw02[i].pasangManD40, aw02[i].pasangSapD40) + Math.max(aw02[j].pasangManD40, aw02[j].pasangSapD40);
    if (pSum === 40) {
      console.log('Pair:', aw02[i].lokasi, aw02[j].lokasi, 'drp:', dSum, 'psg:', pSum);
    }
  }
}

