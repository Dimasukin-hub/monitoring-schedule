const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

console.log('=== SEARCHING FOR RENCANA & REALISASI SUMMARY TABLES IN ALL SHEETS ===');
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= Math.min(range.e.c, 30); c++) {
      const v = String(ws[xlsx.utils.encode_cell({ r, c })]?.v || '').trim();
      if (
        (v.toLowerCase().includes('rencana') && v.toLowerCase().includes('realisasi')) ||
        v.toLowerCase().includes('renc') ||
        v.toLowerCase().includes('real')
      ) {
        if (v.toLowerCase().includes('bongkar') || v.toLowerCase().includes('bajak') || v.toLowerCase().includes('siap tanam') || v.toLowerCase().includes('2026')) {
          console.log(`Sheet "${name}", R${r+1}C${c+1}: "${v}"`);
        }
      }
    }
  }
}
