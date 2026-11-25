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
      orderD40: parseInt(cols[14]) || 0,
      dropD40: parseInt(cols[15]) || 0,
      pasangSapD40: parseInt(cols[19]) || 0,
      pasangManD40: parseInt(cols[18]) || 0,
      statusD40: cols[20]
    });
  }
}

const aw07 = rows.filter(r => r.wilayah === 'AW07' && (r.dropD40 > 0 || r.pasangSapD40 > 0));
console.log('Total AW07 active petaks:', aw07.length);

// We want a subset of AW07 with sum(dropD40) == 149 and sum(max(psap, pman)) == 110!
function findSubsets(list, targetDrop, targetPasang) {
  const results = [];
  function search(idx, currentDrop, currentPasang, picked) {
    if (currentDrop === targetDrop && currentPasang === targetPasang) {
      results.push([...picked]);
      return;
    }
    if (idx >= list.length || currentDrop > targetDrop || currentPasang > targetPasang) {
      return;
    }
    // pick
    const item = list[idx];
    const psg = Math.max(item.pasangSapD40, item.pasangManD40);
    picked.push(item);
    search(idx + 1, currentDrop + item.dropD40, currentPasang + psg, picked);
    picked.pop();

    // do not pick
    search(idx + 1, currentDrop, currentPasang, picked);
  }
  search(0, 0, 0, []);
  return results;
}

const sol07 = findSubsets(aw07, 149, 110);
console.log('AW07 solutions:', sol07.map(s => s.map(x => `${x.lokasi}(d:${x.dropD40},p:${Math.max(x.pasangSapD40, x.pasangManD40)})`)));

// Also check AW05: target drop = 178, pasang = 145!
const aw05 = rows.filter(r => r.wilayah === 'AW05' && (r.dropD40 > 0 || r.pasangSapD40 > 0));
const sol05 = findSubsets(aw05, 178, 145);
console.log('AW05 solutions:', sol05.map(s => s.map(x => `${x.lokasi}(d:${x.dropD40},p:${Math.max(x.pasangSapD40, x.pasangManD40)})`)));

// Also check AW03: target drop = 316, pasang = 260!
const aw03 = rows.filter(r => r.wilayah === 'AW03' && (r.dropD40 > 0 || r.pasangSapD40 > 0));
const sol03 = findSubsets(aw03, 316, 260);
console.log('AW03 solutions:', sol03.map(s => s.map(x => `${x.lokasi}(d:${x.dropD40},p:${Math.max(x.pasangSapD40, x.pasangManD40)})`)));

