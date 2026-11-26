import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';
import {
  verifyAdminSession,
  parseRecordId,
  toIntOrNull,
  toFloatOrNull,
  toTrimmedOrNull,
} from '@/lib/masterDataApiHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const wilayah = searchParams.get('wilayah');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { dsmbkPlot: { contains: search, mode: 'insensitive' } },
        { dsmPlot: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.wilayah = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        where.OR = wList.map((w) => ({ wilayah: { contains: w, mode: 'insensitive' } }));
      }
    }

    const [total, records] = await Promise.all([
      prisma.masterWaterlogging.count({ where }),
      prisma.masterWaterlogging.findMany({
        where,
        orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }],
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
    console.error('Error fetching master waterlogging data:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data master waterlogging', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = verifyAdminSession(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const id = parseRecordId(request, body);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID data tidak valid' }, { status: 400 });
    }

    const lokasi = toTrimmedOrNull(body.lokasi, true);
    if (!lokasi) {
      return NextResponse.json({ success: false, message: 'Lokasi wajib diisi' }, { status: 400 });
    }

    const updated = await prisma.masterWaterlogging.update({
      where: { id },
      data: {
        pg: toTrimmedOrNull(body.pg, true) || 'PG1',
        wilayah: toTrimmedOrNull(body.wilayah, true),
        lokasi,
        luasHa: toFloatOrNull(body.luasHa),
        komoditas: toTrimmedOrNull(body.komoditas),
        bulanDsmBk: toTrimmedOrNull(body.bulanDsmBk),
        tahunDsmBk: toIntOrNull(body.tahunDsmBk),
        dsmbkPlot: toTrimmedOrNull(body.dsmbkPlot),
        dryBk: toTrimmedOrNull(body.dryBk),
        bulanDsmSt: toTrimmedOrNull(body.bulanDsmSt),
        tahunDsmSt: toIntOrNull(body.tahunDsmSt),
        dsmPlot: toTrimmedOrNull(body.dsmPlot),
        drySt: toTrimmedOrNull(body.drySt),
      },
    });

    await syncLokasiOrderDatabase().catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Data master waterlogging ${updated.lokasi} berhasil diperbarui`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating master waterlogging:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal memperbarui data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = verifyAdminSession(request);
  if (!auth.authorized) return auth.response!;

  try {
    let body: any = null;
    try {
      body = await request.json();
    } catch {}
    const id = parseRecordId(request, body);
    if (!id) {
      return NextResponse.json({ success: false, message: 'ID data tidak valid' }, { status: 400 });
    }

    await prisma.masterWaterlogging.delete({
      where: { id },
    });

    await syncLokasiOrderDatabase().catch(() => {});

    return NextResponse.json({ success: true, message: 'Data master waterlogging berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting master waterlogging:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}
