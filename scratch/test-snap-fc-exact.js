const fs = require('fs');
const snap = JSON.parse(fs.readFileSync('data/lokasi-order-snapshot.json', 'utf8'));
const items = Object.values(snap).filter(x => x && x.lokasi && !x.lokasi.startsWith('TOTAL'));

const fc2026 = items.filter(it => {
  const yr = it.tahun || (it.tanggalOrder && it.tanggalOrder !== '-' ? it.tanggalOrder.slice(0, 4) : '2026');
  const st = String(it.statusTanaman || it.status || '').trim().toUpperCase();
  return yr === '2026' && st.includes('FC');
});

console.log('Total FC 2026 petaks in snapshot:', fc2026.length);

// In snapshot, let's see which petaks have statusD40 !== 'Close'
const nonCloseD40 = fc2026.filter(it => String(it.statusD40 || '').toLowerCase() !== 'close');
console.log('Non-close D40 in snapshot:', nonCloseD40.length);
console.log('Sum luas non-close D40:', nonCloseD40.reduce((a, b) => a + (b.luas || 0), 0).toFixed(2));

// Let's search which subset of fc2026 sums to EXACTLY 311.26:
function findExact(target) {
  const results = [];
  function search(idx, currentSum, picked) {
    if (Math.abs(currentSum - target) < 0.01) {
      results.push([...picked]);
      return;
    }
    if (idx >= fc2026.length || currentSum > target + 0.05) return;
    
    // Prune: if remaining sum is not enough
    // Only search subset close to naturally open
    picked.push(fc2026[idx]);
    search(idx + 1, currentSum + (fc2026[idx].luas || 0), picked);
    picked.pop();
    search(idx + 1, currentSum, picked);
  }
}

