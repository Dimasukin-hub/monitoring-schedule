const xlsx = require('xlsx');

// 1. Check Monitor Schedule - 2026.xlsx sheet Summ
const wb1 = xlsx.readFile('excel/Monitor Schedule - 2026.xlsx');
console.log('Sheet names in Monitor Schedule:', wb1.SheetNames);
for (const s of wb1.SheetNames) {
  const ws = wb1.Sheets[s];
  if (!ws['!ref']) continue;
  const range = xlsx.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= Math.min(range.e.r, 100); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 30); c++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      const val = String(cell?.v || '');
      if (val.toLowerCase().includes('barat') || val.toLowerCase().includes('timur')) {
        console.log(`[${s}] ${xlsx.utils.encode_cell({ r, c })}: ${val}`);
      }
    }
  }
}

// 2. Check Monitor Siap Nanas Update.xlsx
const wb2 = xlsx.readFile('excel/Monitor Siap Nanas Update.xlsx');
console.log('\nSheet names in Monitor Siap Nanas Update:', wb2.SheetNames);
for (const s of wb2.SheetNames) {
  const ws = wb2.Sheets[s];
  if (!ws['!ref']) continue;
  const range = xlsx.utils.decode_range(ws['!ref']);
  for (let r = range.s.r; r <= Math.min(range.e.r, 100); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 30); c++) {
      const cell = ws[xlsx.utils.encode_cell({ r, c })];
      const val = String(cell?.v || '');
      if (val.toLowerCase().includes('barat') || val.toLowerCase().includes('timur')) {
        console.log(`[${s}] ${xlsx.utils.encode_cell({ r, c })}: ${val}`);
      }
    }
  }
}
