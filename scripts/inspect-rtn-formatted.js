const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];

const cols = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
console.log('Headers:');
cols.forEach(c => console.log(`${c}: ${ws[`${c}4`]?.v || ws[`${c}3`]?.v}`));

console.log('\nRows 360 - 368:');
for (let r = 360; r <= 368; r++) {
  const rowVals = cols.map(c => {
    const cell = ws[`${c}${r}`];
    return `${c}: ${cell ? cell.w || cell.v : 'null'}`;
  });
  console.log(`Row ${r} -> ${rowVals.join(' | ')}`);
}

console.log('\nRows 5 - 10:');
for (let r = 5; r <= 10; r++) {
  const rowVals = cols.map(c => {
    const cell = ws[`${c}${r}`];
    return `${c}: ${cell ? cell.w || cell.v : 'null'}`;
  });
  console.log(`Row ${r} -> ${rowVals.join(' | ')}`);
}
