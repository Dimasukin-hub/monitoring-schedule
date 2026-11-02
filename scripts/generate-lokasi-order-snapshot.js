const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Compile-safe require from lib/lokasiOrderSnapshot or self-contained
function run() {
  const targetFile = path.join(__dirname, '../excel/Monitor Gorong-gorong PG1.xlsx');
  if (!fs.existsSync(targetFile)) {
    console.error('File not found:', targetFile);
    return;
  }

  // Load from ts compiled or direct js logic
  const wb = XLSX.readFile(targetFile);
  const { parseSnapshotFromWorkbook, saveSnapshotToFile } = require('../lib/lokasiOrderSnapshot');
  const snap = parseSnapshotFromWorkbook(wb);
  saveSnapshotToFile(snap);
  console.log(`Snapshot generated. Total: ${Object.keys(snap).length}`);
}

run();
