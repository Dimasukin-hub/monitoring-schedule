const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

// Inspect first item keys:
const item0 = items[0];
console.log('Keys in snapshot item:', Object.keys(item0));

