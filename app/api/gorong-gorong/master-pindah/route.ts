import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { restoreMasterDropAsal, syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const wilayah = searchParams.get('wilayah');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {
      NOT: {
        AND: [
          { diameter40: 0 },
          { diameter60: 0 },
          { diameter80: 0 },
          { diameter100: 0 },
        ],
      },
    };
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
        where.tanggal = { gte: startDate, lte: endDate };
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

    const existing = await prisma.masterDataPindahGorongGorong.findUnique({ where: { id } });
    if (existing?.transaksiId) {
      // Hapus baris drop di tujuan yang dibuat oleh transaksi form input ini
      await prisma.masterDataDropGorongGorong.deleteMany({
        where: { transaksiId: existing.transaksiId },
      });

      // Kembalikan qty drop ke lokasi pengirim
      if (existing.lokasiPengirim) {
        await restoreMasterDropAsal(
          existing.lokasiPengirim,
          {
            d40: existing.diameter40 || 0,
            d60: existing.diameter60 || 0,
            d80: existing.diameter80 || 0,
            d100: existing.diameter100 || 0,
          },
          existing.tanggal
        );
      }

      await prisma.transaksiGorongGorong.deleteMany({ where: { id: existing.transaksiId } });
    }

    await prisma.masterDataPindahGorongGorong.deleteMany({
      where: { id },
    });

    await syncLokasiOrderDatabase().catch((err) => {
      console.warn('Warning syncing database after deleting master pindah:', err);
    });

    return NextResponse.json({ success: true, message: 'Data master pindah lokasi berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting master data pindah lokasi:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}

