const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'excel', 'Schedule 2026 Update 09.xlsx');
console.log('Loading workbook:', filePath);
const wb = xlsx.readFile(filePath, { cellFormula: true, cellStyles: true });

const ws = wb.Sheets['Master'];
if (!ws) {
  console.error('Sheet Master not found!');
  process.exit(1);
}

const range = xlsx.utils.decode_range(ws['!ref']);
console.log('Master sheet range:', ws['!ref'], `(rows 1 to ${range.e.r + 1}, cols 1 to ${range.e.c + 1})`);

// Let's inspect rows 1 to 12 across columns A to Z (c: 0 to 25)
console.log('\n=== HEADER ROWS 1-12 (Cols A to O) ===');
for (let r = 0; r <= 11; r++) {
  const rowCells = [];
  for (let c = 0; c <= 15; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell && cell.v !== undefined) {
      rowCells.push(`${xlsx.utils.encode_col(c)}:${JSON.stringify(cell.v)}`);
    }
  }
  if (rowCells.length > 0) {
    console.log(`Row ${r + 1}: ${rowCells.join(' | ')}`);
  }
}

// Let's look for columns with 'Wilayah', 'Lokasi', 'Bruto', 'Netto', 'Status', 'Eks', 'Sejarah', 'PH', 'BK', 'SN'
console.log('\n=== COLUMN SCAN FOR STOK FIELDS IN ROWS 1-12 ===');
const foundCols = {};
for (let c = 0; c <= Math.min(range.e.c, 40); c++) {
  const colLetter = xlsx.utils.encode_col(c);
  const colTexts = [];
  for (let r = 0; r <= 11; r++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell && cell.v !== undefined) {
      colTexts.push(`R${r+1}:${cell.v}`);
    }
  }
  if (colTexts.length > 0) {
    console.log(`Col ${colLetter} (index ${c}): ${colTexts.join(' ; ')}`);
  }
}

// Check if there are formulas in data rows for cols A to O
console.log('\n=== CHECK FORMULAS IN DATA ROWS (e.g. Rows 9 to 25) ===');
for (let r = 8; r <= 20; r++) {
  const formulasInRow = [];
  for (let c = 0; c <= 15; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell) {
      if (cell.f) {
        formulasInRow.push(`${addr}: formula = "${cell.f}", val = ${JSON.stringify(cell.v)}`);
      }
    }
  }
  if (formulasInRow.length > 0) {
    console.log(`Row ${r + 1} formulas:`, formulasInRow.join(' | '));
  } else {
    console.log(`Row ${r + 1}: No formulas (raw values)`);
  }
}

// Let's print sample data rows (e.g. Rows 9-13)
console.log('\n=== SAMPLE DATA (Rows 9-13, Cols A to M) ===');
for (let r = 8; r <= 12; r++) {
  const rowData = {};
  for (let c = 0; c <= 15; c++) {
    const addr = xlsx.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (cell && cell.v !== undefined) {
      rowData[xlsx.utils.encode_col(c)] = { val: cell.v, f: cell.f || null };
    }
  }
  console.log(`Row ${r + 1}:`, JSON.stringify(rowData));
}
