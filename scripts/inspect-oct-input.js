const xlsx = require('xlsx');
const path = require('path');

function inspectInputReal() {
  const f1 = path.join(__dirname, '..', 'excel', 'Monitor Siap Nanas Update.xlsx');
  const wb1 = xlsx.readFile(f1, { cellDates: true });
  const ws1 = wb1.Sheets['Input Real Tanam&Petik Nanas'];
  const range1 = xlsx.utils.decode_range(ws1['!ref']);
  console.log('Input Real range:', ws1['!ref']);

  // Print headers row 1-5
  for (let r = 0; r <= 5; r++) {
    const row = [];
    for (let c = 0; c <= 20; c++) {
      const cell = ws1[xlsx.utils.encode_cell({ r, c })];
      if (cell && cell.v !== undefined) {
        row.push(`c${c}:${cell.v}`);
      }
    }
    console.log(`Row ${r + 1}:`, row.join(' | '));
  }

  // Find all October rows
  const octRows = [];
  for (let r = 5; r <= range1.e.r; r++) {
    const tanggalCell = ws1[xlsx.utils.encode_cell({ r, c: 2 })]; // Column C or whatever is date
    const actCell = ws1[xlsx.utils.encode_cell({ r, c: 5 })];
    if (tanggalCell && tanggalCell.v) {
      const dateVal = tanggalCell.v;
      const strVal = String(dateVal);
      if (strVal.includes('10/2026') || strVal.includes('Oct') || (dateVal instanceof Date && dateVal.getMonth() === 9 && dateVal.getFullYear() === 2026)) {
        octRows.push({
          r: r + 1,
          date: dateVal,
          lokasi: ws1[xlsx.utils.encode_cell({ r, c: 1 })]?.v,
          act: ws1[xlsx.utils.encode_cell({ r, c: 4 })]?.v || ws1[xlsx.utils.encode_cell({ r, c: 5 })]?.v,
          total: ws1[xlsx.utils.encode_cell({ r, c: 10 })]?.v || ws1[xlsx.utils.encode_cell({ r, c: 9 })]?.v
        });
      }
    }
  }
  console.log('October rows found:', octRows.length);
  if (octRows.length > 0) {
    console.log('Sample October rows:', octRows.slice(0, 10));
    console.log('Last October rows:', octRows.slice(-10));
  }
}

inspectInputReal();
