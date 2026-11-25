const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));

const closeD40 = [];
const closeAll = [];

for (const [k, v] of Object.entries(snap)) {
  const lok = k.trim().toUpperCase();
  if (v.statusD40 && v.statusD40.trim().toLowerCase() === 'close') {
    closeD40.push(lok);
  }
  if (v.statusAll && v.statusAll.trim().toLowerCase() === 'close') {
    closeAll.push(lok);
  }
}

console.log('closeD40 count:', closeD40.length);
console.log('closeAll count:', closeAll.length);
console.log('Sample closeD40:', closeD40.slice(0, 10));

