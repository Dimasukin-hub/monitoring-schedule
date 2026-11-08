import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { prisma } from './prisma';

export interface LokasiSnapshot {
  lokasi: string;
  wilayah?: string | null;
  luas?: number | null;
  statusTanaman?: string | null;
  umurBulan?: number | null;
  tanggalOrder?: string | null;
  aktBk?: string | null;
  dsmBk?: string | null;
  dsmSt?: string | null;
  prioritas?: string | null;
  statusAll?: string | null; // 'Close' | '-'
  isClosedExcel?: boolean;
  ratioPerHa?: number | null;
  orderD40?: number | null;
  dropD40?: number | null;
  tglDropD40?: string | null;
  pasangManD40?: number | null;
  pasangSapD40?: number | null;
  statusD40?: string | null;
  orderD60?: number | null;
  dropD60?: number | null;
  pasangManD60?: number | null;
  pasangSapD60?: number | null;
  statusD60?: string | null;
  orderD80?: number | null;
  dropD80?: number | null;
  pasangManD80?: number | null;
  pasangSapD80?: number | null;
  statusD80?: string | null;
  orderD100?: number | null;
  dropD100?: number | null;
  pasangManD100?: number | null;
  pasangSapD100?: number | null;
  statusD100?: string | null;
  keteranganClose?: string | null;
}

export const EXCLUDED_GORONG_GORONG_LOCATIONS = new Set<string>();

export function isExcludedGorongGorongLocation(lok: string | null | undefined): boolean {
  if (!lok) return true;
  const s = String(lok).trim().toUpperCase();
  if (!s || s === '-' || s === 'LOKASI' || s === 'TOTAL' || s === 'GRAND TOTAL' || s.startsWith('TOTAL')) return true;
  return false;
}

export const LOCATIONS_WITHOUT_WILAYAH = new Set([
  '052D', '014E', '097B1', '024F', '042B', '045C', '013B2'
].map((s) => s.trim().toUpperCase()));

export function isLocationWithoutWilayah(lok: string | null | undefined): boolean {
  if (!lok) return false;
  return LOCATIONS_WITHOUT_WILAYAH.has(lok.trim().toUpperCase());
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

function cleanStrOrNull(val: any): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (val === 42) return null;
    return String(val);
  }
  const s = String(val).trim();
  if (s === '' || s === '-' || s.startsWith('#') || s === '#N/A' || s === '#VALUE!' || s === '#REF!') return null;
  return s;
}

function cleanStrPreserveDash(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s.startsWith('#') || s === '#N/A' || s === '#VALUE!' || s === '#REF!') return null;
  return s;
}

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function cleanNumOrNull(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const s = String(val).trim();
  if (s === '' || s === '-' || s.startsWith('#') || s === '#N/A' || s === '#VALUE!' || s === '#REF!') return null;
  const n = Number(s.replace(/,/g, '').replace(/%/g, ''));
  return isNaN(n) ? null : n;
}

