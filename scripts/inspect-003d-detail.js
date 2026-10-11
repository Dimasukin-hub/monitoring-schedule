const xlsx = require('xlsx');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx'), { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);

let row003d = -1;
for (let r = 8; r <= range.e.r; r++) {
  const cLok = ws[xlsx.utils.encode_cell({ r, c: 3 })]; // Col D = LOKASI
  if (cLok && String(cLok.v).trim().toLowerCase() === '003d') {
    row003d = r;
    break;
  }
}
console.log('Row for 003d:', row003d + 1);

if (row003d !== -1) {
  for (let c = 0; c <= range.e.c; c++) {
    const cell = ws[xlsx.utils.encode_cell({ r: row003d, c })];
    if (cell && (cell.v !== undefined || cell.f !== undefined)) {
      const header9 = ws[xlsx.utils.encode_cell({ r: 8, c })]?.v || '';
      const header7 = ws[xlsx.utils.encode_cell({ r: 6, c })]?.v || '';
      const header1 = ws[xlsx.utils.encode_cell({ r: 0, c })]?.v || '';
      const h = [header1, header7, header9].filter(Boolean).join(' -> ');
      console.log(`Col ${xlsx.utils.encode_col(c)}: [${h}] = ${cell.v} ${cell.f ? '(formula: ' + cell.f + ')' : ''}`);
    }
  }
}
