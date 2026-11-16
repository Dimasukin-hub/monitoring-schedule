import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Helper untuk format nomor tiket SLM-YYYYMM-XXXX
async function generateNomorTiket(): Promise<string> {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `SLM-${yearMonth}-`;

  const lastTicket = await prisma.formTiketOrderSulam.findFirst({
    where: { nomorTiket: { startsWith: prefix } },
    orderBy: { id: 'desc' },
  });

  let nextNum = 1;
  if (lastTicket && lastTicket.nomorTiket) {
    const parts = lastTicket.nomorTiket.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

// GET: Ambil daftar tiket order sulam (dengan pencarian, filter status, filter wilayah)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status')?.trim() || '';
    const wilayah = searchParams.get('wilayah')?.trim() || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { nomorTiket: { contains: search, mode: 'insensitive' } },
        { lokasi: { contains: search, mode: 'insensitive' } },
        { pemohonName: { contains: search, mode: 'insensitive' } },
        { kelasBibit: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (wilayah && wilayah !== 'ALL') {
      where.wilayah = wilayah;
    }

    const [total, data] = await Promise.all([
      prisma.formTiketOrderSulam.count({ where }),
      prisma.formTiketOrderSulam.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Summary stats per status
    const allStatuses = await prisma.formTiketOrderSulam.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const stats = {
      total: await prisma.formTiketOrderSulam.count(),
      diajukan: allStatuses.find((s) => s.status === 'DIAJUKAN')?._count.id || 0,
      approved: allStatuses.find((s) => s.status === 'APPROVED')?._count.id || 0,
      antrian: allStatuses.find((s) => s.status === 'ANTRIAN')?._count.id || 0,
      realDrop: allStatuses.find((s) => s.status === 'REAL_DROP')?._count.id || 0,
      realTanam: allStatuses.find((s) => s.status === 'REAL_TANAM')?._count.id || 0,
      close: allStatuses.find((s) => s.status === 'CLOSE')?._count.id || 0,
    };

    return NextResponse.json({
      success: true,
      data,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/form-order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data formulir order sulam.' },
      { status: 500 }
    );
  }
}

// POST: Buat form order sulam baru oleh User Wilayah
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lokasi, wilayah, usia, kelasBibit, ritFuso, ritCD, keterangan, pemohonName, pemohonRole } = body;

    if (!lokasi || !lokasi.trim()) {
      return NextResponse.json(
        { success: false, message: 'Lokasi petak wajib dipilih!' },
        { status: 400 }
      );
    }

    if (!kelasBibit || !kelasBibit.trim()) {
      return NextResponse.json(
        { success: false, message: 'Kelas bibit wajib diisi!' },
        { status: 400 }
      );
    }

    const cleanLokasi = lokasi.trim().toUpperCase();
    const cleanWilayah = wilayah ? wilayah.trim().toUpperCase() : null;
    const nomorTiket = await generateNomorTiket();

    const created = await prisma.formTiketOrderSulam.create({
      data: {
        nomorTiket,
        lokasi: cleanLokasi,
        wilayah: cleanWilayah,
        usia: usia !== null && usia !== undefined ? Number(usia) : null,
        kelasBibit: kelasBibit.trim(),
        ritFuso: Number(ritFuso) || 0,
        ritCD: Number(ritCD) || 0,
        keterangan: keterangan?.trim() || null,
        status: 'DIAJUKAN',
        pemohonName: pemohonName || 'User Wilayah',
        pemohonRole: pemohonRole || 'user_wilayah',
      },
    });

    // Otomatis sinkronkan juga catatan ke MasterDataOrderSulam jika belum ada
    try {
      const stdRitCD = 3000;
      const btgPerRit = (Number(ritCD) || 0) * stdRitCD + (Number(ritFuso) || 0) * 4500;
      await prisma.masterDataOrderSulam.create({
        data: {
          lokasi: cleanLokasi,
          wilayah: cleanWilayah,
          tanggal: new Date(),
          spekBB: kelasBibit.trim(),
          jumlahBtg: btgPerRit,
          jumlahRit: (Number(ritCD) || 0) + (Number(ritFuso) || 0),
          keterangan: keterangan?.trim() || null,
        },
      });
    } catch (e) {
      console.warn('Sync to MasterDataOrderSulam optional note:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Form Order Sulam ${nomorTiket} berhasil diajukan dan sedang menunggu persetujuan (Approval) User Planting.`,
      data: created,
    });
  } catch (error: any) {
    console.error('Error in POST /api/sulam/form-order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat tiket form order sulam.' },
      { status: 500 }
    );
  }
}

// PATCH: Update status formulir / Approval oleh User Planting
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approverName, catatan } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID formulir wajib disertakan!' },
        { status: 400 }
      );
    }

    const validStatuses = ['DIAJUKAN', 'APPROVED', 'ANTRIAN', 'REAL_DROP', 'REAL_TANAM', 'CLOSE'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: `Status tidak valid. Pilihan: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const updateData: any = {
      status,
      catatan: catatan !== undefined ? catatan : undefined,
    };

    if (status === 'APPROVED') {
      updateData.approvedByName = approverName || 'User Planting';
      updateData.approvedAt = new Date();
    }

    const updated = await prisma.formTiketOrderSulam.update({
      where: { id: Number(id) },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `Status formulir ${updated.nomorTiket} berhasil diubah menjadi ${status}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/sulam/form-order:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui status formulir order sulam.' },
      { status: 500 }
    );
  }
}