export function parseSnapshotFromWorkbook(wb: XLSX.WorkBook): Record<string, LokasiSnapshot> {
  const sheetNames = wb.SheetNames;
  const snapshot: Record<string, LokasiSnapshot> = {};

  const findSheet = (patterns: string[]) => {
    const match = sheetNames.find((name) =>
      patterns.some((p) => name.trim().toLowerCase().includes(p.toLowerCase()))
    );
    return match ? wb.Sheets[match] : null;
  };

  // Kumpulkan sheet kandidat untuk dibaca: cari sheet bernama umum dulu, atau seluruh sheet jika tidak ada
  const preferredNames = ['Lokasi Order', 'List Lokasi Order', 'Gorong2 Per Lokasi', 'Monitoring Gorong', 'Monitoring', 'Gorong', 'Rekap', 'Sheet1'];
  const candidateSheets: XLSX.WorkSheet[] = [];

  for (const p of preferredNames) {
    const s = findSheet([p]);
    if (s && !candidateSheets.includes(s)) {
      candidateSheets.push(s);
    }
  }

  // Jika belum ada sheet kandidat dari nama-nama di atas, masukkan sheet pertama atau semua sheet
  if (candidateSheets.length === 0 && sheetNames.length > 0) {
    for (const name of sheetNames) {
      if (wb.Sheets[name]) candidateSheets.push(wb.Sheets[name]);
    }
  }

  // Baca sheet kandidat dengan parser universal dinamis
  for (const wsLO of candidateSheets) {
    if (!wsLO || !wsLO['!ref']) continue;
    const range = XLSX.utils.decode_range(wsLO['!ref']);

    // 1. Cari baris header utama (baris yang memiliki sel tepat bernilai 'lokasi' atau 'petak')
    let headerRow = -1;
    let subHeaderRow = -1;

    for (let r = range.s.r; r <= Math.min(range.s.r + 15, range.e.r); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = wsLO[XLSX.utils.encode_cell({ r, c })];
        if (!cell || cell.v == null) continue;
        const v = String(cell.v).trim().toLowerCase();
        if (v === 'lokasi' || v === 'petak') {
          headerRow = r;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow === -1) continue;

    // Cari apakah ada sub-header di baris berikutnya (headerRow + 1)
    if (headerRow + 1 <= range.e.r) {
      let subMatches = 0;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = wsLO[XLSX.utils.encode_cell({ r: headerRow + 1, c })];
        if (!cell || cell.v == null) continue;
        const v = String(cell.v).trim().toLowerCase();
        if (v.includes('order') || v.includes('drop') || v.includes('pasang') || v.includes('saldo') || v.includes('sisa')) {
          subMatches++;
        }
      }
      if (subMatches >= 2) {
        subHeaderRow = headerRow + 1;
      }
    }

    // 2. Pemetaan Kolom (Universal Dynamic Header Mapping)
    const colMap: Record<string, number> = {};
    let curDia: number | null = null;
    let diameterStarted = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellTop = wsLO[XLSX.utils.encode_cell({ r: headerRow, c })];
      const valTop = cellTop && cellTop.v != null ? String(cellTop.v).trim().toLowerCase() : '';

      const cellSub = subHeaderRow !== -1 ? wsLO[XLSX.utils.encode_cell({ r: subHeaderRow, c })] : null;
      const valSub = cellSub && cellSub.v != null ? String(cellSub.v).trim().toLowerCase() : '';

      const combined = (valTop + ' ' + valSub).trim();

      // Deteksi pergantian grup diameter (dari baris atas atau baris sub-header)
      if (valTop.includes('100') || valSub.includes('100') || valTop.includes('d100') || valSub.includes('d100') || valTop.includes('ø100') || valSub.includes('ø100')) {
        curDia = 100;
        diameterStarted = true;
      } else if (valTop.includes('80') || valSub.includes('80') || valTop.includes('d80') || valSub.includes('d80') || valTop.includes('ø80') || valSub.includes('ø80')) {
        curDia = 80;
        diameterStarted = true;
      } else if (valTop.includes('60') || valSub.includes('60') || valTop.includes('d60') || valSub.includes('d60') || valTop.includes('ø60') || valSub.includes('ø60')) {
        curDia = 60;
        diameterStarted = true;
      } else if (valTop.includes('40') || valSub.includes('40') || valTop.includes('d40') || valSub.includes('d40') || valTop.includes('ø40') || valSub.includes('ø40')) {
        curDia = 40;
        diameterStarted = true;
      }

      if (!diameterStarted) {
        // Kolom Umum (Pasti di depan sebelum grup diameter dimulai)
        if (valTop === 'lokasi' || valTop === 'petak') {
          colMap.lokasi = c;
        } else if (valTop === 'wilayah' || valTop === 'wil') {
          colMap.wilayah = c;
        } else if (valTop.startsWith('luas')) {
          colMap.luas = c;
        } else if (valTop === 'status' || valTop.includes('tanaman')) {
          colMap.statusTanaman = c;
        } else if (valTop.includes('umur')) {
          colMap.umurBulan = c;
        } else if (valTop.includes('tgl') || valTop.includes('tanggal') || valSub.includes('tanggal') || valSub.includes('tgl')) {
          colMap.tanggalOrder = c;
        } else if (valTop.includes('akt') && valTop.includes('bk')) {
          colMap.aktBk = c;
        } else if (valTop.includes('dsm') && valTop.includes('bk')) {
          colMap.dsmBk = c;
        } else if (valTop.includes('dsm') && (valTop.includes('st') || valTop.includes('plot'))) {
          colMap.dsmSt = c;
        } else if (valTop.includes('prioritas') || valTop === 'prio') {
          colMap.prioritas = c;
        } else if (valTop.includes('status all') || valTop === 'status all') {
          colMap.statusAll = c;
        } else if (valTop.includes('ratio')) {
          colMap.ratioPerHa = c;
        }
      } else {
        // Kolom Diameter (Hanya setelah diameter dimulai, tidak boleh menimpa statusTanaman)
        if (curDia) {
          const isTgl = combined.includes('tgl') || combined.includes('tanggal');
          if (!isTgl && (combined.includes('order') || combined.includes('pesan') || combined.includes('jml'))) {
            colMap['orderD' + curDia] = c;
          } else if (combined.includes('drop')) {
            if (isTgl) colMap['tglDropD' + curDia] = c;
            else colMap['dropD' + curDia] = c;
          } else if (combined.includes('sisa')) {
            colMap['sisaD' + curDia] = c;
          } else if (combined.includes('sap') || combined.includes('p.sap') || combined.includes('psap')) {
            colMap['psapD' + curDia] = c;
          } else if (combined.includes('manual') || combined.includes('p.man') || combined.includes('pman') || (combined.includes('man') && !combined.includes('tanaman'))) {
            colMap['pmanD' + curDia] = c;
          } else if (combined.includes('saldo')) {
            colMap['saldoD' + curDia] = c;
          } else if (combined.includes('status') && !combined.includes('status all')) {
            colMap['statusD' + curDia] = c;
          }
        }
      }
    }

    if (colMap.lokasi === undefined) continue;

    // Tentukan baris awal data
    let dataStartRow = subHeaderRow !== -1 ? subHeaderRow + 1 : headerRow + 1;
    // Lewati baris nomor urut kolom jika ada (misal baris 6 berisi angka 1, 2, 3...)
    if (dataStartRow <= range.e.r) {
      const cell1 = wsLO[XLSX.utils.encode_cell({ r: dataStartRow, c: colMap.lokasi })];
      const val1 = cell1 && cell1.v !== undefined && cell1.v !== null ? String(cell1.v).trim() : '';
      if (val1 === '1' || val1 === '2') {
        dataStartRow++;
      }
    }

    // 3. Ekstraksi Baris Data
    for (let r = dataStartRow; r <= range.e.r; r++) {
      const getVal = (col?: number) => {
        if (col === undefined) return null;
        const cell = wsLO[XLSX.utils.encode_cell({ r, c: col })];
        return cell && cell.v !== undefined && cell.v !== null ? cell.v : null;
      };

      const rawLok = getVal(colMap.lokasi);
      if (!rawLok) continue;
      const lok = String(rawLok).trim().toUpperCase();
      if (
        !lok ||
        /^\d+$/.test(lok) ||
        lok === 'LOKASI' ||
        lok === 'TOTAL' ||
        lok === 'GRAND TOTAL' ||
        lok.startsWith('TOTAL') ||
        lok.includes('ORDER') ||
        lok.includes('DROP') ||
        lok.includes('PASANG') ||
        isExcludedGorongGorongLocation(lok)
      ) {
        continue;
      }

      const wil = cleanStrOrNull(getVal(colMap.wilayah));
      const luas = cleanNumOrNull(getVal(colMap.luas));
      const statusTanaman = cleanStrOrNull(getVal(colMap.statusTanaman));
      const umurBulan = cleanNumOrNull(getVal(colMap.umurBulan));
      const tglOrder = parseExcelDate(getVal(colMap.tanggalOrder));
      const aktBk = cleanStrOrNull(getVal(colMap.aktBk));
      const dsmBk = cleanStrOrNull(getVal(colMap.dsmBk));
      const dsmSt = cleanStrOrNull(getVal(colMap.dsmSt));
      const prio = cleanStrOrNull(getVal(colMap.prioritas));
      const statusAllRaw = cleanStrOrNull(getVal(colMap.statusAll));
      const isClosedExcel = statusAllRaw?.toLowerCase() === 'close';

      const ord40 = cleanNumOrNull(getVal(colMap.orderD40));
      const drop40 = cleanNumOrNull(getVal(colMap.dropD40));
      const tglDrop40 = parseExcelDate(getVal(colMap.tglDropD40));
      const pman40 = cleanNumOrNull(getVal(colMap.pmanD40));
      const psap40 = cleanNumOrNull(getVal(colMap.psapD40));
      const statusD40Raw = cleanStrPreserveDash(getVal(colMap.statusD40));

      const ord60 = cleanNumOrNull(getVal(colMap.orderD60));
      const drop60 = cleanNumOrNull(getVal(colMap.dropD60));
      const psap60 = cleanNumOrNull(getVal(colMap.psapD60));
      const pman60 = cleanNumOrNull(getVal(colMap.pmanD60));
      const statusD60Raw = cleanStrPreserveDash(getVal(colMap.statusD60));

      const ord80 = cleanNumOrNull(getVal(colMap.orderD80));
      const drop80 = cleanNumOrNull(getVal(colMap.dropD80));
      const psap80 = cleanNumOrNull(getVal(colMap.psapD80));
      const pman80 = cleanNumOrNull(getVal(colMap.pmanD80));
      const statusD80Raw = cleanStrPreserveDash(getVal(colMap.statusD80));

      const ord100 = cleanNumOrNull(getVal(colMap.orderD100));
      const drop100 = cleanNumOrNull(getVal(colMap.dropD100));
      const psap100 = cleanNumOrNull(getVal(colMap.psapD100));
      const pman100 = cleanNumOrNull(getVal(colMap.pmanD100));
      const statusD100Raw = cleanStrPreserveDash(getVal(colMap.statusD100));

      // Rumus status diameter dinamis di backend (prioritaskan status dari Excel: '-', 'Close', 'Cek', dll.)
      const calcDiaStatus = (ord: number | null, drp: number | null, pman: number | null, psap: number | null, rawSt?: string | null) => {
        if (isClosedExcel || rawSt?.toLowerCase() === 'close') return 'Close';
        if (rawSt && rawSt.trim() !== '') return rawSt.trim();
        const hasAct = ord !== null || drp !== null || pman !== null || psap !== null;
        if (!hasAct) return '-';
        const o = ord ?? 0;
        const d = drp ?? 0;
        const p = Math.max(pman ?? 0, psap ?? 0);
        const sld = d - p;
        if (d >= o && sld <= 0 && p > 0) return 'Close';
        if (o > 0 || d > 0 || p > 0) return 'Open';
        return '-';
      };

      const statusD40 = calcDiaStatus(ord40, drop40, pman40, psap40, statusD40Raw);
      const statusD60 = calcDiaStatus(ord60, drop60, pman60, psap60, statusD60Raw);
      const statusD80 = calcDiaStatus(ord80, drop80, pman80, psap80, statusD80Raw);
      const statusD100 = calcDiaStatus(ord100, drop100, pman100, psap100, statusD100Raw);

      let statusAll = isClosedExcel ? 'Close' : '-';
      if (!isClosedExcel) {
        const acts = [statusD40, statusD60, statusD80, statusD100].filter((s) => s !== '-');
        if (acts.length > 0 && acts.every((s) => s === 'Close')) {
          statusAll = 'Close';
        }
      }

      const rawRatio = cleanNumOrNull(getVal(colMap.ratioPerHa));
      const ratioPerHa = rawRatio !== null
        ? rawRatio
        : (luas && luas > 0 && ord40 !== null && ord40 > 0 ? Math.round(ord40 / luas) : null);

      snapshot[lok] = {
        lokasi: lok,
        wilayah: wil || undefined,
        luas: luas !== null ? luas : undefined,
        statusTanaman: statusTanaman || undefined,
        umurBulan: umurBulan !== null ? umurBulan : undefined,
        tanggalOrder: tglOrder,
        aktBk: aktBk || undefined,
        dsmBk: dsmBk || undefined,
        dsmSt: dsmSt || undefined,
        prioritas: isClosedExcel ? '' : (ord40 === 0 || ord40 === null ? '-' : prio || undefined),
        statusAll,
        isClosedExcel,
        ratioPerHa: ratioPerHa !== null ? ratioPerHa : undefined,
        orderD40: ord40,
        dropD40: drop40,
        tglDropD40: tglDrop40,
        pasangManD40: pman40,
        pasangSapD40: psap40,
        statusD40,
        orderD60: ord60,
        dropD60: drop60,
        pasangManD60: pman60,
        pasangSapD60: psap60,
        statusD60,
        orderD80: ord80,
        dropD80: drop80,
        pasangManD80: pman80,
        pasangSapD80: psap80,
        statusD80,
        orderD100: ord100,
        dropD100: drop100,
        pasangManD100: pman100,
        pasangSapD100: psap100,
        statusD100,
      };
    }

    if (Object.keys(snapshot).length > 0) break;
  }

  // 2. Baca sheet List Close (Explicit Overrides untuk lokasi tambahan / catatan)
  const wsLC = findSheet(['List Close']);
  if (wsLC) {
    for (let r = 4; r <= 200; r++) {
      const cellB = wsLC['B' + r];
      if (!cellB || !cellB.v) continue;
      const lok = String(cellB.v).trim().toUpperCase();
      if (!lok || lok === 'LOKASI' || lok.startsWith('TOTAL') || isExcludedGorongGorongLocation(lok)) continue;

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

  // 3. Lengkapi Wilayah yang kosong dari Data Order jika ada (Hanya jika valid AW01 s/d AW07)
  const wsDO = findSheet(['Data Order']);
  if (wsDO) {
    for (let r = 5; r <= 3000; r++) {
      const cellC = wsDO['C' + r] || wsDO['B' + r];
      if (!cellC || !cellC.v) continue;
      const lok = String(cellC.v).trim().toUpperCase();
      if (isExcludedGorongGorongLocation(lok)) continue;

      if (snapshot[lok] && !snapshot[lok].wilayah && !isLocationWithoutWilayah(lok)) {
        const rawWil = cleanStr(wsDO['D' + r]?.v || wsDO['B' + r]?.v).toUpperCase();
        if (/^AW0[1-7]$/.test(rawWil)) {
          snapshot[lok].wilayah = rawWil;
        } else if (/^W0[1-7]$/.test(rawWil)) {
          snapshot[lok].wilayah = 'A' + rawWil;
        }
      }
    }
  }

  // Pastikan lokasi tanpa wilayah tetap kosong
  for (const lok of LOCATIONS_WITHOUT_WILAYAH) {
    if (snapshot[lok]) {
      delete snapshot[lok].wilayah;
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

// Helper Pemformatan Resmi Tahapan Pekerjaan Tanah PG1 dengan Kode Resmi (contoh: 24. Selesai Tanam)
export function formatLandActivity(a: { code?: string | null; name?: string | null; stepOrder?: number | null }) {
  if (!a || !a.name) return '-';
  const name = String(a.name).trim();
  if (/^\d{2}\./.test(name)) return name;
  let numPrefix = '';
  if (a.code && /^\d{2}\./.test(a.code.trim())) {
    numPrefix = a.code.trim().slice(0, 2);
  } else if (a.stepOrder) {
    numPrefix = String(a.stepOrder).padStart(2, '0');
  }
  return numPrefix ? `${numPrefix}. ${name}` : name;
}

// Helper Pemetaan Tahapan Pekerjaan Tanah PG1 dengan Nomor Urut Resmi (Tahap 1 s/d 20)
export function parseLandActivity(raw: any): { stepOrder: number; formatted: string } {
  if (!raw || raw === '-' || raw === '0') return { stepOrder: 0, formatted: '-' };
  const s = String(raw).trim();
  const lower = s.toLowerCase();

  if (lower.includes('sls') || lower.includes('selesai tanam') || lower.includes('selesai tnm')) {
    return { stepOrder: 20, formatted: '24. Selesai Tanam' };
  }
  if (lower.includes('proses tnm') || lower.includes('proses tanam') || lower.includes('mulai tnm') || lower.includes('mulai tanam')) {
    return { stepOrder: 19, formatted: '23. Proses Tanam' };
  }
  if (lower.includes('siap tanam') || lower.includes('siap tnm')) {
    return { stepOrder: 18, formatted: '22. Siap Tanam' };
  }
  if (lower.includes('jalan') || lower.includes('saluran') || lower.includes('jln') || lower.includes('exmini')) {
    return { stepOrder: 17, formatted: '22. Jalan & Saluran' };
  }
  if (lower.includes('ridger')) {
    return { stepOrder: 16, formatted: '21. Ridger' };
  }
  if (lower.includes('fh2') || lower.includes('rotary 2') || lower.includes('rotary fh2')) {
    return { stepOrder: 15, formatted: '20. Rotary FH2' };
  }
  if (lower.includes('fh1') || lower.includes('finishing rotary') || lower.includes('rotary fh1')) {
    return { stepOrder: 14, formatted: '19. Finishing Rotary' };
  }
  if (lower.includes('harrow') || lower.includes('finishing harrow')) {
    return { stepOrder: 13, formatted: '18. Finishing Harrow' };
  }
  if (lower.includes('subsoiler') || lower.includes('ss1') || lower.includes('ss2')) {
    return { stepOrder: 12, formatted: '17. Subsoiler' };
  }
  if (lower.includes('bajak') || lower.includes('mb') || lower.includes('nardi') || lower.includes('howard')) {
    return { stepOrder: 11, formatted: '11. Bajak Awal' };
  }
  if (lower.includes('kompos')) {
    return { stepOrder: 10, formatted: '10. Kompos' };
  }
  if (lower.includes('belerang')) {
    return { stepOrder: 9, formatted: '09. Belerang' };
  }
  if (lower.includes('dp2')) {
    return { stepOrder: 8, formatted: '08. DP2' };
  }
  if (lower.includes('cross') || lower.includes('dp cross')) {
    return { stepOrder: 7, formatted: '07. DP Cross' };
  }
  if (lower.includes('dp1') || lower.includes('dp')) {
    return { stepOrder: 6, formatted: '06. DP1' };
  }
  if (lower.includes('dolomit')) {
    return { stepOrder: 5, formatted: '05. Aplikasi Dolomit' };
  }
  if (lower.includes('banana') || lower.includes('cutting banana')) {
    return { stepOrder: 4, formatted: '04. Cutting Banana' };
  }
  if (lower.includes('rh1')) {
    return { stepOrder: 3, formatted: '03. RH1' };
  }
  if (lower.includes('chopper lu') || lower.includes('lu')) {
    return { stepOrder: 2, formatted: '02. Chopper Lu' };
  }
  if (lower.includes('chopper')) {
    return { stepOrder: 1, formatted: '01. Chopper' };
  }

  // Jika sudah berformat nomor seperti "24. Selesai Tanam" atau kode "24.SLS_TANAM"
  if (/^\d{2}\./.test(s)) {
    return { stepOrder: parseInt(s.slice(0, 2), 10), formatted: s.replace(/_/g, ' ') };
  }

  return { stepOrder: 0, formatted: s };
}

export async function loadSnapshotFromDb(): Promise<Record<string, LokasiSnapshot>> {
  try {
    const rows = await prisma.lokasiOrderGorongGorong.findMany({});
    if (rows.length === 0) {
      // Fallback ke file JSON jika database tabel masih kosong
      return loadSnapshotFromFile();
    }
    const map: Record<string, LokasiSnapshot> = {};
    for (const r of rows) {
      map[r.lokasi] = {
        lokasi: r.lokasi,
        wilayah: r.wilayah,
        luas: r.luas,
        statusTanaman: r.statusTanaman,
        umurBulan: r.umurBulan,
        tanggalOrder: r.tanggalOrder,
        aktBk: r.aktBk,
        dsmBk: r.dsmBk,
        dsmSt: r.dsmSt,
        prioritas: r.prioritas,
        statusAll: r.statusAll,
        isClosedExcel: r.isClosedExcel,
        ratioPerHa: r.ratioPerHa,
        keteranganClose: r.keteranganClose,
        orderD40: r.orderD40,
        dropD40: r.dropD40,
        tglDropD40: r.tglDropD40,
        pasangManD40: r.pasangManD40,
        pasangSapD40: r.pasangSapD40,
        statusD40: r.statusD40,
        orderD60: r.orderD60,
        dropD60: r.dropD60,
        pasangManD60: r.pasangManD60,
        pasangSapD60: r.pasangSapD60,
        statusD60: r.statusD60,
        orderD80: r.orderD80,
        dropD80: r.dropD80,
        pasangManD80: r.pasangManD80,
        pasangSapD80: r.pasangSapD80,
        statusD80: r.statusD80,
        orderD100: r.orderD100,
        dropD100: r.dropD100,
        pasangManD100: r.pasangManD100,
        pasangSapD100: r.pasangSapD100,
        statusD100: r.statusD100,
      };
    }
    return map;
  } catch (error) {
    console.error('Error loading snapshot from database:', error);
    return loadSnapshotFromFile();
  }
}

export async function syncLokasiOrderToDb(
  snapshot: Record<string, LokasiSnapshot>,
  mode: 'full_replace' | 'partial' = 'full_replace'
): Promise<number> {
  const isPartial = mode === 'partial';
  const entries = Object.values(snapshot).filter((item) => !isExcludedGorongGorongLocation(item.lokasi));

  if (!isPartial) {
    // 1. Full Replace: Hapus semua data lama di LokasiOrderGorongGorong
    await prisma.lokasiOrderGorongGorong.deleteMany({});

    // 2. Insert batch per 200 records
    const dataToInsert = entries.map((item) => ({
      lokasi: item.lokasi.trim().toUpperCase(),
      wilayah: item.wilayah ?? null,
      luas: item.luas ?? null,
      statusTanaman: item.statusTanaman ?? null,
      umurBulan: item.umurBulan ?? null,
      tanggalOrder: item.tanggalOrder ?? null,
      aktBk: item.aktBk ?? null,
      dsmBk: item.dsmBk ?? null,
      dsmSt: item.dsmSt ?? null,
      prioritas: item.prioritas ?? null,
      statusAll: item.statusAll ?? null,
      isClosedExcel: item.isClosedExcel === true,
      ratioPerHa: item.ratioPerHa ?? null,
      keteranganClose: item.keteranganClose ?? null,
      orderD40: item.orderD40 ?? null,
      dropD40: item.dropD40 ?? null,
      tglDropD40: item.tglDropD40 ?? null,
      pasangManD40: item.pasangManD40 ?? null,
      pasangSapD40: item.pasangSapD40 ?? null,
      statusD40: item.statusD40 ?? null,
      orderD60: item.orderD60 ?? null,
      dropD60: item.dropD60 ?? null,
      pasangManD60: item.pasangManD60 ?? null,
      pasangSapD60: item.pasangSapD60 ?? null,
      statusD60: item.statusD60 ?? null,
      orderD80: item.orderD80 ?? null,
      dropD80: item.dropD80 ?? null,
      pasangManD80: item.pasangManD80 ?? null,
      pasangSapD80: item.pasangSapD80 ?? null,
      statusD80: item.statusD80 ?? null,
      orderD100: item.orderD100 ?? null,
      dropD100: item.dropD100 ?? null,
      pasangManD100: item.pasangManD100 ?? null,
      pasangSapD100: item.pasangSapD100 ?? null,
      statusD100: item.statusD100 ?? null,
    }));

    for (let i = 0; i < dataToInsert.length; i += 200) {
      const chunk = dataToInsert.slice(i, i + 200);
      await prisma.lokasiOrderGorongGorong.createMany({ data: chunk });
    }
  } else {
    // Partial mode: upsert per lokasi
    for (const item of entries) {
      const lok = item.lokasi.trim().toUpperCase();
      const payload = {
        wilayah: item.wilayah ?? null,
        luas: item.luas ?? null,
        statusTanaman: item.statusTanaman ?? null,
        umurBulan: item.umurBulan ?? null,
        tanggalOrder: item.tanggalOrder ?? null,
        aktBk: item.aktBk ?? null,
        dsmBk: item.dsmBk ?? null,
        dsmSt: item.dsmSt ?? null,
        prioritas: item.prioritas ?? null,
        statusAll: item.statusAll ?? null,
        isClosedExcel: item.isClosedExcel === true,
        ratioPerHa: item.ratioPerHa ?? null,
        keteranganClose: item.keteranganClose ?? null,
        orderD40: item.orderD40 ?? null,
        dropD40: item.dropD40 ?? null,
        tglDropD40: item.tglDropD40 ?? null,
        pasangManD40: item.pasangManD40 ?? null,
        pasangSapD40: item.pasangSapD40 ?? null,
        statusD40: item.statusD40 ?? null,
        orderD60: item.orderD60 ?? null,
        dropD60: item.dropD60 ?? null,
        pasangManD60: item.pasangManD60 ?? null,
        pasangSapD60: item.pasangSapD60 ?? null,
        statusD60: item.statusD60 ?? null,
        orderD80: item.orderD80 ?? null,
        dropD80: item.dropD80 ?? null,
        pasangManD80: item.pasangManD80 ?? null,
        pasangSapD80: item.pasangSapD80 ?? null,
        statusD80: item.statusD80 ?? null,
        orderD100: item.orderD100 ?? null,
        dropD100: item.dropD100 ?? null,
        pasangManD100: item.pasangManD100 ?? null,
        pasangSapD100: item.pasangSapD100 ?? null,
        statusD100: item.statusD100 ?? null,
      };

      await prisma.lokasiOrderGorongGorong.upsert({
        where: { lokasi: lok },
        update: payload,
        create: { lokasi: lok, ...payload },
      });
    }
  }

  return entries.length;
}

export async function syncLokasiBelumOrderToDb(): Promise<number> {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  function parseRealDate(s: string | null | undefined): Date | null {
    if (!s) return null;
    const str = String(s).trim();
    if (!str || str === '-' || str === '0') return null;
    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const res = new Date(y, m, d);
        return isNaN(res.getTime()) ? null : res;
      }
    }
    const res = new Date(str);
    return isNaN(res.getTime()) ? null : res;
  }

  const [statusLokasiList, allLands, orderedLocations] = await Promise.all([
    prisma.masterStatusLokasi.findMany({}),
    prisma.land.findMany({
      orderBy: { year: 'desc' },
      select: {
        lokasi: true,
        year: true,
        activities: {
          where: { realisasiDate: { not: null } },
          select: { code: true, name: true, stepOrder: true, realisasiDate: true },
        },
      },
    }),
    prisma.lokasiOrderGorongGorong.findMany({
      select: { lokasi: true },
    }),
  ]);

  const orderedLokSet = new Set<string>();
  for (const o of orderedLocations) {
    orderedLokSet.add(o.lokasi.trim().toUpperCase());
  }

  // Pemetaan Akt. BK MURNI dari tabel database Land saja (Newest <= Today, tidak mengambil dari MasterStatusLokasi)
  const landAktMap = new Map<string, { formatted: string; stepOrder: number; date: Date }>();
  for (const l of allLands) {
    const lok = l.lokasi.trim().toUpperCase();
    const validActs = (l.activities || []).filter((a) => {
      const d = parseRealDate(a.realisasiDate);
      return d && d <= today;
    });

    for (const a of validActs) {
      const d = parseRealDate(a.realisasiDate)!;
      const current = landAktMap.get(lok);
      if (!current || d > current.date || (d.getTime() === current.date.getTime() && a.stepOrder > current.stepOrder)) {
        landAktMap.set(lok, {
          formatted: formatLandActivity(a),
          stepOrder: a.stepOrder,
          date: d,
        });
      }
    }
  }

  const belumOrderRecords: any[] = [];
  const seenLokasi = new Set<string>();

  for (const m of statusLokasiList) {
    const lok = m.lokasi.trim().toUpperCase();
    if (isExcludedGorongGorongLocation(lok)) continue;
    if (orderedLokSet.has(lok)) continue;
    if (seenLokasi.has(lok)) continue;

    const statusTanaman = (m.status || '').trim().toUpperCase();
    const isBkOrSt = statusTanaman.endsWith('BK') || statusTanaman.endsWith('ST');
    if (!isBkOrSt) continue;

    const landAkt = landAktMap.get(lok);
    if (!landAkt) continue;

    // Hanya lolos jika setelah dolomit (stepOrder >= 6)
    if (landAkt.stepOrder < 6) continue;

    seenLokasi.add(lok);
    belumOrderRecords.push({
      wilayah: m.strucPlant || '-',
      lokasi: lok,
      luasNetto: m.luasNetto || m.luasAktif || 0,
      status: m.status || '-',
      aktBk: landAkt.formatted,
      stepOrder: landAkt.stepOrder,
    });
  }

  // Replace All pada LokasiBelumOrderGorongGorong
  await prisma.lokasiBelumOrderGorongGorong.deleteMany({});
  if (belumOrderRecords.length > 0) {
    for (let i = 0; i < belumOrderRecords.length; i += 200) {
      const chunk = belumOrderRecords.slice(i, i + 200);
      await prisma.lokasiBelumOrderGorongGorong.createMany({ data: chunk });
    }
  }

  return belumOrderRecords.length;
}

export async function syncMasterDataOrderFromWorkbook(
  wb: XLSX.WorkBook,
  mode: 'full_replace' | 'partial' = 'full_replace'
): Promise<number> {
  const sheetNames = wb.SheetNames || [];
  const match = sheetNames.find((name) =>
    ['data order', 'order gorong'].some((p) => name.trim().toLowerCase().includes(p))
  );
  if (!match) return 0;
  const ws = wb.Sheets[match];
  if (!ws) return 0;

  // 1. Ambil map lookup MasterStatusLokasi (strucPlant) dan LokasiOrderGorongGorong (dsmSt)
  const [statusLokasiList, lokasiOrderList] = await Promise.all([
    prisma.masterStatusLokasi.findMany({ select: { lokasi: true, strucPlant: true } }),
    prisma.lokasiOrderGorongGorong.findMany({ select: { lokasi: true, dsmSt: true } }),
  ]);

  const strucPlantMap = new Map<string, string>();
  for (const s of statusLokasiList) {
    const val = s.strucPlant;
    if (val) strucPlantMap.set(s.lokasi.trim().toUpperCase(), val.trim().toUpperCase());
  }

  const dsmStMap = new Map<string, string>();
  for (const l of lokasiOrderList) {
    if (l.dsmSt && l.dsmSt !== '-') {
      dsmStMap.set(l.lokasi.trim().toUpperCase(), l.dsmSt.trim());
    }
  }

  // 2. Deteksi posisi kolom header secara dinamis (mendukung format PG1 lama 10 kolom & template resmi baru 9 kolom)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z500');
  let cArea = -1;
  let cLokasi = -1;
  let cWilayah = -1;
  let cKeterangan = -1;
  let cTanggal = -1;
  let cD40 = -1;
  let cD60 = -1;
  let cD80 = -1;
  let cD100 = -1;
  let cLookup = -1;
  let headerRow = 4;

  for (let r = 2; r <= Math.min(6, range.e.r); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const text = String(cell.v).toLowerCase().trim();

      if (text === 'area') cArea = c;
      else if (text === 'lokasi' || text === 'petak') {
        cLokasi = c;
        headerRow = r;
      }
      else if (text === 'wil' || text === 'wilayah') cWilayah = c;
      else if (text === 'keterangan' || text === 'ket') cKeterangan = c;
      else if (text === 'tgl' || text === 'tanggal' || text === 'date') cTanggal = c;
      else if (text === '40' || text === 'diameter 40' || text === 'd40' || text === 'ø40') cD40 = c;
      else if (text === '60' || text === 'diameter 60' || text === 'd60' || text === 'ø60') cD60 = c;
      else if (text === '80' || text === 'diameter 80' || text === 'd80' || text === 'ø80') cD80 = c;
      else if (text === '100' || text === 'diameter 100' || text === 'd100' || text === 'ø100') cD100 = c;
      else if (text.includes('lookup') || text.includes('status lookup')) cLookup = c;
    }
  }

  // Fallback defaults jika header tidak terdeteksi lengkap
  if (cLokasi === -1) {
    if (cKeterangan !== -1) {
      cArea = 1; cLokasi = 2; cWilayah = 3; cTanggal = 5;
      cD40 = 6; cD60 = 7; cD80 = 8; cD100 = 9; cLookup = 10;
    } else {
      cArea = 0; cLokasi = 1; cWilayah = 2; cTanggal = 3;
      cD40 = 4; cD60 = 5; cD80 = 6; cD100 = 7; cLookup = 8;
    }
  }

  let dataStartRow = headerRow + 1;
  // Jika baris berikutnya masih memuat nomor diameter (40/60/80/100), lewati ke baris setelahnya
  if (dataStartRow <= range.e.r) {
    const checkCell = ws[XLSX.utils.encode_cell({ r: dataStartRow, c: cD40 !== -1 ? cD40 : 4 })];
    const val = checkCell ? String(checkCell.v).trim() : '';
    if (val === '40' || val.toLowerCase().includes('diameter')) {
      dataStartRow++;
    }
  }

  const getCellVal = (r: number, col: number) => {
    if (col < 0) return null;
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    return cell && cell.v !== undefined && cell.v !== null ? cell.v : null;
  };

  const dataOrderRows: any[] = [];
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const lokVal = getCellVal(r, cLokasi);
    if (!lokVal) continue;
    const lokStr = String(lokVal).trim().toUpperCase();
    if (
      !lokStr ||
      lokStr === 'LOKASI' ||
      lokStr === 'TOTAL' ||
      lokStr === 'GRAND TOTAL' ||
      lokStr.startsWith('TOTAL') ||
      isExcludedGorongGorongLocation(lokStr)
    ) {
      continue;
    }

    const areaVal = getCellVal(r, cArea);
    const area = areaVal ? String(areaVal).trim() : null;

    const ketVal = getCellVal(r, cKeterangan);
    const keterangan = ketVal ? String(ketVal).trim() : null;

    const rawDate = getCellVal(r, cTanggal);
    let tanggal: Date | null = null;
    if (rawDate) {
      if (rawDate instanceof Date) {
        tanggal = isNaN(rawDate.getTime()) ? null : rawDate;
      } else {
        const num = Number(rawDate);
        if (!isNaN(num) && num > 20000 && num < 70000) {
          const utcDays = num - 25569;
          const d = new Date(Math.round(utcDays * 86400 * 1000));
          if (!isNaN(d.getTime())) tanggal = d;
        } else if (typeof rawDate === 'string') {
          const d = new Date(rawDate.trim());
          if (!isNaN(d.getTime())) tanggal = d;
        }
      }
    }

    const d40 = Number(getCellVal(r, cD40)) || 0;
    const d60 = Number(getCellVal(r, cD60)) || 0;
    const d80 = Number(getCellVal(r, cD80)) || 0;
    const d100 = Number(getCellVal(r, cD100)) || 0;

    // Lookup 1: Wilayah dari sel sheet terlebih dahulu (jika valid AW01-AW07), fallback ke MasterStatusLokasi.strucPlant
    const rawWil = getCellVal(r, cWilayah);
    const sheetWil = rawWil ? String(rawWil).trim().toUpperCase() : null;
    const normSheetWil = /^AW0[1-7]$/.test(sheetWil || '') ? sheetWil : (/^W0[1-7]$/.test(sheetWil || '') ? 'A' + sheetWil : null);
    const rawFoundWil = normSheetWil || strucPlantMap.get(lokStr) || sheetWil || null;
    // Jika lokasi tidak memiliki wilayah atau masuk daftar tanpa wilayah, simpan dengan wilayah = null agar masuk Total Semua Wilayah
    const wilayah = isLocationWithoutWilayah(lokStr) ? null : rawFoundWil;

    // Lookup 2: Lookup Status dari LokasiOrderGorongGorong.dsmSt (jika tidak ditemukan -> fallback ke sel sheet)
    const rawLookup = getCellVal(r, cLookup);
    const sheetLookup = rawLookup ? String(rawLookup).trim() : null;
    const lookupStatus = dsmStMap.get(lokStr) || sheetLookup || null;

    dataOrderRows.push({
      area: area || null,
      lokasi: lokStr,
      wilayah,
      keterangan: keterangan || null,
      tanggal,
      diameter40: Math.round(d40),
      diameter60: Math.round(d60),
      diameter80: Math.round(d80),
      diameter100: Math.round(d100),
      lookupStatus,
    });
  }

  if (dataOrderRows.length === 0) return 0;

  if (mode === 'full_replace') {
    await prisma.masterDataOrderGorongGorong.deleteMany({});
    for (let i = 0; i < dataOrderRows.length; i += 200) {
      const chunk = dataOrderRows.slice(i, i + 200);
      await prisma.masterDataOrderGorongGorong.createMany({ data: chunk });
    }
  } else {
    const touchedLoks = Array.from(new Set(dataOrderRows.map((d) => d.lokasi)));
    await prisma.masterDataOrderGorongGorong.deleteMany({
      where: { lokasi: { in: touchedLoks } },
    });
    for (let i = 0; i < dataOrderRows.length; i += 200) {
      const chunk = dataOrderRows.slice(i, i + 200);
      await prisma.masterDataOrderGorongGorong.createMany({ data: chunk });
    }
  }

  return dataOrderRows.length;
}

