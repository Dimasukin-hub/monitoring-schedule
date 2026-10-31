import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const singleLokasi = searchParams.get('lokasi')?.trim();
    if (singleLokasi) {
      const record = await prisma.masterStatusLokasi.findUnique({
        where: { lokasi: singleLokasi },
      });
      return NextResponse.json({ success: true, data: record });
    }

    const search = searchParams.get('search')?.trim().toUpperCase();
    const wilayah = searchParams.get('wilayah');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const all = searchParams.get('all') === 'true'; // Jika all=true, kembalikan seluruh lokasi (untuk dropdown)

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { bibit: { contains: search, mode: 'insensitive' } },
        { statusLengkap: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.wil = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        where.OR = wList.map((w) => ({ wil: { contains: w, mode: 'insensitive' } }));
      }
    }
    if (status && status !== 'ALL') {
      const sList = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (sList.length === 1) {
        where.status = sList[0];
      } else if (sList.length > 1) {
        where.status = { in: sList };
      }
    }

    if (all) {
      const records = await prisma.masterStatusLokasi.findMany({
        where,
        select: {
          id: true,
          lokasi: true,
          wil: true,
          status: true,
          statusLengkap: true,
          luasNetto: true,
          umurBulan: true,
        },
        orderBy: { lokasi: 'asc' },
      });
      return NextResponse.json({ success: true, data: records });
    }

    const [total, records] = await Promise.all([
      prisma.masterStatusLokasi.count({ where }),
      prisma.masterStatusLokasi.findMany({
        where,
        orderBy: { lokasi: 'asc' },
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
    console.error('Error fetching master status lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data master status lokasi', error: error.message },
      { status: 500 }
    );
  }
}
