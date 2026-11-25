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
      tanggalOrder: cols[6],
      dropD40: parseInt(cols[15]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
    });
  }
}

const aw02 = rows.filter(r => r.wilayah === 'AW02');
// Find subsets with sum(drop) === 104 and sum(pasang) === 40!
function findExact(list, targetDrop, targetPasang) {
  const res = [];
  function rec(idx, cD, cP, current) {
    if (cD === targetDrop && cP === targetPasang) {
      res.push([...current]);
      return;
    }
    if (idx >= list.length || cD > targetDrop || cP > targetPasang) return;
    const item = list[idx];
    const psg = Math.max(item.pasangManD40, item.pasangSapD40);
    current.push(item);
    rec(idx + 1, cD + item.dropD40, cP + psg, current);
    current.pop();
    rec(idx + 1, cD, cP, current);
  }
  rec(0, 0, 0, []);
  return res;
}

const match = findExact(aw02, 104, 40);
console.log('Exact match for AW02 104/40:', match.map(m => m.map(x => x.lokasi)));

// Also check AW07: 149 / 110!
const aw07 = rows.filter(r => r.wilayah === 'AW07');
const match07 = findExact(aw07, 149, 110);
console.log('Exact match for AW07 149/110:', match07.map(m => m.map(x => x.lokasi)));

// Also check AW05: 178 / 145!
const aw05 = rows.filter(r => r.wilayah === 'AW05');
const match05 = findExact(aw05, 178, 145);
console.log('Exact match for AW05 178/145:', match05.map(m => m.map(x => x.lokasi)));

// Also check AW03: 316 / 260!
const aw03 = rows.filter(r => r.wilayah === 'AW03');
const match03 = findExact(aw03, 316, 260);
console.log('Exact match for AW03 316/260:', match03.map(m => m.map(x => x.lokasi)));

