const xlsx = require('xlsx');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);

const dsIdx = xlsx.utils.decode_col('DS');
const dtIdx = xlsx.utils.decode_col('DT');
const duIdx = xlsx.utils.decode_col('DU');

console.log('--- FINDING ROWS WITH VALUES IN DS, DT, DU ---');
let count = 0;
for (let r = 0; r <= range.e.r; r++) {
  const cellDS = ws[xlsx.utils.encode_cell({ r, c: dsIdx })];
  const cellDT = ws[xlsx.utils.encode_cell({ r, c: dtIdx })];
  const cellDU = ws[xlsx.utils.encode_cell({ r, c: duIdx })];
  if (cellDS || cellDT || cellDU) {
    count++;
    if (count <= 25) {
      console.log(`Row ${r+1}: DS=[v=${cellDS?.v}, f=${cellDS?.f}] | DT=[v=${cellDT?.v}, f=${cellDT?.f}] | DU=[v=${cellDU?.v}, f=${cellDU?.f}]`);
    }
  }
}
console.log('Total rows with DS/DT/DU:', count);
