import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';
import { computeAktivitasTerakhir } from '@/lib/landActivityUtils';
import { calculateLandPlanSchedule } from '@/lib/planScheduleCascade';
import { recalculateAndPersistStageStocks } from '@/lib/stageStockCalculator';
import { syncMonthlySummaryFromLands } from '@/lib/syncMonthlySummary';
import { getLandStokCategory } from '@/lib/landClassification';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function normalizeKey(str: any): string {
  if (str === undefined || str === null) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseNumber(val: any): number | null {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseString(val: any): string | null {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '#N/A' || s === '0') return null;
  return s;
}

function cleanStatus(val: any): string | null {
  const s = parseString(val);
  if (!s) return null;
  const cleaned = s.replace(/\d+/g, '').trim();
  return cleaned || s;
}

function parseDateString(val: any): string | null {
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A' || val === 0 || val === '0') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    const day = String(val.getDate()).padStart(2, '0');
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const year = val.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const num = typeof val === 'number' ? val : parseFloat(String(val).trim());
  if (!isNaN(num) && num > 30000 && num < 65000) {
    const d = xlsx.SSF.parse_date_code(num);
    const day = String(d.d).padStart(2, '0');
    const month = String(d.m).padStart(2, '0');
    return `${day}/${month}/${d.y}`;
  }
  const s = String(val).trim();
  // Check DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = '20' + year;
    return `${day}/${month}/${year}`;
  }
  // Check YYYY-MM-DD
  const ymdMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const day = ymdMatch[3].padStart(2, '0');
    const month = ymdMatch[2].padStart(2, '0');
    const year = ymdMatch[1];
    return `${day}/${month}/${year}`;
  }
  // Check DD-MM-YYYY
  const dmyDash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dmyDash) {
    const day = dmyDash[1].padStart(2, '0');
    const month = dmyDash[2].padStart(2, '0');
    let year = dmyDash[3];
    if (year.length === 2) year = '20' + year;
    return `${day}/${month}/${year}`;
  }
  return s === '' || s === '-' || s === '0' ? null : s;
}

