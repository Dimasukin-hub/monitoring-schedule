const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- MASTER ROWS 728-740 FOR DS, DT, DU ---');
for (let r = 727; r <= 745; r++) {
  const cDS = ws[xlsx.utils.encode_cell({ r, c: 122 })];
  const cDT = ws[xlsx.utils.encode_cell({ r, c: 123 })];
  const cDU = ws[xlsx.utils.encode_cell({ r, c: 124 })];
  const cF = ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v;
  const cD = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
  console.log(`Row ${r+1} (${cD}): Netto=${cF} | DS=[val:${cDS?.v}, f:${cDS?.f}] | DT=[val:${cDT?.v}, f:${cDT?.f}] | DU=[val:${cDU?.v}, f:${cDU?.f}]`);
}