export async function syncMasterDataDropFromWorkbook(
  wb: XLSX.WorkBook,
  mode: 'full_replace' | 'partial' = 'full_replace'
): Promise<number> {
  const sheetNames = wb.SheetNames || [];
  const match = sheetNames.find((name) =>
    ['data drop', 'drop gorong', 'drop'].some((p) => name.trim().toLowerCase().includes(p))
  );
  if (!match) return 0;
  const ws = wb.Sheets[match];
  if (!ws) return 0;

  // 1. Ambil map lookup MasterStatusLokasi (strucPlant)
  const statusLokasiList = await prisma.masterStatusLokasi.findMany({
    select: { lokasi: true, strucPlant: true }
  });
  const strucPlantMap = new Map<string, string>();
  for (const s of statusLokasiList) {
    if (s.strucPlant) strucPlantMap.set(s.lokasi.trim().toUpperCase(), s.strucPlant.trim().toUpperCase());
  }

  // 2. Deteksi posisi kolom header secara dinamis
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z500');
  let cLokasi = -1;
  let cWilayah = -1;
  let cTanggal = -1;
  let cD40 = -1;
  let cD60 = -1;
  let cD80 = -1;
  let cD100 = -1;
  let headerRow = 4;

  for (let r = 2; r <= Math.min(6, range.e.r); r++) {
    for (let c = range.s.c; c <= Math.min(range.e.c, 25); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined || cell.v === null) continue;
      const text = String(cell.v).toLowerCase().trim();

      if (text === 'lokasi' || text === 'petak') {
        cLokasi = c;
        headerRow = r;
      } else if (text === 'wil' || text === 'wilayah') {
        cWilayah = c;
      } else if ((text === 'tgl' || text === 'tanggal' || text === 'date') && !text.includes('order')) {
        cTanggal = c;
      } else if (text === '40' || text === 'diameter 40' || text === 'd40' || text === 'ø40') {
        cD40 = c;
      } else if (text === '60' || text === 'diameter 60' || text === 'd60' || text === 'ø60') {
        cD60 = c;
      } else if (text === '80' || text === 'diameter 80' || text === 'd80' || text === 'ø80') {
        cD80 = c;
      } else if (text === '100' || text === 'diameter 100' || text === 'd100' || text === 'ø100') {
        cD100 = c;
      }
    }
  }

  // Fallback defaults jika header bertingkat PG1: Lokasi di Col C (2), Tgl di Col G (6), 40 di Col I (8)
  if (cLokasi === -1) {
    // Check if PG1 layout
    if (ws['C4'] || ws['C5'] || ws['C7']) {
      cLokasi = 2; cWilayah = 3; cTanggal = 6; cD40 = 8; cD60 = 9; cD80 = 10; cD100 = 11;
    } else {
      // 7-col layout: Lokasi(0), Wilayah(1), Tanggal(2), D40(3), D60(4), D80(5), D100(6)
      cLokasi = 0; cWilayah = 1; cTanggal = 2; cD40 = 3; cD60 = 4; cD80 = 5; cD100 = 6;
    }
  }

  let dataStartRow = headerRow + 1;
  if (dataStartRow <= range.e.r) {
    const checkCell = ws[XLSX.utils.encode_cell({ r: dataStartRow, c: cD40 !== -1 ? cD40 : 3 })];
    const val = checkCell ? String(checkCell.v).trim() : '';
    if (val === '40' || val.toLowerCase().includes('diameter')) {
      dataStartRow++;
    }
  }

  const getCellVal = (r: number, col: number) => {
    if (col < 0) return null;
    const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
    return cell && cell.v !== undefined && cell.v !== null ? cell.v : null;
  };

  const dataDropRows: any[] = [];
  for (let r = dataStartRow; r <= range.e.r; r++) {
    const lokVal = getCellVal(r, cLokasi);
    if (!lokVal) continue;
    const lokStr = String(lokVal).trim().toUpperCase();
    if (
      !lokStr ||
      lokStr === 'LOKASI' ||
      lokStr === 'TOTAL' ||
      lokStr === 'GRAND TOTAL' ||
      lokStr.startsWith('TOTAL') ||
      isExcludedGorongGorongLocation(lokStr)
    ) {
      continue;
    }

    const rawDate = getCellVal(r, cTanggal);
    if (!rawDate) continue;

    // Abaikan jika 'x' (silang)
    const strDate = String(rawDate).trim().toLowerCase();
    if (strDate === 'x' || strDate.includes('x')) continue;

    let tanggal: Date | null = null;
    if (rawDate instanceof Date) {
      tanggal = isNaN(rawDate.getTime()) ? null : rawDate;
    } else {
      const num = Number(rawDate);
      if (!isNaN(num) && num > 20000 && num < 70000) {
        const utcDays = num - 25569;
        const d = new Date(Math.round(utcDays * 86400 * 1000));
        if (!isNaN(d.getTime())) tanggal = d;
      } else if (typeof rawDate === 'string') {
        const d = new Date(rawDate.trim());
        if (!isNaN(d.getTime())) tanggal = d;
      }
    }

    if (!tanggal) continue;

    const yr = tanggal.getFullYear();
    // Hanya tahun 2025 dan 2026
    if (yr !== 2025 && yr !== 2026) continue;

    const d40 = Number(getCellVal(r, cD40)) || 0;
    const d60 = Number(getCellVal(r, cD60)) || 0;
    const d80 = Number(getCellVal(r, cD80)) || 0;
    const d100 = Number(getCellVal(r, cD100)) || 0;

    // Lookup wilayah dari MasterStatusLokasi.strucPlant
    const rawWil = getCellVal(r, cWilayah);
    const sheetWil = rawWil ? String(rawWil).trim().toUpperCase() : null;
    const wilayah = strucPlantMap.get(lokStr) || sheetWil || null;

    dataDropRows.push({
      lokasi: lokStr,
      wilayah,
      tanggal,
      diameter40: Math.round(d40),
      diameter60: Math.round(d60),
      diameter80: Math.round(d80),
      diameter100: Math.round(d100),
    });
  }

  if (dataDropRows.length === 0) return 0;

  if (mode === 'full_replace') {
    await prisma.masterDataDropGorongGorong.deleteMany({});
    for (let i = 0; i < dataDropRows.length; i += 200) {
      const chunk = dataDropRows.slice(i, i + 200);
      await prisma.masterDataDropGorongGorong.createMany({ data: chunk });
    }
  } else {
    const touchedLoks = Array.from(new Set(dataDropRows.map((d) => d.lokasi)));
    await prisma.masterDataDropGorongGorong.deleteMany({
      where: { lokasi: { in: touchedLoks } },
    });
    for (let i = 0; i < dataDropRows.length; i += 200) {
      const chunk = dataDropRows.slice(i, i + 200);
      await prisma.masterDataDropGorongGorong.createMany({ data: chunk });
    }
  }

  return dataDropRows.length;
}


