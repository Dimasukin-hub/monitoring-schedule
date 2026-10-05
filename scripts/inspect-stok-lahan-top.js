const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Stok Lahan'], cellDates: false });
const ws = wb.Sheets['Stok Lahan'];

console.log('--- STOK LAHAN ROWS 1 to 55 ---');
for (let r = 0; r <= 54; r++) {
  const cA = ws[xlsx.utils.encode_cell({ r, c: 0 })]?.v;
  const cB = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
  const cC = ws[xlsx.utils.encode_cell({ r, c: 2 })]?.v;
  if (cA !== undefined || cB !== undefined || cC !== undefined) {
    console.log(`Row ${r+1}: A="${cA || ''}", B="${cB || ''}", C="${cC || ''}"`);
  }
}
