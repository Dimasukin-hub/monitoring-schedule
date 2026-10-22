const xlsx = require('xlsx');
const wb = xlsx.readFile('excel/Monitor Schedule - 2026.xlsx');
const ws = wb.Sheets['Summ Bibit & Panen'];

for (let r = 40; r <= 98; r++) {
  for (let c = 0; c <= 45; c++) {
    const col = xlsx.utils.encode_col(c);
    const cell = ws[col + r];
    if (cell && cell.f) {
      if (cell.f.includes('AVERAGE') || cell.f.includes('M:M') || cell.f.includes('Leadtime') || cell.f.includes('AH')) {
        console.log('Cell ' + col + r + ': f=' + cell.f + ' v=' + cell.v);
      }
    }
  }
}
