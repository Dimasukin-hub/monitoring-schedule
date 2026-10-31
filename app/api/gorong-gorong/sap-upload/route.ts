import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

function parseExcelDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

function detectDiameter(text: any): number {
  if (!text) return 40;
  const str = String(text);
  if (str.includes('100')) return 100;
  if (str.includes('80')) return 80;
  if (str.includes('60')) return 60;
  return 40;
}

// GET: Ambil daftar data riwayat upload realisasi SAP (19 Kolom)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const diameter = searchParams.get('diameter');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spkId: { contains: search, mode: 'insensitive' } },
        { pasDocument: { contains: search, mode: 'insensitive' } },
        { penanggungJawab: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (diameter && diameter !== 'ALL') {
      const dList = diameter.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n));
      if (dList.length === 1) {
        where.diameter = dList[0];
      } else if (dList.length > 1) {
        where.diameter = { in: dList };
      }
    }

    const [total, records] = await Promise.all([
      prisma.masterSapGorongGorong.count({ where }),
      prisma.masterSapGorongGorong.findMany({
        where,
        orderBy: { tanggalRealisasi: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        records,
      },
    });
  } catch (error: any) {
    console.error('Error fetching SAP records:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data realisasi SAP', error: error.message },
      { status: 500 }
    );
  }
}

// POST: Upload file Excel Form 630 SAP (19 Kolom)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const uploadedBy = (formData.get('uploadedBy') as string) || 'admin';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File Excel (.xlsx) wajib diunggah.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];

    if (!ws) {
      return NextResponse.json(
        { success: false, message: 'Sheet Excel tidak ditemukan.' },
        { status: 400 }
      );
    }

    // Ekstraksi seluruh 19 kolom
    const sapList: any[] = [];
    let countD40 = 0;
    let countD60 = 0;
    let countD80 = 0;
    let countD100 = 0;
    let totalBiayaSum = 0;

    for (let r = 2; r <= 5000; r++) {
      const cellA = ws['A' + r];
      const cellS = ws['S' + r];
      const lokasi = cellA && cellA.v ? String(cellA.v).trim().toUpperCase() : (cellS && cellS.v ? String(cellS.v).trim().toUpperCase() : null);
      if (!lokasi) continue;

      const wilayahSap = ws['B' + r] ? String(ws['B' + r].v).trim() : null;
      const plantCostCenter = ws['C' + r] ? String(ws['C' + r].v).trim() : null;
      const statusTanaman = ws['D' + r] ? String(ws['D' + r].v).trim() : null;
      const spkId = ws['E' + r] ? String(ws['E' + r].v).trim() : null;
      const pasDocument = ws['F' + r] ? String(ws['F' + r].v).trim() : null;
      const tanggalRealisasi = parseExcelDate(ws['G' + r] ? ws['G' + r].v : null);
      const deskripsiKegiatan = ws['H' + r] ? String(ws['H' + r].v).trim() : null;
      const deskripsiBahan = ws['I' + r] ? String(ws['I' + r].v).trim() : '';
      const jenisData = ws['J' + r] ? String(ws['J' + r].v).trim() : null;
      const kodeBahan = ws['K' + r] ? String(ws['K' + r].v).trim() : null;
      const qty = ws['L' + r] ? Math.round(Number(ws['L' + r].v)) : 0;
      const hasilEfektif = ws['M' + r] ? Number(ws['M' + r].v) : null;
      const totalBiaya = ws['N' + r] ? Number(ws['N' + r].v) : null;
      const penanggungJawab = ws['O' + r] ? String(ws['O' + r].v).trim() : null;
      const waktuPelaksanaan = ws['P' + r] ? Number(ws['P' + r].v) : null;
      const air = ws['Q' + r] ? Number(ws['Q' + r].v) : 0;
      const jumlahAir = ws['R' + r] ? Number(ws['R' + r].v) : 0;
      const referensiLokasi = cellS && cellS.v ? String(cellS.v).trim() : lokasi;
      const diameter = detectDiameter(deskripsiBahan);

      if (diameter === 40) countD40 += qty;
      else if (diameter === 60) countD60 += qty;
      else if (diameter === 80) countD80 += qty;
      else if (diameter === 100) countD100 += qty;

      if (totalBiaya) totalBiayaSum += totalBiaya;

      sapList.push({
        lokasi,
        wilayahSap,
        plantCostCenter,
        statusTanaman,
        spkId,
        pasDocument,
        tanggalRealisasi,
        deskripsiKegiatan,
        deskripsiBahan,
        jenisData,
        kodeBahan,
        qty,
        hasilEfektif,
        totalBiaya,
        penanggungJawab,
        waktuPelaksanaan,
        air,
        jumlahAir,
        referensiLokasi,
        diameter,
        fileName: file.name,
        uploadedBy,
      });
    }

    if (sapList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data valid yang terbaca dari file Excel tersebut.' },
        { status: 400 }
      );
    }

    // Insert batch ke database
    for (let i = 0; i < sapList.length; i += 200) {
      const chunk = sapList.slice(i, i + 200);
      await prisma.masterSapGorongGorong.createMany({ data: chunk });
    }

    return NextResponse.json({
      success: true,
      message: `Upload Berhasil: ${sapList.length} baris realisasi SAP Form 630 berhasil diproses!`,
      summary: {
        totalBaris: sapList.length,
        totalQty: countD40 + countD60 + countD80 + countD100,
        qtyD40: countD40,
        qtyD60: countD60,
        qtyD80: countD80,
        qtyD100: countD100,
        totalBiaya: totalBiayaSum,
      },
    });
  } catch (error: any) {
    console.error('Error uploading SAP Form 630:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses file upload SAP', error: error.message },
      { status: 500 }
    );
  }
}
