const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const entries = Object.values(snap);
const aw02 = entries.filter(r => r.wilayah === 'AW02');

function findExact(list, targetDrop, targetPasang) {
  const res = [];
  function rec(idx, cD, cP, current) {
    if (cD === targetDrop && cP === targetPasang) {
      res.push([...current]);
      return;
    }
    if (idx >= list.length || cD > targetDrop || cP > targetPasang) return;
    const item = list[idx];
    const psg = Math.max(item.pasangManD40 || 0, item.pasangSapD40 || 0);
    const drp = item.dropD40 || 0;
    current.push(item);
    rec(idx + 1, cD + drp, cP + psg, current);
    current.pop();
    rec(idx + 1, cD, cP, current);
  }
  rec(0, 0, 0, []);
  return res;
}

const match02 = findExact(aw02, 104, 40);
console.log('Match AW02 in snap:', match02.map(m => m.map(x => `${x.lokasi}(d:${x.dropD40},p:${x.pasangSapD40})`)));

const aw07 = entries.filter(r => r.wilayah === 'AW07');
const match07 = findExact(aw07, 149, 110);
console.log('Match AW07 in snap:', match07.map(m => m.map(x => `${x.lokasi}(d:${x.dropD40},p:${x.pasangSapD40})`)));

const aw05 = entries.filter(r => r.wilayah === 'AW05');
const match05 = findExact(aw05, 178, 145);
console.log('Match AW05 in snap:', match05.map(m => m.map(x => `${x.lokasi}(d:${x.dropD40},p:${x.pasangSapD40})`)));

