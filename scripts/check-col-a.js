const xlsx = require('xlsx');
const path = require('path');
const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);
const getCell = (r, c) => ws[xlsx.utils.encode_cell({ r, c })]?.v;

const colAValues = new Map();
for (let r = 11; r <= range.e.r; r++) {
  const val = getCell(r, 0);
  if (val !== undefined && val !== null) {
    const s = String(val).trim();
    colAValues.set(s, (colAValues.get(s) || 0) + 1);
  }
}

console.log('Unique values in Column A (Master):');
for (const [k, v] of colAValues.entries()) {
  console.log(`  "${k}": ${v} rows`);
}
