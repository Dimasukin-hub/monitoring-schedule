const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

console.log('=== CHECK MASTER SHEET ROWS 8-10 ===');
const wsMaster = wb.Sheets['Master'];
for (let r = 7; r <= 10; r++) {
  let cols = [];
  for (let c = 0; c <= 110; c++) {
    const v = wsMaster[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) {
      cols.push(`[c${c}|col${c+1}|${xlsx.utils.encode_col(c)}:${v}]`);
    }
  }
  console.log(`Row ${r+1}:`, cols.filter(s => s.toLowerCase().includes('chopper') || s.toLowerCase().includes('kompos') || s.toLowerCase().includes('mb 5') || s.toLowerCase().includes('ridger') || s.toLowerCase().includes('jalan')).join(' | '));
}

console.log('\n=== CHECK Rcn BERJLN Fsk: SEARCH FOR 2026 ===');
const wsRcn = wb.Sheets['Rcn BERJLN Fsk'];
const rangeRcn = xlsx.utils.decode_range(wsRcn['!ref']);
for (let r = 0; r <= rangeRcn.e.r; r++) {
  const rowVals = [];
  for (let c = 0; c <= 50; c++) {
    const v = wsRcn[xlsx.utils.encode_cell({ r, c })]?.v;
    if (v !== undefined) rowVals.push(v);
  }
  const str = rowVals.join(' ');
  if (str.includes('2026') || str.includes('12026')) {
    console.log(`Rcn BERJLN Fsk Row ${r+1}:`, rowVals.slice(0, 8).join(' | '));
  }
}
