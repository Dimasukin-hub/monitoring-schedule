const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- Rcn BERJLN Fsk ROW 137 (Jan 2026) formulas & values ---');
for (let c = 0; c <= 45; c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const h = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v;
  const cell = ws[xlsx.utils.encode_cell({ r: 136, c })];
  console.log(`c=${c} | Col ${c+1} (${colLetter}) [${h}]: val=${cell?.v}, formula=${cell?.f || 'none'}`);
}
