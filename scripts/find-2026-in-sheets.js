const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

console.log('--- CHECKING MONTH CODES 12026..122026 ACROSS ALL SHEETS ---');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  let found = [];
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (v === '12026' || v === 12026 || v === '2026') {
        found.push(`R${r+1}C${c+1}(${xlsx.utils.encode_col(c)}):${v}`);
      }
    }
  }
  if (found.length > 0) {
    console.log(`Sheet "${name}" has:`, found.slice(0, 10).join(', '));
  }
}
