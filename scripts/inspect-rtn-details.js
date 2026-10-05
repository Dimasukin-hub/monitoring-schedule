const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];
const range = xlsx.utils.decode_range(ws['!ref']);

const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

console.log('Headers (Row 3):');
for (let c = 3; c <= 12; c++) {
  console.log(`Col ${c}: ${getCell(3, c)}`);
}

console.log('\nSample rows (Row 4 to 15):');
for (let r = 4; r <= 15; r++) {
  const row = [];
  for (let c = 3; c <= 12; c++) {
    row.push(`${getCell(3, c)}: ${getCell(r, c)}`);
  }
  console.log(`Row ${r}:`, row.join(' | '));
}

let countValidRows = 0;
for (let r = 4; r <= range.e.r; r++) {
  const loc = getCell(r, 3);
  if (loc && String(loc).trim() !== '' && String(loc).trim() !== '-' && loc !== 'Total') {
    countValidRows++;
  }
}
console.log(`\nTotal valid data rows in RTN table (Col 3 to 12): ${countValidRows}`);
