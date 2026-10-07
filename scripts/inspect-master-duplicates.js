const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);

// Let's find rows where lokasi is '005D' or another duplicate
const duplicateSamples = ['005D', '001A', '064C', '027H'];

for (const sample of duplicateSamples) {
  console.log(`\n=== SAMPLE ROWS FOR LOKASI '${sample}' ===`);
  for (let r = 11; r <= range.e.r; r++) {
    const lokasiCell = ws[xlsx.utils.encode_cell({ r, c: 3 })];
    if (lokasiCell && String(lokasiCell.v).trim().toUpperCase() === sample) {
      const rowData = [];
      // Read cols A to O, plus maybe other identifying cols (like year, bulan tanam, etc.)
      for (let c = 0; c <= 25; c++) {
        const cell = ws[xlsx.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined) {
          rowData.push(`${xlsx.utils.encode_col(c)}:${cell.v}`);
        }
      }
      console.log(`Row ${r + 1}: ${rowData.slice(0, 15).join(' | ')}`);
    }
  }
}
