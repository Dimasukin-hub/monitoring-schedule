const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['Master'];

console.log('--- MASTER ROWS FOR DS, DT, DU, DO, DP, DQ ---');
for (let r = 11; r <= 30; r++) {
  const cDS = ws[xlsx.utils.encode_cell({ r, c: 122 })];
  const cDT = ws[xlsx.utils.encode_cell({ r, c: 123 })];
  const cDU = ws[xlsx.utils.encode_cell({ r, c: 124 })];
  const cDO = ws[xlsx.utils.encode_cell({ r, c: 118 })];
  const cDP = ws[xlsx.utils.encode_cell({ r, c: 119 })];
  const cDQ = ws[xlsx.utils.encode_cell({ r, c: 120 })];
  const cF = ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v;
  const cD = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
  console.log(`Row ${r+1} (${cD}): Netto=${cF} | DO=${cDO?.v}(f:${cDO?.f}) | DP=${cDP?.v}(f:${cDP?.f}) | DQ=${cDQ?.v}(f:${cDQ?.f}) | DS=${cDS?.v}(f:${cDS?.f}) | DT=${cDT?.v}(f:${cDT?.f}) | DU=${cDU?.v}(f:${cDU?.f})`);
}
