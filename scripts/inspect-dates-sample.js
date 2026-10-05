const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

function fmtDate(v) {
  if (typeof v === 'number' && v > 40000 && v < 60000) {
    const d = xlsx.SSF.parse_date_code(v);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  return v;
}

console.log('--- SAMPLE LOCATIONS (Rows 12 to 25) ---');
for (let r = 11; r <= 25; r++) {
  const loc = ws[xlsx.utils.encode_cell({ r, c: 3 })]?.v;
  const netto = ws[xlsx.utils.encode_cell({ r, c: 5 })]?.v;
  
  let rencDates = [];
  for (let c = 13; c <= 22; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v) rencDates.push(`${ws[xlsx.utils.encode_cell({ r: 8, c })]?.v}:${fmtDate(v)}`);
  }
  
  let realDates = [];
  for (let c = 74; c <= 83; c++) {
    const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v) realDates.push(`${ws[xlsx.utils.encode_cell({ r: 8, c })]?.v}:${fmtDate(v)}`);
  }

  console.log(`Row ${r+1} (${loc}, Netto:${netto}):`);
  console.log(`  Renc Bongkar:`, rencDates.join(', '));
  console.log(`  Real Bongkar:`, realDates.join(', '));
}
