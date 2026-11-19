import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const s = String(val).trim().replace(/,/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// GET: Ambil data master order sulam (11 kolom)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spekBibit: { contains: search, mode: 'insensitive' } },
        { keteranganProses: { contains: search, mode: 'insensitive' } },
        { keteranganMati: { contains: search, mode: 'insensitive' } },
        { keteranganRitase: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      where.wilayah = { in: wilList };
    }

    const yearParam = searchParams.get('year');
    const startMonthParam = searchParams.get('startMonth');
    const endMonthParam = searchParams.get('endMonth');
    if (yearParam !== null && startMonthParam !== null && endMonthParam !== null) {
      const year = parseInt(yearParam, 10);
      const startMonth = parseInt(startMonthParam, 10);
      const endMonth = parseInt(endMonthParam, 10);
      if (!isNaN(year) && !isNaN(startMonth) && !isNaN(endMonth)) {
        const minM = Math.min(startMonth, endMonth);
        const maxM = Math.max(startMonth, endMonth);
        const startDate = new Date(Date.UTC(year, minM, 1, 0, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, maxM + 1, 0, 23, 59, 59, 999));
        where.tanggalOrder = { gte: startDate, lte: endDate };
      }
    }

    const [total, data] = await Promise.all([
      prisma.masterDataOrderSulam.count({ where }),
      prisma.masterDataOrderSulam.findMany({
        where,
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/master-order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data order sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel (Replace All / Tambah Data) 11 Kolom
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Berkas Excel wajib diunggah!' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('order') || s.toLowerCase().includes('sulam')) || wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    if (!ws || !ws['!ref']) {
      return NextResponse.json(
        { success: false, message: 'Lembar kerja Excel kosong!' },
        { status: 400 }
      );
    }

    const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (rows.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Format data Excel tidak valid atau kosong.' },
        { status: 400 }
      );
    }

    // Deteksi header baris untuk 11 kolom
    let headerRowIdx = 0;
    let cLokasi = -1;
    let cWilayah = -1;
    let cTglOrder = -1;
    let cJumlah = -1;
    let cRit = -1;
    let cRealRit = -1;
    let cSpek = -1;
    let cManual = -1;
    let cKetProses = -1;
    let cKetMati = -1;
    let cKetRitase = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str === 'lokasi' || str === 'petak') { cLokasi = c; headerRowIdx = r; }
        else if (str === 'wilayah' || str === 'wil') cWilayah = c;
        else if (str.includes('order') && (str.includes('tgl') || str.includes('tanggal') || str.includes('date'))) cTglOrder = c;
        else if (str === 'tanggal' || str === 'tgl' || str === 'tanggal order') { if (cTglOrder === -1) cTglOrder = c; }
        else if (str.includes('jumlah') || str === 'jml' || str.includes('batang') || str.includes('btg')) cJumlah = c;
        else if (str.includes('real rit') || str.includes('real_rit')) cRealRit = c;
        else if (str === 'rit' || str.includes('permintaan rit')) { if (cRit === -1) cRit = c; }
        else if (str.includes('spek') || str.includes('bibit')) cSpek = c;
        else if (str === 'manual') cManual = c;
        else if (str.includes('ket') && str.includes('proses')) cKetProses = c;
        else if (str.includes('ket') && str.includes('mati')) cKetMati = c;
        else if (str.includes('ket') && str.includes('ritase')) cKetRitase = c;
        else if (str === 'keterangan' || str === 'ket') { if (cKetProses === -1) cKetProses = c; }
      }
      if (cLokasi !== -1) break;
    }

    if (cLokasi === -1) cLokasi = 0;

    const records: any[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[cLokasi]) continue;
      const lok = String(row[cLokasi]).trim().toUpperCase();
      if (!lok || lok === 'TOTAL' || lok.startsWith('TOTAL')) continue;

      const wil = cWilayah !== -1 && row[cWilayah] ? String(row[cWilayah]).trim().toUpperCase() : null;
      const tgl = cTglOrder !== -1 ? parseExcelDate(row[cTglOrder]) : null;
      const jml = cJumlah !== -1 ? Math.round(cleanNum(row[cJumlah])) : 0;
      const rit = cRit !== -1 ? cleanNum(row[cRit]) : 0;
      const realRit = cRealRit !== -1 ? cleanNum(row[cRealRit]) : 0;
      const spek = cSpek !== -1 && row[cSpek] ? String(row[cSpek]).trim() : null;
      const manual = cManual !== -1 ? cleanNum(row[cManual]) : 0;
      const ketProses = cKetProses !== -1 && row[cKetProses] ? String(row[cKetProses]).trim() : null;
      const ketMati = cKetMati !== -1 && row[cKetMati] ? String(row[cKetMati]).trim() : null;
      const ketRitase = cKetRitase !== -1 && row[cKetRitase] ? String(row[cKetRitase]).trim() : null;

      records.push({
        lokasi: lok,
        wilayah: wil,
        tanggalOrder: tgl,
        jumlah: jml,
        rit,
        realRit,
        spekBibit: spek,
        manual,
        keteranganProses: ketProses,
        keteranganMati: ketMati,
        keteranganRitase: ketRitase,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data order sulam yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.masterDataOrderSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.masterDataOrderSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.masterDataOrderSulam.create({ data: rec });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data master order sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data master order sulam.' },
      { status: 500 }
    );
  }
}
