const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

console.log('Available sheets in Monitor Schedule - 2026.xlsx:');
console.log(wb.SheetNames);

const sheetName = 'RTN';
const ws = wb.Sheets[sheetName];

if (!ws) {
  console.log(`Sheet "${sheetName}" not found! Available sheets:`, wb.SheetNames.filter(s => s.toLowerCase().includes('rtn') || s.toLowerCase().includes('tanam')));
} else {
  console.log(`Sheet "${sheetName}" found! Range:`, ws['!ref']);
  const range = xlsx.utils.decode_range(ws['!ref']);
  
  // Cari baris yang mengandung 'Update Real Tanam Nanas' atau 'lokasi'
  for (let r = range.s.r; r <= Math.min(range.s.r + 30, range.e.r); r++) {
    const rowValues = [];
    for (let c = range.s.c; c <= Math.min(range.s.c + 40, range.e.c); c++) {
      const val = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (val !== undefined) {
        rowValues.push({ col: c, val });
      }
    }
    if (rowValues.length > 0) {
      console.log(`Row ${r}:`, rowValues.map(v => `[c${v.col}:${v.val}]`).join(' '));
    }
  }
}
