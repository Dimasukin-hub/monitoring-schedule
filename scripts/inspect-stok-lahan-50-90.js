const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Stok Lahan'], cellDates: false });
const ws = wb.Sheets['Stok Lahan'];

console.log('--- ALL ROWS 50 to 90 IN STOK LAHAN ---');
for (let r = 49; r <= 89; r++) {
  const cA = ws[xlsx.utils.encode_cell({ r, c: 0 })]?.v;
  const cB = ws[xlsx.utils.encode_cell({ r, c: 1 })]?.v;
  const cC = ws[xlsx.utils.encode_cell({ r, c: 2 })]?.v;
  const cE = ws[xlsx.utils.encode_cell({ r, c: 4 })]?.v;
  const cP = ws[xlsx.utils.encode_cell({ r, c: 15 })]?.v;
  if (cA !== undefined || cB !== undefined || cC !== undefined || cE !== undefined) {
    console.log(`Row ${r+1}: A="${cA || ''}" | B="${cB || ''}" | C="${cC || ''}" | Jan="${cE || ''}" | Des="${cP || ''}"`);
  }
}
