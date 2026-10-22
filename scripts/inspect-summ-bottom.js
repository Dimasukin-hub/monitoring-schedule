const xlsx = require('xlsx');
const wb = xlsx.readFile('excel/Monitor Schedule - 2026.xlsx');
const ws = wb.Sheets['Summ Bibit & Panen'];

for (let r = 78; r <= 93; r++) {
  let row = {};
  for (let c = 27; c <= 35; c++) {
    const col = xlsx.utils.encode_col(c);
    const cell = ws[col + r];
    if (cell && cell.v !== undefined) {
      row[col] = cell.f ? { v: cell.v, f: cell.f } : cell.v;
    }
  }
  if (Object.keys(row).length > 0) console.log('Row ' + r + ':', row);
}
