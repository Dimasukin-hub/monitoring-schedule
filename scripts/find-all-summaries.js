const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('=== INSPECT ALL SUMMARY TITLES IN Rcn BERJLN Fsk ===');
for (let r = 0; r <= 260; r++) {
  for (let c = 0; c <= 10; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v && typeof v === 'string' && (v.includes('SUMMARY') || v.includes('REALISASI') || v.includes('RENCANA') || v.includes('2026'))) {
      console.log(`Row ${r+1}, Col ${c+1}: ${v}`);
    }
  }
}
