import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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
        { lokasiPengirim: { contains: search, mode: 'insensitive' } },
        { lokasiPenerima: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (wilayah && wilayah !== 'ALL') {
      const wList = wilayah.split(',').map((w) => w.trim()).filter(Boolean);
      if (wList.length === 1) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { wilayahPengirim: { contains: wList[0], mode: 'insensitive' } },
              { wilayahPenerima: { contains: wList[0], mode: 'insensitive' } },
            ],
          },
        ];
      } else if (wList.length > 1) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              ...wList.map((w) => ({ wilayahPengirim: { contains: w, mode: 'insensitive' } })),
              ...wList.map((w) => ({ wilayahPenerima: { contains: w, mode: 'insensitive' } })),
            ],
          },
        ];
      }
    }

    const [total, records] = await Promise.all([
      prisma.masterDataPindahGorongGorong.count({ where }),
      prisma.masterDataPindahGorongGorong.findMany({
        where,
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
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
    console.error('Error fetching master data pindah lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data pindah lokasi', error: error.message },
      { status: 500 }
    );
  }
}
