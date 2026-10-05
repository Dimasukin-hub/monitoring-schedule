const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

for (const sheetName of ['Master', 'Rcn BERJLN Fsk']) {
  const ws = wb.Sheets[sheetName];
  console.log(`\n=== CHECKING NUMBERS IN ${sheetName} ROWS 1-15 ===`);
  for (let r = 0; r <= 15; r++) {
    let rowVals = [];
    for (let c = 0; c <= 60; c++) {
      const v = ws[xlsx.utils.encode_cell({ r, c })]?.v;
      if (v !== undefined) {
        rowVals.push(`c${c+1}(${xlsx.utils.encode_col(c)}):${v}`);
      }
    }
    const str = rowVals.join(' ');
    if (str.includes(':11 ') || str.includes(':20 ') || str.includes(':41 ') || str.includes(':42 ') || str.includes(':23 ')) {
      console.log(`Row ${r+1}:`, rowVals.filter(s => {
        const v = s.split(':')[1];
        return ['11','12','13','14','15','16','17','18','19','20','21','22','23','40','41','42'].includes(v);
      }).join(' '));
    }
  }
}
