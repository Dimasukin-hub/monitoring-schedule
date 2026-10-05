const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });
const ws = wb.Sheets['RTN'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

const estSlsSet = new Set();
let countWithEstDate = 0;
let countWithEstOther = 0;

for (let r = 5; r <= range.e.r; r++) {
  const loc = getCell(r, 3);
  if (!loc || loc === 'Total') continue;
  const est = getCell(r, 9);
  if (est !== undefined) {
    if (typeof est === 'number' && est > 40000) {
      countWithEstDate++;
    } else {
      countWithEstOther++;
      estSlsSet.add(est);
    }
  }
}

console.log(`Est. Sls with serial date (>40000): ${countWithEstDate}`);
console.log(`Est. Sls with other values: ${countWithEstOther}`, Array.from(estSlsSet));
