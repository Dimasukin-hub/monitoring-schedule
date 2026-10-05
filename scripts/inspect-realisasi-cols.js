const xlsx = require('xlsx');
const path = require('path');

const wb = xlsx.readFile(path.join(__dirname, '..', 'excel', 'Monitor Schedule - 2026.xlsx'));
const s = wb.Sheets['Data'];

console.log('=== COLUMNS 40 to 52 (Around Ridger in main schedule) ===');
for (let c = 40; c <= 52; c++) {
  const r0 = s[xlsx.utils.encode_cell({ r: 0, c })]?.v || '';
  const r1 = s[xlsx.utils.encode_cell({ r: 1, c })]?.v || '';
  const r2 = s[xlsx.utils.encode_cell({ r: 2, c })]?.v || '';
  const r3 = s[xlsx.utils.encode_cell({ r: 3, c })]?.v || '';
  const r4 = s[xlsx.utils.encode_cell({ r: 4, c })]?.v || '';
  const s5 = s[xlsx.utils.encode_cell({ r: 5, c })]?.w || s[xlsx.utils.encode_cell({ r: 5, c })]?.v || '';
  console.log(`c=${c} (${xlsx.utils.encode_col(c)}): r0="${r0}" r1="${r1}" r2="${r2}" r3="${r3}" r4="${r4}" sample="${s5}"`);
}

console.log('\n=== COLUMNS 95 to 100 (Around 21.Ridger in realisasi) ===');
for (let c = 95; c <= 100; c++) {
  const r0 = s[xlsx.utils.encode_cell({ r: 0, c })]?.v || '';
  const r1 = s[xlsx.utils.encode_cell({ r: 1, c })]?.v || '';
  const r2 = s[xlsx.utils.encode_cell({ r: 2, c })]?.v || '';
  const r3 = s[xlsx.utils.encode_cell({ r: 3, c })]?.v || '';
  const r4 = s[xlsx.utils.encode_cell({ r: 4, c })]?.v || '';
  const s5 = s[xlsx.utils.encode_cell({ r: 5, c })]?.w || s[xlsx.utils.encode_cell({ r: 5, c })]?.v || '';
  console.log(`c=${c} (${xlsx.utils.encode_col(c)}): r0="${r0}" r1="${r1}" r2="${r2}" r3="${r3}" r4="${r4}" sample="${s5}"`);
}
