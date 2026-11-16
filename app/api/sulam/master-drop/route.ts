import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function cleanNum(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : Math.round(val);
  const s = String(val).trim().replace(/,/g, '');
  const n = Number(s);
  return isNaN(n) ? 0 : Math.round(n);
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

// GET: Ambil master data drop bibit sulam (dengan kolom tanggal order)
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
        { spekBB: { contains: search, mode: 'insensitive' } },
        { jenisUnit: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL' && wilayah !== 'Semua Wilayah') {
      const wilList = wilayah.split(',').map((w) => w.trim().toUpperCase());
      where.wilayah = { in: wilList };
    }

    const [total, data] = await Promise.all([
      prisma.masterDataDropBibitSulam.count({ where }),
      prisma.masterDataDropBibitSulam.findMany({
        where,
        orderBy: [{ tanggalDrop: 'desc' }, { id: 'desc' }],
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
    console.error('Error in GET /api/sulam/master-drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data drop bibit sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel Drop Bibit
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
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('drop')) || wb.SheetNames[0];
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

    let headerRowIdx = 0;
    let cLokasi = -1, cWilayah = -1, cTglDrop = -1, cTglOrder = -1, cHa = -1, cBtg = -1, cSpek = -1, cStdRit = -1, cJmlRit = -1, cUnit = -1, cStatus = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str === 'lokasi' || str === 'petak') { cLokasi = c; headerRowIdx = r; }
        else if (str === 'wilayah' || str === 'wil') cWilayah = c;
        else if (str.includes('order') && (str.includes('tgl') || str.includes('tanggal'))) cTglOrder = c;
        else if ((str.includes('drop') || str.includes('real')) && (str.includes('tgl') || str.includes('tanggal') || str.includes('date'))) cTglDrop = c;
        else if (str === 'tgl' || str === 'tanggal') { if (cTglDrop === -1) cTglDrop = c; }
        else if (str.includes('ha') || str.includes('luas')) cHa = c;
        else if (str.includes('btg') || str.includes('batang')) cBtg = c;
        else if (str.includes('spek') || str.includes('bibit')) cSpek = c;
        else if (str.includes('std rit') || str.includes('std')) cStdRit = c;
        else if (str.includes('jml') || str.includes('jumlah rit') || str === 'rit') cJmlRit = c;
        else if (str.includes('unit') || str.includes('kendaraan')) cUnit = c;
        else if (str.includes('sts') || str.includes('status')) cStatus = c;
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
      const tglDrop = cTglDrop !== -1 ? parseExcelDate(row[cTglDrop]) : new Date();
      const tglOrder = cTglOrder !== -1 ? parseExcelDate(row[cTglOrder]) : null;
      const hasilHa = cHa !== -1 && row[cHa] ? parseFloat(row[cHa]) || null : null;
      const hasilBtg = cBtg !== -1 ? cleanNum(row[cBtg]) : 0;
      const spek = cSpek !== -1 && row[cSpek] ? String(row[cSpek]).trim() : null;
      const stdRit = cStdRit !== -1 ? cleanNum(row[cStdRit]) : null;
      const jmlRit = cJmlRit !== -1 ? cleanNum(row[cJmlRit]) : 0;
      const jenisUnit = cUnit !== -1 && row[cUnit] ? String(row[cUnit]).trim() : 'CD';
      const statusDrop = cStatus !== -1 && row[cStatus] ? String(row[cStatus]).trim() : 'V';

      records.push({
        lokasi: lok,
        wilayah: wil,
        tanggalDrop: tglDrop,
        tanggalOrder: tglOrder,
        hasilHa,
        hasilBtg,
        spekBB: spek,
        stdRit,
        jumlahRit: jmlRit,
        jenisUnit,
        statusDrop,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data drop bibit yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.masterDataDropBibitSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.masterDataDropBibitSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.masterDataDropBibitSulam.create({ data: rec });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data master drop bibit sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-drop:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data drop bibit sulam.' },
      { status: 500 }
    );
  }
}

