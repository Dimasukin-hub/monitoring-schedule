const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
const wb = xlsx.readFile(filePath, { sheets: ['Master'], cellDates: false });
const ws = wb.Sheets['Master'];

// Col DS, DT, DU
const dsIdx = xlsx.utils.decode_col('DS');
const dtIdx = xlsx.utils.decode_col('DT');
const duIdx = xlsx.utils.decode_col('DU');

console.log(`DS col index: ${dsIdx} (${xlsx.utils.encode_col(dsIdx)})`);
console.log(`DT col index: ${dtIdx} (${xlsx.utils.encode_col(dtIdx)})`);
console.log(`DU col index: ${duIdx} (${xlsx.utils.encode_col(duIdx)})`);

console.log('=== HEADERS IN MASTER ROWS 1-12 FOR DS, DT, DU AND SURROUNDING ===');
for (let c = dsIdx - 5; c <= duIdx + 5; c++) {
  let labels = [];
  for (let r = 0; r <= 11; r++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    if (cell && cell.v !== undefined) labels.push(`r${r+1}:${cell.v}`);
  }
  console.log(`Col ${c+1} (${xlsx.utils.encode_col(c)}): ${labels.join(' | ')}`);
}

console.log('\n=== SAMPLE FORMULAS / VALUES IN ROW 12-15 FOR DS, DT, DU ===');
for (let r = 11; r <= 15; r++) {
  console.log(`Row ${r+1}: DS=${ws[xlsx.utils.encode_cell({ r, c: dsIdx })]?.f || ws[xlsx.utils.encode_cell({ r, c: dsIdx })]?.v} | DT=${ws[xlsx.utils.encode_cell({ r, c: dtIdx })]?.f || ws[xlsx.utils.encode_cell({ r, c: dtIdx })]?.v} | DU=${ws[xlsx.utils.encode_cell({ r, c: duIdx })]?.f || ws[xlsx.utils.encode_cell({ r, c: duIdx })]?.v}`);
}
