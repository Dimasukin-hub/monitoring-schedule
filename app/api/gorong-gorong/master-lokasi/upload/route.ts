import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';

export const dynamic = 'force-dynamic';

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed || trimmed === '-' || trimmed === '0') return null;
    if (trimmed.includes('/')) {
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const res = new Date(y, m, d);
        return isNaN(res.getTime()) ? null : res;
      }
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function cleanNum(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const s = String(val).trim().replace(/,/g, '');
  if (!s || s === '-' || s === '#N/A' || s === '#VALUE!') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function cleanStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (!s || s === '-' || s === '#N/A' || s === '#VALUE!' || s === '#REF!') return null;
  return s;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';
    const isPartial = mode === 'partial';

    if (!file) {
      return NextResponse.json({ success: false, message: 'Berkas Excel wajib diunggah!' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = wb.SheetNames;
    if (!sheetNames || sheetNames.length === 0) {
      return NextResponse.json({ success: false, message: 'Berkas Excel tidak memuat lembar kerja!' }, { status: 400 });
    }

    // Cari sheet Status Lokasi
    const sheetName =
      sheetNames.find((s) => s.toLowerCase().includes('status') || s.toLowerCase().includes('lokasi')) ||
      sheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      return NextResponse.json({ success: false, message: 'Lembar kerja kosong!' }, { status: 400 });
    }

    const range = XLSX.utils.decode_range(ws['!ref']);

    // Deteksi baris header
    let headerRow = -1;
    let colMap: Record<string, number> = {};

    for (let r = range.s.r; r <= Math.min(range.s.r + 10, range.e.r); r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = ws[XLSX.utils.encode_cell({ r, c })];
        if (!cell || cell.v == null) continue;
        const text = String(cell.v).trim().toLowerCase();
        if (text === 'lokasi' || text === 'petak') {
          headerRow = r;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow === -1) {
      // Fallback jika format PG1 lama tanpa header tepat
      headerRow = 0;
    }

    // Mapping kolom header
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (!cell || cell.v == null) continue;
      const text = String(cell.v).trim().toLowerCase();

      if (text === 'lokasi' || text === 'petak') colMap.lokasi = c;
      else if (text === 'wilayah' || text === 'struc plant' || text === 'strucplant' || text === 'wil') colMap.strucPlant = c;
      else if (text === 'status lengkap' || text === 'statuslengkap') colMap.statusLengkap = c;
      else if (text === 'status' || text === 'status tanaman') colMap.status = c;
      else if (text.includes('bruto')) colMap.luasBruto = c;
      else if (text.includes('aktif')) colMap.luasAktif = c;
      else if (text.includes('netto')) colMap.luasNetto = c;
      else if (text === 'bibit') colMap.bibit = c;
      else if (text === 'kelas') colMap.kelas = c;
      else if (text === 'jenis') colMap.jenis = c;
      else if (text.includes('perubahan')) colMap.perubahanSts = c;
      else if (text.includes('rawat') && text.includes('tgl')) colMap.tglRawat = c;
      else if (text.includes('umur') && text.includes('bln')) colMap.umurBulan = c;
      else if (text.includes('forcing std') || text.includes('forcing standar')) colMap.forcingStd = c;
      else if (text.includes('forcing') && text.includes('2026')) colMap.forcingProd2026 = c;
      else if (text.includes('forcing') && text.includes('2027')) colMap.forcing2027 = c;
      else if (text.includes('ket') && text.includes('forcing')) colMap.ketForcing2027 = c;
      else if (text.includes('fix forcing')) colMap.fixForcing = c;
      else if (text.includes('f std')) colMap.umurFStd = c;
      else if (text.includes('f prod')) colMap.umurFProd = c;
    }

    // Fallback jika format PG1 kolom fixed (B=lokasi, C=wilayah, D=statusLengkap, E=bruto, F=aktif, G=netto, H=bibit, etc.)
    if (colMap.lokasi === undefined) {
      colMap = {
        lokasi: 1,
        strucPlant: 2,
        statusLengkap: 3,
        luasBruto: 4,
        luasAktif: 5,
        luasNetto: 6,
        bibit: 7,
        perubahanSts: 8,
        tglRawat: 9,
        umurBulan: 23,
      };
    }

    let startRow = headerRow + 1;
    // Lewati baris nomor urut kolom jika ada (1, 2, 3...)
    if (startRow <= range.e.r) {
      const checkCell = ws[XLSX.utils.encode_cell({ r: startRow, c: colMap.lokasi })];
      const val = checkCell && checkCell.v != null ? String(checkCell.v).trim() : '';
      if (val === '1' || val === '2') {
        startRow++;
      }
    }

    const getVal = (r: number, col?: number) => {
      if (col === undefined || col < 0) return null;
      const cell = ws[XLSX.utils.encode_cell({ r, c: col })];
      return cell && cell.v != null ? cell.v : null;
    };

    const parsedRecords: any[] = [];
    const seenLokasi = new Set<string>();

    for (let r = startRow; r <= range.e.r; r++) {
      const rawLok = getVal(r, colMap.lokasi);
      if (!rawLok) continue;
      const lokasi = String(rawLok).trim().toUpperCase();
      if (!lokasi || /^\d+$/.test(lokasi) || lokasi === 'LOKASI' || lokasi.startsWith('TOTAL')) continue;
      if (seenLokasi.has(lokasi)) continue;
      seenLokasi.add(lokasi);

      const strucPlant = cleanStr(getVal(r, colMap.strucPlant));
      const statusLengkap = cleanStr(getVal(r, colMap.statusLengkap));
      const status = cleanStr(getVal(r, colMap.status)) || (statusLengkap ? statusLengkap.slice(0, 4) : null);
      const luasBruto = cleanNum(getVal(r, colMap.luasBruto));
      const luasAktif = cleanNum(getVal(r, colMap.luasAktif));
      const luasNetto = cleanNum(getVal(r, colMap.luasNetto));
      const bibit = cleanStr(getVal(r, colMap.bibit));
      const kelas = cleanStr(getVal(r, colMap.kelas));
      const jenis = cleanStr(getVal(r, colMap.jenis));
      const perubahanSts = cleanStr(getVal(r, colMap.perubahanSts));
      const tglRawat = parseExcelDate(getVal(r, colMap.tglRawat));
      const umurBulan = cleanNum(getVal(r, colMap.umurBulan));
      const forcingStd = parseExcelDate(getVal(r, colMap.forcingStd));
      const forcingProd2026 = parseExcelDate(getVal(r, colMap.forcingProd2026));
      const forcing2027 = parseExcelDate(getVal(r, colMap.forcing2027));
      const ketForcing2027 = cleanStr(getVal(r, colMap.ketForcing2027));
      const fixForcing = parseExcelDate(getVal(r, colMap.fixForcing)) || forcingProd2026 || forcingStd;
      const umurFStd = cleanNum(getVal(r, colMap.umurFStd));
      const umurFProd = cleanNum(getVal(r, colMap.umurFProd));

      parsedRecords.push({
        lokasi,
        strucPlant,
        statusLengkap,
        status,
        luasBruto,
        luasAktif,
        luasNetto,
        bibit,
        kelas,
        jenis,
        perubahanSts,
        tglRawat,
        umurBulan: umurBulan != null ? Math.round(umurBulan) : null,
        umurRawat: umurBulan != null ? Math.round(umurBulan) : null,
        forcingStd,
        forcingProd2026,
        forcing2027,
        ketForcing2027,
        fixForcing,
        umurFStd: umurFStd != null ? Math.round(umurFStd) : null,
        umurFProd: umurFProd != null ? Math.round(umurFProd) : null,
      });
    }

    if (parsedRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data lokasi valid yang terbaca dari berkas Excel!' },
        { status: 400 }
      );
    }

    if (!isPartial) {
      // REPLACE ALL: Hapus seluruh data lama dan simpan ulang secara batch
      await prisma.masterStatusLokasi.deleteMany({});
      for (let i = 0; i < parsedRecords.length; i += 200) {
        const chunk = parsedRecords.slice(i, i + 200);
        await prisma.masterStatusLokasi.createMany({ data: chunk, skipDuplicates: true });
      }
    } else {
      // REPLACE PARSIAL: Upsert per lokasi
      for (const rec of parsedRecords) {
        const { lokasi, ...rest } = rec;
        await prisma.masterStatusLokasi.upsert({
          where: { lokasi },
          update: rest,
          create: rec,
        });
      }
    }

    const currentTotal = await prisma.masterStatusLokasi.count();

    // Sinkronisasi otomatis tabel database lokasiordergoronggorong agar wilayah, luas, status, umur bulan langsung ter-update
    try {
      await syncLokasiOrderDatabase();
    } catch (syncErr) {
      console.warn('Warning syncing lokasi order after master status upload:', syncErr);
    }

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Tambah Data Berhasil: ${parsedRecords.length} data lokasi berhasil ditambahkan. Total data master: ${currentTotal} lokasi.`
        : `Replace All Berhasil: Seluruh data lama telah digantikan dengan ${parsedRecords.length} lokasi baru dari Excel. Total data master: ${currentTotal} lokasi.`,
      data: {
        processedCount: parsedRecords.length,
        totalCount: currentTotal,
        mode: isPartial ? 'partial' : 'full_replace',
      },
    });
  } catch (error: any) {
    console.error('Error uploading master status lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah data master status lokasi: ' + error.message },
      { status: 500 }
    );
  }
}

