const xlsx = require('xlsx');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
console.log('Reading Excel file:', filePath);
const wb = xlsx.readFile(filePath, { cellFormula: true });
const ws = wb.Sheets['Master'];
const range = xlsx.utils.decode_range(ws['!ref']);
console.log('Master range:', ws['!ref']);

// Inspect row 10, 11 (headers)
console.log('\n--- Header Rows ---');
for (let r = 8; r <= 11; r++) {
  const rowVals = [];
  for (let c = 0; c <= 15; c++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    rowVals.push(cell ? cell.v : '');
  }
  console.log('Row ' + (r + 1) + ':', rowVals.slice(0, 12));
}

// Check columns C (2) to K (10) for any formulas
console.log('\n--- Checking all rows for formulas in columns C through K (Wilayah to pH) ---');
const formulaCols = new Map();
let sampleRows = [];

for (let r = 11; r <= range.e.r; r++) {
  for (let c = 2; c <= 10; c++) {
    const cell = ws[xlsx.utils.encode_cell({ r, c })];
    if (cell && cell.f) {
      const colName = xlsx.utils.encode_col(c);
      if (!formulaCols.has(colName)) {
        formulaCols.set(colName, []);
      }
      if (formulaCols.get(colName).length < 5) {
        formulaCols.get(colName).push({ row: r + 1, formula: cell.f, val: cell.v });
      }
    }
  }
}

console.log('Columns with formulas:');
for (const [col, samples] of formulaCols.entries()) {
  console.log('Column ' + col + ':');
  samples.forEach(s => console.log('  Row ' + s.row + ': =' + s.formula + ' => ' + s.val));
}

if (formulaCols.size === 0) {
  console.log('Tidak ada rumus di kolom C sampai K (semua nilai statis/input langsung).');
}

prisma.$disconnect();
