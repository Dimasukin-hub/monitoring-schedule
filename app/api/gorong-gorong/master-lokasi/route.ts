import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';
import { verifyAdminSession, parseRecordId } from '@/lib/masterDataApiHelper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const singleLokasi = searchParams.get('lokasi')?.trim();
    if (singleLokasi) {
      const record = await prisma.masterStatusLokasi.findUnique({
        where: { lokasi: singleLokasi },
      });

      // Ambil transaksi DROP dan PASANG_MANUAL untuk lokasi ini
      const trxList = await prisma.transaksiGorongGorong.findMany({
        where: {
          lokasi: singleLokasi,
          jenisTransaksi: { in: ['DROP', 'PASANG_MANUAL'] },
        },
        orderBy: { tanggal: 'desc' },
      });

      // Ambil juga jika ada data unlinked dari master drop / master pasang manual
      const unlinkedDrops = await prisma.masterDataDropGorongGorong.findMany({
        where: { lokasi: singleLokasi, transaksiId: null },
        orderBy: { tanggal: 'desc' },
      });
      const unlinkedPasang = await prisma.masterDataPasangManual.findMany({
        where: { lokasi: singleLokasi, transaksiId: null },
        orderBy: { tanggalPasangManual: 'desc' },
      });

      // Ambil riwayat realisasi Pasang SAP per line harian untuk lokasi ini
      const sapRecords = await prisma.masterSapGorongGorong.findMany({
        where: {
          OR: [
            { lokasi: { equals: singleLokasi, mode: 'insensitive' } },
            { referensiLokasi: { equals: singleLokasi, mode: 'insensitive' } },
          ],
        },
        orderBy: { tanggalRealisasi: 'desc' },
      });

      const history = [
        ...trxList.map((t) => ({
          id: `trx-${t.id}`,
          tanggal: t.tanggal ? t.tanggal.toISOString() : null,
          jenisTransaksi: t.jenisTransaksi,
          qtyD40: t.qtyD40 || 0,
          qtyD60: t.qtyD60 || 0,
          qtyD80: t.qtyD80 || 0,
          qtyD100: t.qtyD100 || 0,
          penginput: t.createdBy ? `${t.createdBy} (${t.userRole || 'USER'})` : 'User',
        })),
        ...unlinkedDrops.map((d) => ({
          id: `drop-${d.id}`,
          tanggal: d.tanggal ? d.tanggal.toISOString() : null,
          jenisTransaksi: 'DROP',
          qtyD40: d.diameter40 || 0,
          qtyD60: d.diameter60 || 0,
          qtyD80: d.diameter80 || 0,
          qtyD100: d.diameter100 || 0,
          penginput: 'Master Upload / SAP',
        })),
        ...unlinkedPasang.map((p) => ({
          id: `pasang-${p.id}`,
          tanggal: p.tanggalPasangManual ? p.tanggalPasangManual.toISOString() : null,
          jenisTransaksi: 'PASANG_MANUAL',
          qtyD40: p.diameter40 || 0,
          qtyD60: p.diameter60 || 0,
          qtyD80: p.diameter80 || 0,
          qtyD100: p.diameter100 || 0,
          penginput: 'Master Upload / SAP',
        })),
        ...sapRecords
          .filter((s) => (s.qty || 0) > 0)
          .map((s) => ({
            id: `sap-${s.id}`,
            tanggal: s.tanggalRealisasi ? s.tanggalRealisasi.toISOString() : null,
            jenisTransaksi: 'PASANG_SAP',
            qtyD40: s.diameter === 40 ? s.qty || 0 : 0,
            qtyD60: s.diameter === 60 ? s.qty || 0 : 0,
            qtyD80: s.diameter === 80 ? s.qty || 0 : 0,
            qtyD100: s.diameter === 100 ? s.qty || 0 : 0,
            penginput: s.pasDocument ? `SAP (${s.pasDocument})` : 'Upload Realisasi SAP',
          })),
      ].sort((a, b) => {
        const timeA = a.tanggal ? new Date(a.tanggal).getTime() : 0;
        const timeB = b.tanggal ? new Date(b.tanggal).getTime() : 0;
        return timeB - timeA;
      });

      return NextResponse.json({ success: true, data: record, history });
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
        where.strucPlant = { contains: wList[0], mode: 'insensitive' };
      } else if (wList.length > 1) {
        where.OR = wList.map((w) => ({ strucPlant: { contains: w, mode: 'insensitive' } }));
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
          strucPlant: true,
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

    await prisma.masterStatusLokasi.delete({
      where: { id },
    });

    await syncLokasiOrderDatabase().catch(() => {});

    return NextResponse.json({ success: true, message: 'Data master status lokasi berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting master status lokasi:', error);
    return NextResponse.json({ success: false, message: error.message || 'Gagal menghapus data' }, { status: 500 });
  }
}
