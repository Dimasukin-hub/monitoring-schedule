import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const wilayah = searchParams.get('wilayah') || 'ALL';
    const status = searchParams.get('status') || 'ALL'; // 'ALL' | 'SELESAI' | 'PROSES' | 'BELUM'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get('limit') || '15', 10)));

    const where: any = {};

    if (wilayah && wilayah !== 'ALL') {
      where.wilayah = wilayah;
    }

    if (status === 'SELESAI') {
      where.progressTanam = 100;
    } else if (status === 'PROSES') {
      where.progressTanam = 50;
    } else if (status === 'BELUM') {
      where.progressTanam = { lt: 50 };
    }

    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { wilayah: { contains: search, mode: 'insensitive' } },
        { jenisBibit: { contains: search, mode: 'insensitive' } },
        { bulanTanam: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.land.count({ where });

    const lands = await prisma.land.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ bulanTanam: 'asc' }, { lokasi: 'asc' }],
      select: {
        id: true,
        lokasi: true,
        wilayah: true,
        luasNetto: true,
        luasBruto: true,
        jenisBibit: true,
        kelasBibit: true,
        bulanTanam: true,
        rencMulaiTanam: true,
        rencSelesaiTanam: true,
        realMulaiTanam: true,
        realSelesaiTanam: true,
        hariWaktu: true,
        progressTanam: true,
        statusAplikasi: true,
        aplikasiTerakhir: true,
      },
    });

    const formattedLands = lands.map((l) => {
      let plantingStatus = 'Belum Mulai';
      if (l.progressTanam === 100) plantingStatus = 'Selesai Tanam';
      else if (l.progressTanam === 50) plantingStatus = 'Proses Tanam';

      return {
        ...l,
        plantingStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedLands,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error fetching tanam data:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
