const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];

console.log('Row 3 Headers with column addresses:');
for (let c = 0; c <= 20; c++) {
  const cellAddress = xlsx.utils.encode_cell({ r: 3, c });
  const val = ws[cellAddress]?.v;
  if (val !== undefined) {
    console.log(`Col ${c} (${xlsx.utils.encode_col(c)}): "${val}"`);
  }
}
