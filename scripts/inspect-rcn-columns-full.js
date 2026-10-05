const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- ALL COLUMNS IN Rcn BERJLN Fsk (Row 6, 7, and sample values 137-148) ---');
for (let c = 0; c <= 60; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const r6 = ws[xlsx.utils.encode_cell({ r: 5, c })]?.v;
  const r7 = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v;
  
  // check sum of rows 137-148 (r=136 to 147)
  let vals = [];
  let sum = 0;
  for (let r = 136; r <= 147; r++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (typeof v === 'number') sum += v;
    vals.push(v);
  }
  
  if (r6 !== undefined || r7 !== undefined || sum > 0) {
    console.log(`Col ${c+1} (${colLetter}): Header='${r6 || ''}' / '${r7 || ''}' | Sum2026=${sum.toFixed(2)} | Jan=${vals[0]}, Feb=${vals[1]}, Dec=${vals[11]}`);
  }
}
