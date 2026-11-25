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
      statusD40: cols[20],
      statusD60: cols[26],
      statusD80: cols[32],
      statusD100: cols[38],
    });
  }
}

const stAllCounts = {};
const stD40Counts = {};
for (const r of rows) {
  stAllCounts[r.statusAll] = (stAllCounts[r.statusAll] || 0) + 1;
  stD40Counts[r.statusD40] = (stD40Counts[r.statusD40] || 0) + 1;
}

console.log('stAllCounts:', stAllCounts);
console.log('stD40Counts:', stD40Counts);

