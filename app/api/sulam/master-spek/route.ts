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

// GET: Ambil master data Spek Bibit Sulam (5 kolom)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { spekBBSulamBtg: { contains: search, mode: 'insensitive' } },
        { spesifikasi: { contains: search, mode: 'insensitive' } },
        { keterangan: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      prisma.masterSpekBibitSulam.count({ where }),
      prisma.masterSpekBibitSulam.findMany({
        where,
        orderBy: [{ spekBBSulamBtg: 'asc' }],
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
    console.error('Error in GET /api/sulam/master-spek:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data spek bibit sulam.' },
      { status: 500 }
    );
  }
}

// POST: Upload Excel Spek Bibit Sulam (Replace All / Tambah Data)
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
    const sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('spek') || s.toLowerCase().includes('bibit')) || wb.SheetNames[0];
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
    let cSpek = -1, cCd = -1, cFuso = -1, cSpesifikasi = -1, cKet = -1;

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < row.length; c++) {
        const str = String(row[c] || '').toLowerCase().trim();
        if (str.includes('spek') || str.includes('bibit')) { cSpek = c; headerRowIdx = r; }
        else if (str === 'cd' || str.includes('std rit cd') || str.includes('std cd')) cCd = c;
        else if (str === 'fuso' || str.includes('std rit fuso') || str.includes('std fuso')) cFuso = c;
        else if (str.includes('spesifikasi') || str.includes('spek detail')) cSpesifikasi = c;
        else if (str.includes('ket') || str.includes('keterangan')) cKet = c;
      }
      if (cSpek !== -1) break;
    }

    if (cSpek === -1) cSpek = 0;

    const records: any[] = [];
    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[cSpek]) continue;
      const spek = String(row[cSpek]).trim();
      if (!spek || spek === 'TOTAL' || spek.startsWith('TOTAL')) continue;

      const cd = cCd !== -1 ? cleanNum(row[cCd]) : 0;
      const fuso = cFuso !== -1 ? cleanNum(row[cFuso]) : 0;
      const spesifikasi = cSpesifikasi !== -1 && row[cSpesifikasi] ? String(row[cSpesifikasi]).trim() : null;
      const ket = cKet !== -1 && row[cKet] ? String(row[cKet]).trim() : null;

      records.push({
        spekBBSulamBtg: spek,
        cd,
        fuso,
        spesifikasi,
        keterangan: ket,
      });
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data spek bibit yang valid untuk diimpor.' },
        { status: 400 }
      );
    }

    if (mode === 'full_replace') {
      await prisma.masterSpekBibitSulam.deleteMany({});
      for (let i = 0; i < records.length; i += 200) {
        await prisma.masterSpekBibitSulam.createMany({ data: records.slice(i, i + 200) });
      }
    } else {
      for (const rec of records) {
        await prisma.masterSpekBibitSulam.upsert({
          where: { spekBBSulamBtg: rec.spekBBSulamBtg },
          update: rec,
          create: rec,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengunggah ${records.length} data master spek bibit sulam (${mode === 'full_replace' ? 'Replace All' : 'Tambah Data'}).`,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/master-spek:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses unggahan data master spek bibit sulam.' },
      { status: 500 }
    );
  }
}
