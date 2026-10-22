const xlsx = require('xlsx');
const wb = xlsx.readFile('excel/Monitor Schedule - 2026.xlsx');
const ws = wb.Sheets['RTN'];

let allRows = [];
for (let r = 6; r <= 368; r++) {
  const loc = ws['D' + r]?.v;
  if (!loc) continue;
  allRows.push({
    r,
    loc,
    luas: Number(ws['E' + r]?.v || 0),
    real: Number(ws['H' + r]?.v || 0),
    sisa: Number(ws['I' + r]?.v || 0),
    progress: ws['K' + r]?.v !== undefined && ws['K' + r]?.v !== '' ? Number(ws['K' + r].v) : (Number(ws['H' + r]?.v || 0) / Number(ws['E' + r]?.v || 1)),
    leadtime: ws['M' + r]?.v !== undefined && typeof ws['M' + r]?.v === 'number' ? ws['M' + r].v : null,
    cekTanam: ws['X' + r]?.v === 'a'
  });
}

console.log('Total valid rows in RTN:', allRows.length);
let sumLuas = 0, sumReal = 0, sumSisa = 0;
let leadSumAll = 0, leadCountAll = 0;
for (const r of allRows) {
  sumLuas += r.luas;
  sumReal += r.real;
  sumSisa += r.sisa;
  if (r.leadtime !== null) {
    leadSumAll += r.leadtime;
    leadCountAll++;
  }
}

console.log('RTN Total Luas:', sumLuas);
console.log('RTN Total Real:', sumReal);
console.log('RTN Total Sisa (Real - Luas):', sumSisa);
console.log('Weighted Progress (Real/Luas):', ((sumReal / sumLuas) * 100).toFixed(4) + '%');
console.log('Leadtime All valid count:', leadCountAll, 'Sum:', leadSumAll, 'Avg:', (leadSumAll / leadCountAll).toFixed(1) + ' hari');

// Ongoing rows (Cek Tanam === 'a' or Sisa < 0)
const ongoing = allRows.filter(r => r.sisa < 0);
console.log('\n--- ONGOING / SISA < 0 (Count: ' + ongoing.length + ') ---');
let onLuas = 0, onReal = 0, onSisa = 0, onLeadSum = 0, onLeadCount = 0, onProgSum = 0;
for (const r of ongoing) {
  onLuas += r.luas;
  onReal += r.real;
  onSisa += r.sisa;
  onProgSum += (r.real / r.luas);
  if (r.leadtime !== null) {
    onLeadSum += r.leadtime;
    onLeadCount++;
  }
}
console.log('Ongoing Total Luas:', onLuas.toFixed(2));
console.log('Ongoing Total Real:', onReal.toFixed(2));
console.log('Ongoing Total Sisa:', onSisa.toFixed(2));
console.log('Ongoing Weighted Progress:', ((onReal / onLuas) * 100).toFixed(2) + '%');
console.log('Ongoing Simple Avg Progress:', ((onProgSum / ongoing.length) * 100).toFixed(2) + '%');
console.log('Ongoing Leadtime Count:', onLeadCount, 'Avg Leadtime:', (onLeadSum / onLeadCount).toFixed(1) + ' hari');
