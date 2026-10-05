const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellDates: false });

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  if (!ws) continue;
  const range = xlsx.utils.decode_range(ws['!ref'] || 'A1');
  
  for (let r = 0; r <= Math.min(range.e.r, 30); r++) {
    // Check cell at col 11 (c=10 or 11), col 20 (c=19 or 20), col 23 (c=22 or 23), col 41 (c=40 or 41), col 42 (c=41 or 42)
    const getV = (c) => String(ws[xlsx.utils.encode_cell({ r, c })]?.v || '').trim();
    
    // Test both 1-based and 0-based
    for (const offset of [0, -1]) {
      const c11 = getV(11 + offset);
      const c20 = getV(20 + offset);
      const c23 = getV(23 + offset);
      const c41 = getV(41 + offset);
      const c42 = getV(42 + offset);
      
      if (
        c11.toLowerCase().includes('chopper') ||
        c20.toLowerCase().includes('kompos') ||
        c41.toLowerCase().includes('ridger') ||
        c42.toLowerCase().includes('jalan')
      ) {
        console.log(`Sheet "${name}", Row ${r+1}, offset ${offset}:`);
        console.log(`  Col 11: "${c11}"`);
        console.log(`  Col 20: "${c20}"`);
        console.log(`  Col 23: "${c23}"`);
        console.log(`  Col 41: "${c41}"`);
        console.log(`  Col 42: "${c42}"`);
      }
    }
  }
}
