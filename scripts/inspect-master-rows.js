const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

console.log('=== INSPECT ROWS 11 TO 15 IN MASTER ===');
for (let r = 10; r <= 15; r++) {
  console.log(`\n--- Row ${r+1} ---`);
  const cNetto = ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v; // col F
  const cLokasi = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v; // col D
  console.log(`Lokasi: ${cLokasi}, Netto: ${cNetto}`);
  
  // Chopper (c=13) to Kompos (c=22)
  console.log('Bongkar (c13-c22):');
  for (let c = 13; c <= 22; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v) console.log(`  col${c+1}(${xlsx.utils.encode_col(c)}): ${v}`);
  }
  
  // Real columns for Chopper to Kompos?
  // Let's check if there are Real columns further to the right!
}
