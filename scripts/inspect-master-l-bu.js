const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- CHECKING COLUMNS L (11), BU (72), M (12), BV (73) ---');
for (let r = 11; r <= 30; r++) {
  const cL = ws[xlsx.utils.encode_cell({ r, c: 11 })];
  const cBU = ws[xlsx.utils.encode_cell({ r, c: 72 })];
  const cM = ws[xlsx.utils.encode_cell({ r, c: 12 })];
  const cBV = ws[xlsx.utils.encode_cell({ r, c: 73 })];
  const loc = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
  console.log(`Row ${r+1} (${loc}): L=[val:${cL?.v}, f:${cL?.f}] | BU=[val:${cBU?.v}, f:${cBU?.f}] | M=[val:${cM?.v}, f:${cM?.f}] | BV=[val:${cBV?.v}, f:${cBV?.f}]`);
}