function parseMonthYearString(val: any): string | null {
  if (val === undefined || val === null || val === '' || val === '-' || val === '#N/A' || val === 0 || val === '0') return null;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${MONTH_NAMES[val.getMonth()]}-${String(val.getFullYear()).slice(2)}`;
  }
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) {
    const m = parseInt(mMatch[1], 10);
    const y = mMatch[2];
    if (m >= 1 && m <= 12) return `${MONTH_NAMES[m - 1]}-${y.slice(2)}`;
  }
  const num = typeof val === 'number' ? val : parseFloat(s);
  if (!isNaN(num) && num > 30000 && num < 65000) {
    const d = xlsx.SSF.parse_date_code(num);
    return `${MONTH_NAMES[d.m - 1]}-${String(d.y).slice(2)}`;
  }
  // Format DD/MM/YYYY
  const slashParts = s.split('/');
  if (slashParts.length === 3) {
    const m = parseInt(slashParts[1], 10);
    let y = slashParts[2];
    if (y.length === 4) y = y.slice(2);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return `${MONTH_NAMES[m - 1]}-${y}`;
    }
  }
  return s;
}

function parseYear(val: any): number | null {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  if (typeof val === 'number') {
    if (val >= 2000 && val <= 2050) return Math.round(val);
    if (val > 30000 && val < 65000) {
      return xlsx.SSF.parse_date_code(val).y;
    }
    const str = String(val);
    const m = str.match(/^(\d{1,2})(20\d{2})$/);
    if (m) return parseInt(m[2], 10);
    return null;
  }
  const s = String(val).trim();
  const mMatch = s.match(/^(\d{1,2})(20\d{2})$/);
  if (mMatch) return parseInt(mMatch[2], 10);
  const m = s.match(/(20\d{2})/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function parseYearFromStatus(val: any): number | null {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/(\d{2})/);
  if (m) {
    const yy = parseInt(m[1], 10);
    if (yy >= 15 && yy <= 35) return 2000 + yy;
  }
  return null;
}

function normalizeWilayah(rawW: any): string {
  if (!rawW) return 'W01';
  const clean = String(rawW).trim().toUpperCase();
  if (clean === 'ARS1') return 'W07';
  if (clean === 'SAG1' || clean === 'MD2') return 'W04';
  if (clean.startsWith('AW0')) return 'W0' + clean.slice(3);
  if (clean.startsWith('AW')) {
    const num = clean.slice(2);
    return num.length === 1 ? 'W0' + num : 'W' + num;
  }
  if (/^W\d+$/.test(clean)) {
    const num = clean.slice(1);
    return num.length === 1 ? 'W0' + num : clean;
  }
  return clean;
}

function parseBibit(val: any): { jenis: string | null; kelas: string | null } {
  if (!val) return { jenis: null, kelas: null };
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '0') return { jenis: null, kelas: null };

  const BIBIT_CODE_MAP: Record<string, { jenis: string; kelas: string }> = {
    NSGP3SS1: { jenis: 'Sucker', kelas: 'Sedang' },
    NSGP3SB1: { jenis: 'Sucker', kelas: 'Besar' },
    NSGP3SK1: { jenis: 'Sucker', kelas: 'Kecil' },
    NSGP3CK1: { jenis: 'Crown', kelas: 'Kecil' },
    NSGP3CB1: { jenis: 'Crown', kelas: 'Besar' },
    NSGP3CS1: { jenis: 'Crown', kelas: 'Sedang' },
    NSGP3NK1: { jenis: 'Crown', kelas: 'Kecil' },
    NSGP3TB1: { jenis: 'TC', kelas: 'Besar' },
    NSGP3NS1: { jenis: 'Nanas', kelas: 'Sedang' },
  };

  if (BIBIT_CODE_MAP[s]) {
    return BIBIT_CODE_MAP[s];
  }

  const match = s.match(/^([^\(]+)(?:\((.*?)\))?$/);
  if (match) {
    return {
      jenis: match[1].trim() || null,
      kelas: match[2] ? match[2].trim() : null,
    };
  }

  return { jenis: s, kelas: null };
}

function extractMonthYearIndex(val: any): { year: number; monthIndex: number } | null {
  if (!val) return null;
  const s = String(val).trim();
  const parts = s.split('/');
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
      return { year: y, monthIndex: m };
    }
  }
  const pDash = s.split('-');
  if (pDash.length === 2) {
    const mStr = pDash[0].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6,
      jul: 7, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
    };
    let y = parseInt(pDash[1], 10);
    if (y < 100) y += 2000;
    if (monthsMap[mStr] && !isNaN(y)) {
      return { year: y, monthIndex: monthsMap[mStr] };
    }
  }
  return null;
}

// Konfigurasi 20 Tahapan Aktivitas Pipeline
const activitiesConfig = [
  { code: '01.CHOPPER', name: 'Chopper', rencKey: 'chopper', realKey: 'realChopper', rencCol: 13, realCol: 74, order: 1 },
  { code: '02.CHOPPER_LU', name: 'Chopper Lu', rencKey: 'chopperLu', realKey: 'realChopperLu', rencCol: 14, realCol: 75, order: 2 },
  { code: '03.RH1', name: 'RH1', rencKey: 'rh1', realKey: 'realRh1', rencCol: 15, realCol: 76, order: 3 },
  { code: '04.CUTTING_BANANA', name: 'Cutting Banana', rencKey: 'cuttingBanana', realKey: 'realCuttingBanana', rencCol: 16, realCol: 77, order: 4 },
  { code: '05.DOLOMIT', name: 'Aplikasi Dolomit', rencKey: 'dolomit', realKey: 'realDolomit', rencCol: 17, realCol: 78, order: 5 },
  { code: '06.DP1', name: 'DP1', rencKey: 'dp1', realKey: 'realDp1', rencCol: 18, realCol: 79, order: 6 },
  { code: '07.DP_CROSS', name: 'DP Cross', rencKey: 'dpCross', realKey: 'realDpCross', rencCol: 19, realCol: 80, order: 7 },
  { code: '08.DP2', name: 'DP2', rencKey: 'dp2', realKey: 'realDp2', rencCol: 20, realCol: 81, order: 8 },
  { code: '09.BELERANG', name: 'Belerang', rencKey: 'belerang', realKey: 'realBelerang', rencCol: 21, realCol: 82, order: 9 },
  { code: '10.KOMPOS', name: 'Kompos', rencKey: 'kompos', realKey: 'realKompos', rencCol: 22, realCol: 83, order: 10 },
  { code: '11.BAJAK_AWAL', name: 'Bajak Awal', rencKey: 'bajakAwalMb5Btr', realKey: 'realBajakAwalMb5Btr', rencCol: 25, realCol: 84, order: 11 },
  { code: '17.SUBSOILER', name: 'Subsoiler', rencKey: 'subsoilerSs1', realKey: 'realSubsoilerSs1', rencCol: 38, realCol: 97, order: 12 },
  { code: '18.FINISHING_HARROW', name: 'Finishing Harrow', rencKey: 'hrEksMb', realKey: 'realHrEksMb', rencCol: 40, realCol: 98, order: 13 },
  { code: '19.FINISHING_ROTARY', name: 'Finishing Rotary', rencKey: 'finishingRotaryFh1', realKey: 'realFinishingRotaryFh1', rencCol: 41, realCol: 99, order: 14 },
  { code: '20.ROTARY_FH2', name: 'Rotary FH2', rencKey: 'finishingRotaryFh2', realKey: 'realRotaryFh2', rencCol: 42, realCol: 100, order: 15 },
  { code: '21.RIDGER', name: 'Ridger', rencKey: 'ridger', realKey: 'realRidger', rencCol: 43, realCol: 101, order: 16 },
  { code: '22.JALAN_SAL', name: 'Jalan & Saluran', rencKey: 'jalanSal', realKey: 'realJalanSal', rencCol: 44, realCol: 102, order: 17 },
  { code: '22.SIAP_TANAM', name: 'Siap Tanam', rencKey: null, realKey: 'realSiapTanam', rencCol: null, realCol: 103, order: 18 },
  { code: '23.PROSES_TNM', name: 'Proses Tanam', rencKey: 'rencMulaiTanam', realKey: 'realMulaiTanam', rencCol: 47, realCol: 104, order: 19 },
  { code: '24.SLS_TANAM', name: 'Selesai Tanam', rencKey: 'rencSelesaiTanam', realKey: 'realSelesaiTanam', rencCol: 48, realCol: 105, order: 20 },
];

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File Excel tidak ditemukan dalam permintaan upload' },
        { status: 400 }
      );
    }

    const fileName = file.name || '';
    if (!fileName.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, error: 'Format file tidak didukung. Mohon unggah file berekstensi .xlsx atau .xls' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Baca workbook Excel
    const wb = xlsx.read(buffer, { type: 'buffer', cellDates: false });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File Excel tidak memiliki lembar kerja (sheet) yang valid.' },
        { status: 400 }
      );
    }

    // 1. SMART DETECTION SHEET UTAMA:
    // Tidak lagi mengunci sheet harus bernama 'Master'.
    // Prioritas: 'Data Lahan' -> 'Master' -> 'Sheet1' -> Sheet pertama yang tersedia di file.
    let targetSheetName = wb.SheetNames.find((name) => {
      const lower = name.trim().toLowerCase();
      return lower === 'data lahan' || lower.includes('data lahan') || lower === 'lahan';
    });

    if (!targetSheetName) {
      targetSheetName = wb.SheetNames.find((name) => name.trim().toLowerCase() === 'master');
    }

    if (!targetSheetName) {
      targetSheetName = wb.SheetNames[0];
    }

    const sheetMaster = wb.Sheets[targetSheetName];
    if (!sheetMaster || !sheetMaster['!ref']) {
      return NextResponse.json(
        { success: false, error: `Sheet "${targetSheetName}" kosong atau tidak memiliki data yang valid.` },
        { status: 400 }
      );
    }

    // Deteksi sheet pendukung jika ada di workbook (misal file legacy Master Schedule)
    const stokSheetName = wb.SheetNames.find((name) => {
      const lower = name.trim().toLowerCase();
      return lower === 'stok lahan' || lower.includes('stok lahan');
    });

    const rcnSheetName = wb.SheetNames.find((name) => {
      const lower = name.trim().toLowerCase();
      return lower.includes('rcn') || lower.includes('berjln') || lower.includes('summary');
    });

    const rangeMaster = xlsx.utils.decode_range(sheetMaster['!ref']);
    const getMasterCell = (r: number, c: number) => sheetMaster[xlsx.utils.encode_cell({ r, c })]?.v;

    // 2. DETEKSI MODE: Cek apakah file menggunakan Template Resmi (header di baris 1-5) atau Master Legacy
    let headerRowIndex = -1;
    const headerColMap = new Map<string, number>();

    // Pindai baris 0 s.d. 8 untuk menemukan baris header
    for (let r = 0; r <= Math.min(8, rangeMaster.e.r); r++) {
      let foundLokasi = false;
      let foundWilayah = false;
      let foundLuas = false;

      for (let c = rangeMaster.s.c; c <= rangeMaster.e.c; c++) {
        const val = getMasterCell(r, c);
        if (val) {
          const norm = normalizeKey(val);
          if (norm === 'lokasi' || norm === 'petak') foundLokasi = true;
          if (norm === 'wilayah') foundWilayah = true;
          if (norm.includes('luas') || norm.includes('netto')) foundLuas = true;
        }
      }

      if (foundLokasi && (foundWilayah || foundLuas)) {
        headerRowIndex = r;
        // Bangun peta kolom header ternormalisasi
        for (let c = rangeMaster.s.c; c <= rangeMaster.e.c; c++) {
          const val = getMasterCell(r, c);
          if (val) {
            headerColMap.set(normalizeKey(val), c);
          }
        }
        break;
      }
    }

    const isTemplateMode = headerRowIndex !== -1;

    // Helper untuk mengambil cell berdasarkan beberapa variasi kata kunci header
    const getValFromHeader = (r: number, colKeys: string[]): any => {
      for (const k of colKeys) {
        const norm = normalizeKey(k);
        const c = headerColMap.get(norm);
        if (c !== undefined) {
          const v = getMasterCell(r, c);
          if (v !== undefined && v !== null && v !== '') return v;
        }
      }
      return null;
    };

    const parsedRecords: Array<{
      landData: any;
      activitiesData: any[];
    }> = [];

    if (isTemplateMode) {
      // ==========================================================
      // A. PARSING VIA TEMPLATE DATA LAHAN RESMI (Pure Value Inputs)
      // ==========================================================
      for (let r = headerRowIndex + 1; r <= rangeMaster.e.r; r++) {
        const rawLokasi = getValFromHeader(r, ['lokasi', 'petak', 'namapetak', 'location']);
        if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
        if (String(rawLokasi).trim().toUpperCase() === 'LOKASI') continue;
        const lokasi = String(rawLokasi).trim();

        const rawWilayah = getValFromHeader(r, ['wilayah', 'kebun', 'afdeling', 'estate']);
        const wilayah = normalizeWilayah(rawWilayah);

        const luasBruto = parseNumber(getValFromHeader(r, ['luasbrutoha', 'luasbruto', 'bruto', 'grossha'])) || 0;
        const luasNetto = parseNumber(getValFromHeader(r, ['luasnettoha', 'luasnetto', 'netto', 'netha'])) || 0;
        const status = cleanStatus(getValFromHeader(r, ['status', 'statustanaman', 'sts']));

        const bibitVal = getValFromHeader(r, ['bibitkelas', 'bibitdankelas', 'bibit', 'jenisbibit', 'varietas', 'seed']);
        const kelasVal = getValFromHeader(r, ['kelasbibit', 'kelas', 'grade']);
        const parsedB = parseBibit(bibitVal);
        const jenisBibit = parsedB.jenis || parseString(bibitVal);
        const kelasBibit = parseString(kelasVal) || parsedB.kelas;

        let bulanTanam = parseMonthYearString(getValFromHeader(r, ['bulantanam', 'bt', 'bulantnm', 'tanggaltanam', 'tgltanam']));
        const rencanaBero = parseNumber(getValFromHeader(r, ['rencanaberohari', 'rencanabero', 'haribero', 'hariberohari', 'bero']));
        const eks = parseString(getValFromHeader(r, ['eks', 'ekstanaman', 'ex', 'extanaman']));
        const sejarah = parseString(getValFromHeader(r, ['sejarahps', 'sejarah', 'sejarahrotasi', 'rotasi']));
        const phBk = parseNumber(getValFromHeader(r, ['phbk', 'phbkawal']));
        const phSn = parseNumber(getValFromHeader(r, ['phsn', 'phsntanam']));
        const bulanSn = parseMonthYearString(getValFromHeader(r, ['bulansiaptanamsn', 'bulansiaptanam', 'bulansn', 'snmonth']));

        // Rencana & Realisasi Tanggal Tahapan
        const rencChopper = parseDateString(getValFromHeader(r, ['chopperrenc', 'rencchopper', 'chopperrcn', 'rcnchopper', 'chopperplan']));
        const realChopper = parseDateString(getValFromHeader(r, ['chopperreal', 'realchopper', 'chopperact', 'chopper']));
        const rencChopperLu = parseDateString(getValFromHeader(r, ['chopperlurenc', 'rencchopperlu']));
        const realChopperLu = parseDateString(getValFromHeader(r, ['chopperlureal', 'realchopperlu']));
        const rencRh1 = parseDateString(getValFromHeader(r, ['rh1renc', 'rencrh1']));
        const realRh1 = parseDateString(getValFromHeader(r, ['rh1real', 'realrh1']));
        const rencCuttingBanana = parseDateString(getValFromHeader(r, ['cuttingbananarenc', 'renccuttingbanana']));
        const realCuttingBanana = parseDateString(getValFromHeader(r, ['cuttingbananareal', 'realcuttingbanana']));
        const rencDolomit = parseDateString(getValFromHeader(r, ['dolomitrenc', 'rencdolomit', 'aplikasidolomitrenc']));
        const realDolomit = parseDateString(getValFromHeader(r, ['dolomitreal', 'realdolomit', 'aplikasidolomitreal']));
        const rencDp1 = parseDateString(getValFromHeader(r, ['dp1renc', 'rencdp1']));
        const realDp1 = parseDateString(getValFromHeader(r, ['dp1real', 'realdp1']));
        const rencDpCross = parseDateString(getValFromHeader(r, ['dpcrossrenc', 'rencdpcross']));
        const realDpCross = parseDateString(getValFromHeader(r, ['dpcrossreal', 'realdpcross']));
        const rencDp2 = parseDateString(getValFromHeader(r, ['dp2renc', 'rencdp2']));
        const realDp2 = parseDateString(getValFromHeader(r, ['dp2real', 'realdp2']));
        const rencBelerang = parseDateString(getValFromHeader(r, ['belerangrenc', 'rencbelerang']));
        const realBelerang = parseDateString(getValFromHeader(r, ['belerangreal', 'realbelerang']));
        const rencKompos = parseDateString(getValFromHeader(r, ['komposrenc', 'renckompos']));
        const realKompos = parseDateString(getValFromHeader(r, ['komposreal', 'realkompos']));

        // Bajak
        const rencMb5 = parseDateString(getValFromHeader(r, ['mb5btrrenc', 'bajakawalmb5btrrenc', 'rencmb5btr', 'bajakrenc', 'bajakawalrenc', 'rencbajak']));
        const realMb5 = parseDateString(getValFromHeader(r, ['mb5btrreal', 'bajakawalmb5btrreal', 'realmb5btr', 'bajakreal', 'bajakawalreal', 'realbajak']));
        const rencMb25 = parseDateString(getValFromHeader(r, ['mb25renc', 'bajakawalmb25renc', 'rencmb25']));
        const realMb25 = parseDateString(getValFromHeader(r, ['mb25real', 'bajakawalmb25real', 'realmb25']));
        const rencMph = parseDateString(getValFromHeader(r, ['mphrenc', 'bajakawalphrenc', 'bajakawalmphrenc', 'rencmph']));
        const realMph = parseDateString(getValFromHeader(r, ['mphreal', 'bajakawalphreal', 'bajakawalmphreal', 'realmph', 'realhoward']));
        const rencNardi = parseDateString(getValFromHeader(r, ['nardirenc', 'bajakawalnardirenc', 'rencnardi']));
        const realNardi = parseDateString(getValFromHeader(r, ['nardireal', 'bajakawalnardireal', 'realnardi']));
        const rencHrEks = parseDateString(getValFromHeader(r, ['hreksmbrenc', 'renchreksmb']));
        const realHrEks = parseDateString(getValFromHeader(r, ['hreksmbreal', 'realhreksmb']));
        const rencSs1 = parseDateString(getValFromHeader(r, ['ss1renc', 'subsoilerss1renc', 'rencss1']));
        const realSs1 = parseDateString(getValFromHeader(r, ['ss1real', 'subsoilerss1real', 'realss1']));
        const rencSs2 = parseDateString(getValFromHeader(r, ['ss2renc', 'subsoilerss2renc', 'rencss2']));
        const realSs2 = parseDateString(getValFromHeader(r, ['ss2real', 'subsoilerss2real', 'realss2']));
        const rencFh1 = parseDateString(getValFromHeader(r, ['rotaryfh1renc', 'finishingrotaryfh1renc', 'rencfh1', 'fh1renc']));
        const realFh1 = parseDateString(getValFromHeader(r, ['rotaryfh1real', 'finishingrotaryfh1real', 'realfh1', 'fh1real']));
        const rencFh2 = parseDateString(getValFromHeader(r, ['rotaryfh2renc', 'finishingrotaryfh2renc', 'rencfh2', 'fh2renc']));
        const realFh2 = parseDateString(getValFromHeader(r, ['rotaryfh2real', 'finishingrotaryfh2real', 'realfh2', 'fh2real']));
        const rencRidger = parseDateString(getValFromHeader(r, ['ridgerrenc', 'rencridger']));
        const realRidger = parseDateString(getValFromHeader(r, ['ridgerreal', 'realridger']));

        // Jalan Sal, Siap Tanam, Tanam
        const rencJalanSal = parseDateString(getValFromHeader(r, ['jalansalrenc', 'jalandansalrenc', 'rencjalansal', 'rencsaluran']));
        const realJalanSal = parseDateString(getValFromHeader(r, ['jalansalreal', 'jalandansalreal', 'realjalansal', 'realsaluran']));
        const realSiapTanam = parseDateString(getValFromHeader(r, ['siaptanam', 'siaptanamreal', 'realsiaptanam']));
        const realMulaiTanam = parseDateString(getValFromHeader(r, ['prosestanam', 'prosestanamreal', 'realmulaitanam', 'realmulai', 'mulaitanam', 'realisasimulaitanam']));
        const rencMulaiTanam = parseDateString(getValFromHeader(r, ['prosestanamrenc', 'rencanamulaitanam', 'rencmulaitanam', 'rencmulai']));
        const realSelesaiTanam = parseDateString(getValFromHeader(r, ['selesaitanam', 'selesaitanamreal', 'realselesaitanam', 'realselesai', 'realisasiselesaitanam']));
        const rencSelesaiTanam = parseDateString(getValFromHeader(r, ['selesaitanamrenc', 'rencanaselesaitanam', 'rencselesaitanam', 'rencselesai']));

        const hariWaktu = parseNumber(getValFromHeader(r, ['durasitanamhari', 'durasitanam', 'hariwaktu']));
        const statusProduksi = parseString(getValFromHeader(r, ['statusproduksi']));
        const bulanPanen = parseMonthYearString(getValFromHeader(r, ['bulanpanen']));
        const stdPanen = parseString(getValFromHeader(r, ['standarpanen', 'stdpanen']));
        const deviasiMonth = parseNumber(getValFromHeader(r, ['deviasipanenbulan', 'deviasipanen', 'deviasimonth']));

        // Penentuan Tahun Siklus Lahan
        const rawYear = parseYear(getValFromHeader(r, ['tahun', 'year', 'tahuntanam', 'tahunpanen', 'thn']));
        const btYear = parseYear(bulanTanam);
        const slsYear = parseYear(realSelesaiTanam || rencSelesaiTanam);
        const mliYear = parseYear(realMulaiTanam || rencMulaiTanam);
        const bkrYear = parseYear(realChopper || rencChopper);
        const snYear = parseYear(bulanSn);
        const cycleYear = rawYear || btYear || slsYear || mliYear || bkrYear || snYear || 2026;

        const rawRencBero = rencanaBero || hariWaktu;

        const aplikasiDetails: Record<string, any> = {
          rencanaBero: rawRencBero,
          chopper: rencChopper,
          realChopper: realChopper,
          chopperLu: rencChopperLu,
          realChopperLu: realChopperLu,
          rh1: rencRh1,
          realRh1: realRh1,
          cuttingBanana: rencCuttingBanana,
          realCuttingBanana: realCuttingBanana,
          dolomit: rencDolomit,
          realDolomit: realDolomit,
          dp1: rencDp1,
          realDp1: realDp1,
          dpCross: rencDpCross,
          realDpCross: realDpCross,
          dp2: rencDp2,
          realDp2: realDp2,
          belerang: rencBelerang,
          realBelerang: realBelerang,
          kompos: rencKompos,
          realKompos: realKompos,

          // Bajak
          bajakAwalMb5Btr: rencMb5,
          realBajakAwalMb5Btr: realMb5,
          bajakAwalMb25: rencMb25,
          realBajakAwalMb25: realMb25,
          bajakAwalMph: rencMph,
          realBajakAwalHoward: realMph,
          bajakAwalNardi: rencNardi,
          realBajakAwalNardi: realNardi,
          hrEksMb: rencHrEks,
          realHrEksMb: realHrEks,
          subsoilerSs1: rencSs1,
          realSubsoilerSs1: realSs1,
          subsoilerSs2: rencSs2,
          realSubsoilerSs2: realSs2,
          finishingRotaryFh1: rencFh1,
          realFinishingRotaryFh1: realFh1,
          finishingRotaryFh2: rencFh2,
          realRotaryFh2: realFh2,
          ridger: rencRidger,
          realRidger: realRidger,

          // Jalan & Sal, Siap Tanam, Mulai & Selesai Tanam
          jalanSal: rencJalanSal,
          realJalanSal: realJalanSal,
          siapTanam: realSiapTanam,
          realSiapTanam: realSiapTanam,
          prosesTanam: realMulaiTanam,
          realMulaiTanam: realMulaiTanam,
          rencMulaiTanam: rencMulaiTanam,
          selesaiTanam: realSelesaiTanam,
          realSelesaiTanam: realSelesaiTanam,
          rencSelesaiTanam: rencSelesaiTanam,
        };

        // Terapkan Rumus Cascade Jadwal Rencana Otomatis
        const schedule = calculateLandPlanSchedule({
          rencanaChopper: aplikasiDetails.chopper || null,
          rencanaBero: rawRencBero,
          realChopper: aplikasiDetails.realChopper || null,
          realMb5Btr: aplikasiDetails.realBajakAwalMb5Btr || null,
          realSs1: aplikasiDetails.realSubsoilerSs1 || null,
          realRotaryFh1: aplikasiDetails.realFinishingRotaryFh1 || null,
          realJalanSal: aplikasiDetails.realJalanSal || null,
          existingRencanaJalanSal: aplikasiDetails.jalanSal || null,
          existingRencanaRidger: aplikasiDetails.ridger || null,
          existingRencanaRotaryFh1: aplikasiDetails.finishingRotaryFh1 || null,
          existingRencanaDolomit: aplikasiDetails.dolomit || null,
          existingRencanaMb5Btr: aplikasiDetails.bajakAwalMb5Btr || null,
          existingRencanaSs1: aplikasiDetails.subsoilerSs1 || null,
        });

        if (!aplikasiDetails.chopperLu && schedule.rencanaChopperLu) aplikasiDetails.chopperLu = schedule.rencanaChopperLu;
        if (!aplikasiDetails.rh1 && schedule.rencanaRh1) aplikasiDetails.rh1 = schedule.rencanaRh1;
        if (!aplikasiDetails.dolomit && schedule.rencanaDolomit) aplikasiDetails.dolomit = schedule.rencanaDolomit;
        if (!aplikasiDetails.bajakAwalMb5Btr && schedule.rencanaMb5Btr) aplikasiDetails.bajakAwalMb5Btr = schedule.rencanaMb5Btr;
        if (!aplikasiDetails.subsoilerSs1 && schedule.rencanaSs1) aplikasiDetails.subsoilerSs1 = schedule.rencanaSs1;
        if (!aplikasiDetails.ridger && schedule.rencanaRidger) aplikasiDetails.ridger = schedule.rencanaRidger;
        if (!aplikasiDetails.finishingRotaryFh1 && schedule.rencanaRotaryFh1) aplikasiDetails.finishingRotaryFh1 = schedule.rencanaRotaryFh1;
        if (!aplikasiDetails.jalanSal && schedule.rencanaJalanSal) aplikasiDetails.jalanSal = schedule.rencanaJalanSal;

        const activitiesData = activitiesConfig.map((act) => {
          const renc = act.rencKey ? aplikasiDetails[act.rencKey] || null : null;
          const real = act.realKey ? aplikasiDetails[act.realKey] || null : null;

          let statusAct = 'PENDING';
          if (real) {
            statusAct = 'COMPLETED';
          } else if (renc) {
            statusAct = 'IN_PROGRESS';
          }

          return {
            stepOrder: act.order,
            code: act.code,
            name: act.name,
            rencanaDate: renc,
            realisasiDate: real,
            status: statusAct,
          };
        });

        let progressTanam = 0;
        if (realSelesaiTanam) {
          progressTanam = 100;
        } else if (realMulaiTanam) {
          progressTanam = 50;
        } else if (realMb5 || realChopper) {
          progressTanam = 25;
        }

        const tempLandForAktivitas = {
          progressTanam,
          realBajak: realMb5,
          realMulaiTanam,
          realSelesaiTanam,
          aplikasiDetails,
          activities: activitiesData,
        };
        const computedAktivitasTerakhir = computeAktivitasTerakhir(tempLandForAktivitas);

        parsedRecords.push({
          landData: {
            lokasi,
            wilayah,
            year: cycleYear,
            luasBruto,
            luasNetto,
            status,
            eks,
            sejarah,
            phBk,
            phSn,
            rencBkr: aplikasiDetails.chopper || null,
            rencBajak: aplikasiDetails.bajakAwalMb5Btr || null,
            realBkr: aplikasiDetails.realChopper || null,
            realBajak: aplikasiDetails.realBajakAwalMb5Btr || null,
            aplikasiTerakhir: computedAktivitasTerakhir || 'Persiapan Bongkar',
            bulanSn,
            statusAplikasi: computedAktivitasTerakhir || null,
            rencMulaiTanam,
            rencSelesaiTanam,
            realMulaiTanam,
            realSelesaiTanam,
            hariWaktu: rawRencBero ? Math.round(rawRencBero) : null,
            bulanTanam,
            bulanPanen,
            jenisBibit,
            kelasBibit,
            statusProduksi,
            stdPanen,
            deviasiMonth: deviasiMonth ? Math.round(deviasiMonth) : null,
            progressTanam,
            aplikasiDetails,
          },
          activitiesData,
        });
      }
    } else {
      // ==========================================================
      // B. FALLBACK MODE: MASTER SCHEDULE LEGACY (Sheet Master, r >= 11)
      // ==========================================================
      for (let r = 11; r <= rangeMaster.e.r; r++) {
        const rawLokasi = getMasterCell(r, 3); // Kolom D: LOKASI
        if (!rawLokasi || String(rawLokasi).trim() === '' || String(rawLokasi).trim() === '-') continue;
        if (rawLokasi === 1 || rawLokasi === '1' || String(rawLokasi).trim().toUpperCase() === 'LOKASI') continue;
        const lokasi = String(rawLokasi).trim();

        const btYear = parseYear(getMasterCell(r, 53));
        const slsRealYear = parseYear(getMasterCell(r, 105));
        const slsRencYear = parseYear(getMasterCell(r, 48));
        const mliRealYear = parseYear(getMasterCell(r, 104));
        const mliRencYear = parseYear(getMasterCell(r, 47));
        const stsYear = parseYearFromStatus(getMasterCell(r, 6));
        const bkrRealYear = parseYear(getMasterCell(r, 72));
        const bkrRencYear = parseYear(getMasterCell(r, 11));
        const snYear = parseYear(getMasterCell(r, 1)) || parseYear(getMasterCell(r, 52));

        const cycleYear = btYear || slsRealYear || slsRencYear || mliRealYear || mliRencYear || stsYear || bkrRealYear || bkrRencYear || snYear || 2026;

        const rawWilayah = parseString(getMasterCell(r, 2));
        const wilayah = normalizeWilayah(rawWilayah);
        const luasBruto = parseNumber(getMasterCell(r, 4)) || 0;
        const luasNetto = parseNumber(getMasterCell(r, 5)) || 0;
        const status = cleanStatus(getMasterCell(r, 6));
        const eks = parseString(getMasterCell(r, 7));
        const sejarah = parseString(getMasterCell(r, 8));

        const bibitInfo = parseBibit(getMasterCell(r, 51));
        const jenisBibit = bibitInfo.jenis;
        const kelasBibit = bibitInfo.kelas;

        let rawBulanTanam = parseMonthYearString(getMasterCell(r, 53) || getMasterCell(r, 125));
        if (rawBulanTanam && (rawBulanTanam.endsWith('-14') || rawBulanTanam.includes('2014') || rawBulanTanam.includes('1900'))) {
          rawBulanTanam = null;
        }
        const bulanTanam = rawBulanTanam;

        const phBk = parseNumber(getMasterCell(r, 9));
        const phSn = parseNumber(getMasterCell(r, 10));
        const rencBkr = parseDateString(getMasterCell(r, 11));
        const rencBajak = parseDateString(getMasterCell(r, 12));
        const realBkr = parseDateString(getMasterCell(r, 72));
        const realBajak = parseDateString(getMasterCell(r, 73));
        const bulanSn = parseMonthYearString(getMasterCell(r, 52) || getMasterCell(r, 1));
        const statusAplikasi = parseString(getMasterCell(r, 48)) || parseString(getMasterCell(r, 111));
        const hariWaktu = parseNumber(getMasterCell(r, 49)) ? Math.round(parseNumber(getMasterCell(r, 49))!) : null;

        const rencJalanSal = parseDateString(getMasterCell(r, 44));
        const realJalanSal = parseDateString(getMasterCell(r, 102));
        const realSiapTanam = parseDateString(getMasterCell(r, 103));
        const rencMulaiTanam = parseDateString(getMasterCell(r, 47));
        const realMulaiTanam = parseDateString(getMasterCell(r, 104));
        const rencSelesaiTanam = parseDateString(getMasterCell(r, 48));
        const realSelesaiTanam = parseDateString(getMasterCell(r, 105));

        const rawRencBero = parseNumber(getMasterCell(r, 21)) || hariWaktu;

        const aplikasiDetails: Record<string, any> = {
          rencanaBero: rawRencBero,
          chopper: parseDateString(getMasterCell(r, 13)) || rencBkr,
          realChopper: parseDateString(getMasterCell(r, 74)) || realBkr,
          chopperLu: parseDateString(getMasterCell(r, 14)),
          realChopperLu: parseDateString(getMasterCell(r, 75)),
          rh1: parseDateString(getMasterCell(r, 15)),
          realRh1: parseDateString(getMasterCell(r, 76)),
          cuttingBanana: parseDateString(getMasterCell(r, 16)),
          realCuttingBanana: parseDateString(getMasterCell(r, 77)),
          dolomit: parseDateString(getMasterCell(r, 17)),
          realDolomit: parseDateString(getMasterCell(r, 78)),
          dp1: parseDateString(getMasterCell(r, 18)),
          realDp1: parseDateString(getMasterCell(r, 79)),
          dpCross: parseDateString(getMasterCell(r, 19)),
          realDpCross: parseDateString(getMasterCell(r, 80)),
          dp2: parseDateString(getMasterCell(r, 20)),
          realDp2: parseDateString(getMasterCell(r, 81)),
          belerang: parseDateString(getMasterCell(r, 21)),
          realBelerang: parseDateString(getMasterCell(r, 82)),
          kompos: parseDateString(getMasterCell(r, 22)),
          realKompos: parseDateString(getMasterCell(r, 83)),

          // Tahapan Bajak
          bajakAwalMb5Btr: parseDateString(getMasterCell(r, 25)) || rencBajak,
          realBajakAwalMb5Btr: parseDateString(getMasterCell(r, 84)) || realBajak,
          bajakAwalMb25: parseDateString(getMasterCell(r, 26)),
          realBajakAwalMb25: parseDateString(getMasterCell(r, 85)),
          bajakAwalMph: parseDateString(getMasterCell(r, 27)),
          realBajakAwalHoward: parseDateString(getMasterCell(r, 86)),
          bajakAwalNardi: parseDateString(getMasterCell(r, 28)),
          realBajakAwalNardi: parseDateString(getMasterCell(r, 87)),
          hrEksMb: parseDateString(getMasterCell(r, 29)),
          realHrEksMb: parseDateString(getMasterCell(r, 88)),
          subsoilerSs1: parseDateString(getMasterCell(r, 38)),
          realSubsoilerSs1: parseDateString(getMasterCell(r, 97)),
          subsoilerSs2: parseDateString(getMasterCell(r, 39)),
          finishingRotaryFh1: parseDateString(getMasterCell(r, 41)),
          realFinishingRotaryFh1: parseDateString(getMasterCell(r, 99)),
          finishingRotaryFh2: parseDateString(getMasterCell(r, 42)),
          realRotaryFh2: parseDateString(getMasterCell(r, 100)),
          ridger: parseDateString(getMasterCell(r, 43)),
          realRidger: parseDateString(getMasterCell(r, 101)),

          jalanSal: rencJalanSal,
          realJalanSal: realJalanSal,
          siapTanam: realSiapTanam,
          realSiapTanam: realSiapTanam,
          prosesTanam: realMulaiTanam,
          realMulaiTanam: realMulaiTanam,
          rencMulaiTanam: rencMulaiTanam,
          selesaiTanam: realSelesaiTanam,
          realSelesaiTanam: realSelesaiTanam,
          rencSelesaiTanam: rencSelesaiTanam,
        };

        const schedule = calculateLandPlanSchedule({
          rencanaChopper: aplikasiDetails.chopper || rencBkr || null,
          rencanaBero: rawRencBero,
          realChopper: aplikasiDetails.realChopper || realBkr || null,
          realMb5Btr: aplikasiDetails.realBajakAwalMb5Btr || realBajak || null,
          realSs1: aplikasiDetails.realSubsoilerSs1 || null,
          realRotaryFh1: aplikasiDetails.realFinishingRotaryFh1 || null,
          realJalanSal: aplikasiDetails.realJalanSal || realJalanSal || null,
          existingRencanaJalanSal: rencJalanSal || aplikasiDetails.jalanSal || null,
          existingRencanaRidger: aplikasiDetails.ridger || null,
          existingRencanaRotaryFh1: aplikasiDetails.finishingRotaryFh1 || null,
          existingRencanaDolomit: aplikasiDetails.dolomit || null,
          existingRencanaMb5Btr: aplikasiDetails.bajakAwalMb5Btr || rencBajak || null,
          existingRencanaSs1: aplikasiDetails.subsoilerSs1 || null,
        });

        if (!aplikasiDetails.chopperLu && schedule.rencanaChopperLu) aplikasiDetails.chopperLu = schedule.rencanaChopperLu;
        if (!aplikasiDetails.rh1 && schedule.rencanaRh1) aplikasiDetails.rh1 = schedule.rencanaRh1;
        if (!aplikasiDetails.dolomit && schedule.rencanaDolomit) aplikasiDetails.dolomit = schedule.rencanaDolomit;
        if (!aplikasiDetails.bajakAwalMb5Btr && schedule.rencanaMb5Btr) aplikasiDetails.bajakAwalMb5Btr = schedule.rencanaMb5Btr;
        if (!aplikasiDetails.subsoilerSs1 && schedule.rencanaSs1) aplikasiDetails.subsoilerSs1 = schedule.rencanaSs1;
        if (!aplikasiDetails.ridger && schedule.rencanaRidger) aplikasiDetails.ridger = schedule.rencanaRidger;
        if (!aplikasiDetails.finishingRotaryFh1 && schedule.rencanaRotaryFh1) aplikasiDetails.finishingRotaryFh1 = schedule.rencanaRotaryFh1;
        if (!aplikasiDetails.jalanSal && schedule.rencanaJalanSal) aplikasiDetails.jalanSal = schedule.rencanaJalanSal;

        const dynamicCascadeDates: Record<string, string | null> = {
          '01.CHOPPER': aplikasiDetails.chopper,
          '02.CHOPPER_LU': aplikasiDetails.chopperLu,
          '03.RH1': aplikasiDetails.rh1,
          '05.DOLOMIT': aplikasiDetails.dolomit,
          '11.BAJAK_AWAL': aplikasiDetails.bajakAwalMb5Btr,
          '17.SUBSOILER': aplikasiDetails.subsoilerSs1,
          '19.FINISHING_ROTARY': aplikasiDetails.finishingRotaryFh1,
          '21.RIDGER': aplikasiDetails.ridger,
          '22.JALAN_SAL': aplikasiDetails.jalanSal,
        };

        const activitiesData = activitiesConfig.map((act) => {
          let renc = act.rencCol !== null ? parseDateString(getMasterCell(r, act.rencCol)) : null;
          if (!renc && dynamicCascadeDates[act.code]) {
            renc = dynamicCascadeDates[act.code];
          }
          const real = act.realCol !== null ? parseDateString(getMasterCell(r, act.realCol)) : null;

          let statusAct = 'PENDING';
          if (real) {
            statusAct = 'COMPLETED';
          } else if (renc) {
            statusAct = 'IN_PROGRESS';
          }

          return {
            stepOrder: act.order,
            code: act.code,
            name: act.name,
            rencanaDate: renc,
            realisasiDate: real,
            status: statusAct,
          };
        });

        let progressTanam = 0;
        if (realSelesaiTanam) {
          progressTanam = 100;
        } else if (realMulaiTanam) {
          progressTanam = 50;
        } else if (realBajak || realBkr) {
          progressTanam = 25;
        }

        const tempLandForAktivitas = {
          progressTanam,
          realBajak,
          realMulaiTanam,
          realSelesaiTanam,
          aplikasiDetails,
          activities: activitiesData,
        };
        const computedAktivitasTerakhir = computeAktivitasTerakhir(tempLandForAktivitas);

        parsedRecords.push({
          landData: {
            lokasi,
            wilayah,
            year: cycleYear,
            luasBruto,
            luasNetto,
            status,
            eks,
            sejarah,
            phBk,
            phSn,
            rencBkr: aplikasiDetails.chopper || rencBkr,
            rencBajak: aplikasiDetails.bajakAwalMb5Btr || rencBajak,
            realBkr: aplikasiDetails.realChopper || realBkr,
            realBajak: aplikasiDetails.realBajakAwalMb5Btr || realBajak,
            aplikasiTerakhir: computedAktivitasTerakhir || 'Persiapan Bongkar',
            bulanSn,
            statusAplikasi,
            rencMulaiTanam,
            rencSelesaiTanam,
            realMulaiTanam,
            realSelesaiTanam,
            hariWaktu,
            bulanTanam,
            jenisBibit,
            kelasBibit,
            progressTanam,
            aplikasiDetails,
          },
          activitiesData,
        });
      }
    }

    if (parsedRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak ada baris data lahan valid yang dapat dibaca dari sheet "${targetSheetName}".`,
        },
        { status: 400 }
      );
    }

    // 3. JIKA TERDAPAT SHEET "Stok Lahan" RESMI DI WORKBOOK, BACA REKAPITULASINYA
    const stageStockMap = new Map<string, number>(); // key: "YYYY-M" -> stageStockSummary.id
    let hasStokLahanSheet = false;

    if (stokSheetName && wb.Sheets[stokSheetName]) {
      const wsStok = wb.Sheets[stokSheetName];
      hasStokLahanSheet = true;

      const yearBlocks = [
        { year: 2022, actStart: 6, stokStart: 11 },
        { year: 2023, actStart: 19, stokStart: 24 },
        { year: 2024, actStart: 32, stokStart: 37 },
        { year: 2025, actStart: 45, stokStart: 50 },
        { year: 2026, actStart: 58, stokStart: 63 },
      ];

      for (const block of yearBlocks) {
        const { year, actStart, stokStart } = block;

        const initBk = wsStok[xlsx.utils.encode_cell({ r: stokStart, c: 2 })]?.v || 0;
        const initBjk = wsStok[xlsx.utils.encode_cell({ r: stokStart + 1, c: 2 })]?.v || 0;
        const initSN = wsStok[xlsx.utils.encode_cell({ r: stokStart + 2, c: 2 })]?.v || 0;

        for (let mIdx = 0; mIdx < 12; mIdx++) {
          const c = 4 + mIdx;
          const monthName = MONTH_NAMES[mIdx];
          const monthYear = `${monthName}-${String(year).slice(2)}`;

          const bongkar = Number(wsStok[xlsx.utils.encode_cell({ r: actStart, c })]?.v) || 0;
          const bajak = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 1, c })]?.v) || 0;
          const sn = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 2, c })]?.v) || 0;
          const tanam = Number(wsStok[xlsx.utils.encode_cell({ r: actStart + 3, c })]?.v) || 0;

          const stokBongkar = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart, c })]?.v) || 0;
          const stokBajak = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 1, c })]?.v) || 0;
          const stokSN = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 2, c })]?.v) || 0;
          const totalStok = Number(wsStok[xlsx.utils.encode_cell({ r: stokStart + 3, c })]?.v) || (stokBongkar + stokBajak + stokSN);

          const upserted = await prisma.stageStockSummary.upsert({
            where: {
              year_monthIndex: {
                year,
                monthIndex: mIdx + 1,
              },
            },
            update: {
              month: monthName,
              monthYear,
              bongkar: Math.round(bongkar * 100) / 100,
              bajak: Math.round(bajak * 100) / 100,
              sn: Math.round(sn * 100) / 100,
              tanam: Math.round(tanam * 100) / 100,
              stokBongkar: Math.round(stokBongkar * 100) / 100,
              stokBajak: Math.round(stokBajak * 100) / 100,
              stokSN: Math.round(stokSN * 100) / 100,
              totalStok: Math.round(totalStok * 100) / 100,
              initialCarryoverBongkar: Number(initBk),
              initialCarryoverBajak: Number(initBjk),
              initialCarryoverSN: Number(initSN),
            },
            create: {
              year,
              month: monthName,
              monthIndex: mIdx + 1,
              monthYear,
              bongkar: Math.round(bongkar * 100) / 100,
              bajak: Math.round(bajak * 100) / 100,
              sn: Math.round(sn * 100) / 100,
              tanam: Math.round(tanam * 100) / 100,
              stokBongkar: Math.round(stokBongkar * 100) / 100,
              stokBajak: Math.round(stokBajak * 100) / 100,
              stokSN: Math.round(stokSN * 100) / 100,
              totalStok: Math.round(totalStok * 100) / 100,
              initialCarryoverBongkar: Number(initBk),
              initialCarryoverBajak: Number(initBjk),
              initialCarryoverSN: Number(initSN),
            },
          });

          stageStockMap.set(`${year}-${mIdx + 1}`, upserted.id);
        }
      }
    }

    // 4. EKSEKUSI REPLACE ALL SECARA ATOMIK & AMAN DALAM SATU TRANSAKSI DATABASE
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    let insertedActivitiesCount = 0;
    const insertedLandsList: Array<{
      id: number;
      lokasi: string;
      year: number;
      luasNetto: number;
      realBkr: string | null;
      realBajak: string | null;
      bulanSn: string | null;
      realMulaiTanam: string | null;
      realSelesaiTanam: string | null;
    }> = [];

    // Siapkan data StokLahanMaster (deduplikasi lokasi untuk menghindari constraint unique)
    const seenLokasi = new Set<string>();
    const stokMasterRecords: any[] = [];

    for (const item of parsedRecords) {
      const ld = item.landData;
      if (!ld.lokasi || seenLokasi.has(ld.lokasi)) continue;
      seenLokasi.add(ld.lokasi);

      const cat = getLandStokCategory({
        aplikasiTerakhir: ld.aplikasiTerakhir,
        statusAplikasi: ld.statusAplikasi,
        realMulaiTanam: ld.realMulaiTanam,
        realSelesaiTanam: ld.realSelesaiTanam,
        realJalanSal: ld.aplikasiDetails?.realJalanSal,
        progressTanam: ld.progressTanam,
        aplikasiDetails: ld.aplikasiDetails,
        activities: item.activitiesData,
      });

      stokMasterRecords.push({
        lokasi: ld.lokasi,
        wilayah: ld.wilayah,
        luasBruto: ld.luasBruto,
        luasNetto: ld.luasNetto,
        status: ld.status,
        eks: ld.eks,
        sejarah: ld.sejarah,
        phBk: ld.phBk,
        phSn: ld.phSn,
        aplikasiTerakhir: ld.aplikasiTerakhir,
        statusAplikasi: ld.statusAplikasi,
        realBajak: ld.realBajak,
        realBkr: ld.realBkr,
        realSn: ld.bulanSn,
        realMulaiTanam: ld.realMulaiTanam,
        realSelesaiTanam: ld.realSelesaiTanam,
        progressTanam: ld.progressTanam,
        category: cat,
      });
    }

    await prisma.$transaction(
      async (tx) => {
        // Bersihkan tabel turunan dan master lahan
        await tx.landStageStock.deleteMany();
        await tx.landActivity.deleteMany();
        await tx.land.deleteMany();
        await tx.stokLahanMaster.deleteMany();

        // Masukkan data master lahan baru beserta aktivitasnya
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
          const chunk = parsedRecords.slice(i, i + BATCH_SIZE);
          for (const item of chunk) {
            const created = await tx.land.create({
              data: {
                ...item.landData,
                activities: {
                  create: item.activitiesData,
                },
              },
            });
            insertedCount++;
            insertedActivitiesCount += item.activitiesData.length;
            insertedLandsList.push({
              id: created.id,
              lokasi: created.lokasi,
              year: created.year || 2026,
              luasNetto: Number(created.luasNetto) || 0,
              realBkr: created.realBkr,
              realBajak: created.realBajak,
              bulanSn: created.bulanSn,
              realMulaiTanam: created.realMulaiTanam,
              realSelesaiTanam: created.realSelesaiTanam,
            });
          }
        }

        // Masukkan data StokLahanMaster agar submenu List Stok Lahan 100% sinkron
        for (let i = 0; i < stokMasterRecords.length; i += BATCH_SIZE) {
          const chunk = stokMasterRecords.slice(i, i + BATCH_SIZE);
          await tx.stokLahanMaster.createMany({ data: chunk });
        }
      },
      {
        timeout: 120000,
      }
    );

    // 5. KALKULASI ULANG STAGE STOCK TAHAPAN (Bongkar, Bajak, SN, Rolling Carryover)
    // Jika tidak ada sheet Stok Lahan (template baru), backend menghitung rolling balance secara akurat
    const uniqueYears = Array.from(new Set(insertedLandsList.map((l) => l.year || 2026)));
    if (!uniqueYears.includes(2026)) uniqueYears.push(2026);

    if (!hasStokLahanSheet) {
      for (const yr of uniqueYears) {
        try {
          const summaries = await recalculateAndPersistStageStocks(yr);
          for (const s of summaries) {
            stageStockMap.set(`${s.year}-${s.monthIndex}`, s.id);
          }
        } catch (err) {
          console.error(`Warning: Gagal kalkulasi ulang Stage Stocks untuk tahun ${yr}:`, err);
        }
      }
    }

    // 6. HUBUNGKAN PETAK LAHAN DENGAN RELASI TAHAPAN STOK (LandStageStock)
    if (stageStockMap.size > 0 && insertedLandsList.length > 0) {
      const stageStockItems: Array<{
        landId: number;
        stageStockSummaryId: number;
        stageType: string;
        luasHa: number;
        eventDate: string | null;
        status: string;
      }> = [];

      for (const land of insertedLandsList) {
        const luas = land.luasNetto;
        if (luas <= 0) continue;

        if (land.realBkr) {
          const my = extractMonthYearIndex(land.realBkr);
          if (my) {
            const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
            if (summaryId) {
              stageStockItems.push({
                landId: land.id,
                stageStockSummaryId: summaryId,
                stageType: 'BONGKAR',
                luasHa: luas,
                eventDate: land.realBkr,
                status: 'COMPLETED',
              });
            }
          }
        }

        if (land.realBajak) {
          const my = extractMonthYearIndex(land.realBajak);
          if (my) {
            const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
            if (summaryId) {
              stageStockItems.push({
                landId: land.id,
                stageStockSummaryId: summaryId,
                stageType: 'BAJAK',
                luasHa: luas,
                eventDate: land.realBajak,
                status: 'COMPLETED',
              });
            }
          }
        }

        if (land.bulanSn) {
          const my = extractMonthYearIndex(land.bulanSn);
          if (my) {
            const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
            if (summaryId) {
              stageStockItems.push({
                landId: land.id,
                stageStockSummaryId: summaryId,
                stageType: 'SN',
                luasHa: luas,
                eventDate: land.bulanSn,
                status: 'COMPLETED',
              });
            }
          }
        }

        const tanamDate = land.realSelesaiTanam || land.realMulaiTanam;
        if (tanamDate) {
          const my = extractMonthYearIndex(tanamDate);
          if (my) {
            const summaryId = stageStockMap.get(`${my.year}-${my.monthIndex}`);
            if (summaryId) {
              stageStockItems.push({
                landId: land.id,
                stageStockSummaryId: summaryId,
                stageType: 'TANAM',
                luasHa: luas,
                eventDate: tanamDate,
                status: 'COMPLETED',
              });
            }
          }
        }
      }

      const STAGE_BATCH = 500;
      for (let i = 0; i < stageStockItems.length; i += STAGE_BATCH) {
        const chunk = stageStockItems.slice(i, i + STAGE_BATCH);
        await prisma.landStageStock.createMany({ data: chunk });
      }
    }

    // 7. SINKRONISASI REKAPITULASI BULANAN (MonthlySummary):
    let tanamRealMonthly: number[] = [];
    if (rcnSheetName && wb.Sheets[rcnSheetName]) {
      const wsRcn = wb.Sheets[rcnSheetName];
      for (let i = 0; i < 12; i++) {
        const r = 136 + i;
        const val = Number(wsRcn[xlsx.utils.encode_cell({ r, c: 56 })]?.v) || 0;
        tanamRealMonthly.push(Math.round(val * 100) / 100);
      }
    } else if (hasStokLahanSheet && wb.Sheets[stokSheetName!]) {
      const wsStok = wb.Sheets[stokSheetName!];
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const val = Number(wsStok[xlsx.utils.encode_cell({ r: 61, c: 4 + mIdx })]?.v) || 0;
        tanamRealMonthly.push(Math.round(val * 100) / 100);
      }
    }

    if (tanamRealMonthly.length === 12 && tanamRealMonthly.some((v) => v > 0)) {
      const tanamRencanaOfficial = [110.0, 40.0, 95.0, 90.0, 120.0, 170.0, 175.0, 140.0, 120.0, 130.0, 120.0, 100.0];
      await prisma.monthlySummary.deleteMany({
        where: { category: 'Tanam', year: 2026 },
      });

      let accum = 0;
      const tanamRecords = [];
      for (let i = 0; i < 12; i++) {
        const renc = tanamRencanaOfficial[i];
        const real = tanamRealMonthly[i];
        const dev = Math.round((real - renc) * 100) / 100;
        accum = Math.round((accum + real) * 100) / 100;

        tanamRecords.push({
          category: 'Tanam',
          monthYear: `${MONTH_NAMES[i]}-26`,
          monthIndex: i + 1,
          year: 2026,
          rfc: real,
          rencana: renc,
          realisasi: real,
          deviasi: dev,
          akumulasi: accum,
        });
      }
      await prisma.monthlySummary.createMany({ data: tanamRecords });
    }

    // Sinkronisasi grafik akumulasi Bongkar, Bajak, Siap Tanam dari data lahan terbaru
    for (const yr of uniqueYears) {
      try {
        await syncMonthlySummaryFromLands(yr);
      } catch (err) {
        console.error(`Warning: Gagal sinkronisasi MonthlySummary untuk tahun ${yr}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil me-replace seluruh data lahan (${isTemplateMode ? 'Format Template Resmi' : 'Format Master Legacy'}). Total ${insertedCount} petak lahan, ${insertedActivitiesCount} aktivitas, dan rekapitulasi stok berhasil diperbarui otomatis.`,
      count: insertedCount,
      activitiesCount: insertedActivitiesCount,
      mode: isTemplateMode ? 'template' : 'legacy',
      sheetName: targetSheetName,
      hasStokLahanSheet,
      hasRcnSheet: Boolean(rcnSheetName),
    });
  } catch (error: any) {
    console.error('Error uploading and replacing land excel:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem saat memproses file Excel',
      },
      { status: 500 }
    );
  }
}
