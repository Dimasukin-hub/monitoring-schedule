import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function parseDateCell(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel serial number
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (s.includes('/')) {
      const parts = s.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        const date = new Date(Date.UTC(y, m, d));
        if (!isNaN(date.getTime())) return date;
      }
    }
    if (s.includes('-')) {
      const parts = s.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const date = new Date(s);
          if (!isNaN(date.getTime())) return date;
        } else {
          const d = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const y = parseInt(parts[2], 10);
          const date = new Date(Date.UTC(y, m, d));
          if (!isNaN(date.getTime())) return date;
        }
      }
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
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

    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, message: 'Sheet Excel kosong!' }, { status: 400 });
    }

    const ws = wb.Sheets[sheetName];
    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    if (rawData.length < 2) {
      return NextResponse.json({ success: false, message: 'Data dalam Excel kosong!' }, { status: 400 });
    }

    // Cari header row
    let headerRowIdx = -1;
    let colLokasi = -1;
    let colWilayah = -1;
    let colTanggal = -1;
    let colD40 = -1;
    let colD60 = -1;
    let colD80 = -1;
    let colD100 = -1;

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
      const row = rawData[r] || [];
      for (let c = 0; c < row.length; c++) {
        const text = String(row[c] || '').toLowerCase().trim();
        if (text === 'lokasi' || text === 'lokasi petak') colLokasi = c;
        if (text === 'wilayah' || text === 'strucplant') colWilayah = c;
        if (text.includes('tanggal') || text.includes('tgl')) colTanggal = c;
        if (text.includes('40')) colD40 = c;
        if (text.includes('60')) colD60 = c;
        if (text.includes('80')) colD80 = c;
        if (text.includes('100')) colD100 = c;
      }
      if (colLokasi !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    if (colLokasi === -1) {
      return NextResponse.json({
        success: false,
        message: 'Kolom "Lokasi" tidak ditemukan dalam Excel. Pastikan terdapat kolom Lokasi.',
      }, { status: 400 });
    }

    // Ambil master data status lokasi untuk lookup wilayah jika kolom wilayah kosong
    const masterLokasi = await prisma.masterStatusLokasi.findMany({
      select: { lokasi: true, strucPlant: true },
    });
    const wilMap = new Map<string, string>();
    masterLokasi.forEach((m) => {
      if (m.lokasi) wilMap.set(m.lokasi.trim().toUpperCase(), m.strucPlant || 'AW01');
    });

    const rowsToInsert: any[] = [];
    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;

      const lokRaw = row[colLokasi];
      if (!lokRaw) continue;
      const lokasi = String(lokRaw).trim().toUpperCase();
      if (!lokasi || lokasi === 'TOTAL' || lokasi === 'JUMLAH') continue;

      let wilayah = colWilayah !== -1 && row[colWilayah] ? String(row[colWilayah]).trim().toUpperCase() : '';
      if (!wilayah) {
        wilayah = wilMap.get(lokasi) || 'AW01';
      }

      const tglRaw = colTanggal !== -1 ? row[colTanggal] : null;
      const tanggal = parseDateCell(tglRaw) || new Date();

      const d40 = colD40 !== -1 ? parseInt(String(row[colD40] || '0').replace(/[^0-9]/g, '') || '0', 10) : 0;
      const d60 = colD60 !== -1 ? parseInt(String(row[colD60] || '0').replace(/[^0-9]/g, '') || '0', 10) : 0;
      const d80 = colD80 !== -1 ? parseInt(String(row[colD80] || '0').replace(/[^0-9]/g, '') || '0', 10) : 0;
      const d100 = colD100 !== -1 ? parseInt(String(row[colD100] || '0').replace(/[^0-9]/g, '') || '0', 10) : 0;

      rowsToInsert.push({
        lokasi,
        wilayah,
        tanggalPasangManual: tanggal,
        diameter40: d40,
        diameter60: d60,
        diameter80: d80,
        diameter100: d100,
      });
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada baris data valid ditemukan untuk diimpor.',
      }, { status: 400 });
    }

    if (!isPartial) {
      // Full Replace: Hapus semua data lama di MasterDataPasangManual
      await prisma.masterDataPasangManual.deleteMany({});
    }

    // Insert batch
    const batchSize = 500;
    for (let i = 0; i < rowsToInsert.length; i += batchSize) {
      const batch = rowsToInsert.slice(i, i + batchSize);
      await prisma.masterDataPasangManual.createMany({
        data: batch,
      });
    }

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Berhasil menambahkan ${rowsToInsert.length} data baru Master Data Pasang Manual!`
        : `Berhasil me-replace total ${rowsToInsert.length} data Master Data Pasang Manual di database!`,
      count: rowsToInsert.length,
    });
  } catch (error: any) {
    console.error('Error uploading master data pasang manual:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengunggah Master Data Pasang Manual: ' + error.message },
      { status: 500 }
    );
  }
}

