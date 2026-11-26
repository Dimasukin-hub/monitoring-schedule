import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function DELETE(request: NextRequest) {
  try {
    let id: number | null = null;
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    if (queryId) {
      id = parseInt(queryId, 10);
    } else {
      try {
        const body = await request.json();
        if (body && body.id) id = parseInt(body.id, 10);
      } catch (e) {}
    }

    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, message: 'ID data tidak valid' }, { status: 400 });
    }

    await prisma.masterWaterlogging.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Data master waterlogging berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting master waterlogging:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}
