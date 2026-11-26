import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reconcileAllGorongGorongMasterData, syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';
import { verifyAdminSession, parseRecordId } from '@/lib/masterDataApiHelper';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Sinkronisasi otomatis dari transaksi riwayat jika ada data yang belum tercatat di tabel master
    try {
      await reconcileAllGorongGorongMasterData();
    } catch (syncErr) {
      console.warn('Reconcile warning on master pasang manual GET:', syncErr);
    }

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
        { lokasi: { contains: search, mode: 'insensitive' } },
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
        where.tanggalPasangManual = { gte: startDate, lte: endDate };
      }
    }

    const [total, records] = await Promise.all([
      prisma.masterDataPasangManual.count({ where }),
      prisma.masterDataPasangManual.findMany({
        where,
        orderBy: [{ wilayah: 'asc' }, { lokasi: 'asc' }, { tanggalPasangManual: 'asc' }],
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
    console.error('Error fetching master data pasang manual:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat master data pasang manual', error: error.message },
      { status: 500 }
    );
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

    const existing = await prisma.masterDataPasangManual.findUnique({ where: { id } });
    if (existing?.transaksiId) {
      await prisma.transaksiGorongGorong.deleteMany({ where: { id: existing.transaksiId } }).catch(() => {});
    }

    await prisma.masterDataPasangManual.delete({
      where: { id },
    });

    await syncLokasiOrderDatabase().catch(() => {});

    return NextResponse.json({ success: true, message: 'Data master pasang manual berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting master data pasang manual:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}

