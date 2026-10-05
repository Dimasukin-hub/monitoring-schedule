const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

console.log('Finding rows with progress or dates...');
let sampled = 0;
for (let r = 5; r <= range.e.r; r++) {
  const loc = getCell(r, 3);
  if (!loc || loc === 'Total') continue;
  const progress = getCell(r, 10);
  const awalTnm = getCell(r, 11);
  const leadtime = getCell(r, 12);
  const estSls = getCell(r, 9);
  
  if (progress !== undefined || awalTnm !== undefined || leadtime !== undefined || (estSls && estSls > 40000)) {
    console.log(`Row ${r} [${loc}]: Luas=${getCell(r, 4)} Real=${getCell(r, 7)} Sisa=${getCell(r, 8)} EstSls=${estSls} Prog=${progress} AwalTnm=${awalTnm} Leadtime=${leadtime}`);
    sampled++;
    if (sampled > 15) break;
  }
}
