const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

console.log('Validating', items.length, 'items:');
let invalidCount = 0;
for (const item of items) {
  if (typeof item.lokasi !== 'string') {
    console.log('Invalid lokasi:', item);
    invalidCount++;
  }
}
console.log('Invalid count:', invalidCount);

