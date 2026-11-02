import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

export interface LokasiSnapshot {
  lokasi: string;
  wilayah?: string;
  luas?: number;
  statusTanaman?: string;
  umurBulan?: number;
  tanggalOrder?: string | null;
  aktBk?: string;
  dsmBk?: string;
  dsmSt?: string;
  prioritas?: string;
  statusAll?: string; // 'Close' | '-'
  isClosedExcel?: boolean;
  ratioPerHa?: number;
  orderD40?: number;
  dropD40?: number;
  statusD40?: string;
  orderD60?: number;
  dropD60?: number;
  statusD60?: string;
  orderD80?: number;
  dropD80?: number;
  statusD80?: string;
  orderD100?: number;
  dropD100?: number;
  statusD100?: string;
  keteranganClose?: string;
}

function parseExcelDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.toISOString().slice(0, 10);
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '-') return null;
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  return null;
}

function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'number') {
    if (val === 42) return ''; // Excel #N/A code
    return String(val);
  }
  const s = String(val).trim();
  if (s === '#N/A' || s === '#VALUE!' || s === '#REF!') return '';
  return s;
}

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

export function parseSnapshotFromWorkbook(wb: XLSX.WorkBook): Record<string, LokasiSnapshot> {
  const sheetNames = wb.SheetNames;
  const findSheet = (patterns: string[]) => {
    const match = sheetNames.find((name) =>
      patterns.some((p) => name.trim().toLowerCase().includes(p.toLowerCase()))
    );
    return match ? wb.Sheets[match] : null;
  };

  const wsLO = findSheet(['Lokasi Order', 'Gorong2 Per Lokasi', 'Monitoring Gorong']);
  const wsLC = findSheet(['List Close']);
  const wsDO = findSheet(['Data Order']);

  const snapshot: Record<string, LokasiSnapshot> = {};

  // 1. Baca sheet Lokasi Order
  if (wsLO) {
    for (let r = 7; r <= 3000; r++) {
      const cellB = wsLO['B' + r] || wsLO['A' + r];
      if (!cellB || !cellB.v) continue;
      const lok = String(cellB.v).trim().toUpperCase();
      if (!lok || lok === 'LOKASI' || lok === 'GRAND TOTAL' || lok === 'TOTAL' || lok.startsWith('GORONG')) {
        continue;
      }

      const isColB = wsLO['B' + r] && wsLO['B' + r].v === cellB.v;
      const getCell = (colBLetter: string, colALetter: string) => {
        const letter = isColB ? colBLetter : colALetter;
        return wsLO[letter + r];
      };

      const wil = cleanStr(getCell('C', 'B')?.v);
      const luas = cleanNum(getCell('D', 'C')?.v);
      const statusTanaman = cleanStr(getCell('E', 'D')?.v);
      const umurBulan = cleanNum(getCell('F', 'E')?.v);
      const tglOrder = parseExcelDate(getCell('G', 'F')?.v);
      const aktBk = cleanStr(getCell('H', 'G')?.v);
      const dsmBk = cleanStr(getCell('J', 'I')?.v);
      const dsmSt = cleanStr(getCell('K', 'J')?.v);
      const prio = cleanStr(getCell('L', 'K')?.v);
      const statusAllRaw = cleanStr(getCell('N', 'M')?.v);
      const statusAll = statusAllRaw.toLowerCase() === 'close' ? 'Close' : '-';
      const isClosedExcel = statusAll === 'Close';

      const ratioPerHa = cleanNum(getCell('P', 'O')?.v);

      const ord40 = cleanNum(getCell('R', 'Q')?.v);
      const drop40 = cleanNum(getCell('S', 'R')?.v);
      const statusD40Raw = cleanStr(getCell('AB', 'AA')?.v);
      const statusD40 = isClosedExcel ? 'Close' : (statusD40Raw.toLowerCase() === 'close' ? 'Close' : '-');

      const ord60 = cleanNum(getCell('AD', 'AC')?.v);
      const drop60 = cleanNum(getCell('AE', 'AD')?.v);
      const statusD60Raw = cleanStr(getCell('AM', 'AL')?.v);
      const statusD60 = isClosedExcel ? 'Close' : (statusD60Raw.toLowerCase() === 'close' ? 'Close' : '-');

      const ord80 = cleanNum(getCell('AO', 'AN')?.v);
      const drop80 = cleanNum(getCell('AP', 'AO')?.v);
      const statusD80Raw = cleanStr(getCell('AX', 'AW')?.v);
      const statusD80 = isClosedExcel ? 'Close' : (statusD80Raw.toLowerCase() === 'close' ? 'Close' : '-');

      const ord100 = cleanNum(getCell('AZ', 'AY')?.v);
      const drop100 = cleanNum(getCell('BA', 'AZ')?.v);
      const statusD100Raw = cleanStr(getCell('BI', 'BH')?.v);
      const statusD100 = isClosedExcel ? 'Close' : (statusD100Raw.toLowerCase() === 'close' ? 'Close' : '-');

      snapshot[lok] = {
        lokasi: lok,
        wilayah: wil || undefined,
        luas: luas > 0 ? luas : undefined,
        statusTanaman: statusTanaman || undefined,
        umurBulan: umurBulan > 0 ? umurBulan : undefined,
        tanggalOrder: tglOrder,
        aktBk: aktBk || undefined,
        dsmBk: dsmBk || undefined,
        dsmSt: dsmSt || undefined,
        prioritas: isClosedExcel ? '' : (ord40 === 0 ? '-' : prio),
        statusAll,
        isClosedExcel,
        ratioPerHa: ratioPerHa > 0 ? ratioPerHa : undefined,
        orderD40: ord40,
        dropD40: drop40,
        statusD40,
        orderD60: ord60,
        dropD60: drop60,
        statusD60,
        orderD80: ord80,
        dropD80: drop80,
        statusD80,
        orderD100: ord100,
        dropD100: drop100,
        statusD100,
      };
    }
  }

  // 2. Baca sheet List Close (Explicit Overrides untuk lokasi tambahan / catatan)
  if (wsLC) {
    for (let r = 4; r <= 200; r++) {
      const cellB = wsLC['B' + r];
      if (!cellB || !cellB.v) continue;
      const lok = String(cellB.v).trim().toUpperCase();
      if (!lok || lok === 'LOKASI' || lok.startsWith('TOTAL')) continue;

      const wil = cleanStr(wsLC['C' + r]?.v);
      const luas = cleanNum(wsLC['D' + r]?.v);
      const tgl = parseExcelDate(wsLC['E' + r]?.v);
      const ket = cleanStr(wsLC['J' + r]?.v);

      if (snapshot[lok]) {
        // Catat keterangan jika ada
        if (ket) snapshot[lok].keteranganClose = ket;
        if (!snapshot[lok].wilayah && wil) snapshot[lok].wilayah = wil;
        if (!snapshot[lok].luas && luas > 0) snapshot[lok].luas = luas;
      } else {
        snapshot[lok] = {
          lokasi: lok,
          wilayah: wil || undefined,
          luas: luas > 0 ? luas : undefined,
          statusTanaman: '-',
          umurBulan: 0,
          tanggalOrder: tgl,
          aktBk: '-',
          dsmBk: '-',
          dsmSt: '-',
          prioritas: '',
          statusAll: 'Close',
          isClosedExcel: true,
          statusD40: 'Close',
          statusD60: 'Close',
          statusD80: 'Close',
          statusD100: 'Close',
          keteranganClose: ket,
        };
      }
    }
  }

  // 3. Lengkapi Wilayah yang kosong dari Data Order jika ada
  if (wsDO) {
    for (let r = 5; r <= 3000; r++) {
      const cellC = wsDO['C' + r] || wsDO['B' + r];
      if (!cellC || !cellC.v) continue;
      const lok = String(cellC.v).trim().toUpperCase();
      if (snapshot[lok] && !snapshot[lok].wilayah) {
        const wil = cleanStr(wsDO['D' + r]?.v || wsDO['B' + r]?.v);
        if (wil && !wil.startsWith('0') && wil.length < 15) {
          snapshot[lok].wilayah = wil;
        }
      }
    }
  }

  return snapshot;
}

export function getSnapshotFilePath(): string {
  return path.join(process.cwd(), 'data', 'lokasi-order-snapshot.json');
}

export function saveSnapshotToFile(snapshot: Record<string, LokasiSnapshot>): void {
  try {
    const filePath = getSnapshotFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving snapshot to file:', error);
  }
}

export function loadSnapshotFromFile(): Record<string, LokasiSnapshot> {
  try {
    const filePath = getSnapshotFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error('Error loading snapshot from file:', error);
  }
  return {};
}
