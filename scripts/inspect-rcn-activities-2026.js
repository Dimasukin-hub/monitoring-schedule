const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Rcn BERJLN Fsk'], cellDates: false });
const ws = wb.Sheets['Rcn BERJLN Fsk'];

console.log('--- Rcn BERJLN Fsk 2026 (Rows 137 to 148) ---');
const months = ['Jan-26', 'Feb-26', 'Mar-26', 'Apr-26', 'Mei-26', 'Jun-26', 'Jul-26', 'Agu-26', 'Sep-26', 'Okt-26', 'Nov-26', 'Des-26'];

for (let i = 0; i < 12; i++) {
  const r = 136 + i; // row 137 is index 136
  const m = months[i];
  
  // Col 4 (D: CHOPPER) to Col 13 (M: Kompos)
  let sumBongkarCols = 0;
  let detailBongkar = [];
  for (let c = 3; c <= 12; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (typeof v === 'number') {
      sumBongkarCols += v;
      if (v > 0) detailBongkar.push(`${ws[xlsx.utils.encode_cell({ r: 6, c })]?.v}:${v.toFixed(1)}`);
    }
  }

  // Col 16 (P: MB 5 BTR) to Col 41 (AO: Ridger)
  let sumBajakCols = 0;
  let detailBajak = [];
  for (let c = 15; c <= 40; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (typeof v === 'number') {
      sumBajakCols += v;
      if (v > 0) detailBajak.push(`${ws[xlsx.utils.encode_cell({ r: 6, c })]?.v}:${v.toFixed(1)}`);
    }
  }

  // Col 42 (AP: Jalan & Sal)
  const jalanSal = ws[xlsx.utils.encode_cell({ r, c: 41 })]?.v;

  console.log(`${m}:`);
  console.log(`  Bongkar sum: ${sumBongkarCols.toFixed(2)} (${detailBongkar.join(', ')})`);
  console.log(`  Bajak sum: ${sumBajakCols.toFixed(2)} (${detailBajak.join(', ')})`);
  console.log(`  Jalan & Sal: ${typeof jalanSal === 'number' ? jalanSal.toFixed(2) : jalanSal}`);
}
