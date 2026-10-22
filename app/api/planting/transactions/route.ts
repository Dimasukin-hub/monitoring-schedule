import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search')?.trim() || '';
    const sortField = searchParams.get('sortField')?.trim() || 'tanggalDate';
    const sortOrder = searchParams.get('sortOrder')?.trim() || 'asc';
    const all = searchParams.get('all') === 'true';

    // Support comma-separated multi-select filters
    const wilayahList = (searchParams.get('wilayah') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const aktivitasList = (searchParams.get('aktivitas') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const jenisBibitList = (searchParams.get('jenisBibit') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const monthList = (searchParams.get('month') || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s !== 'ALL');

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    // Build conditions
    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { lokasi: { contains: search, mode: 'insensitive' } },
          { wilayah: { contains: search, mode: 'insensitive' } },
          { tanggal: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (wilayahList.length > 0) {
      conditions.push({
        wilayah: { in: wilayahList, mode: 'insensitive' },
      });
    }

    if (aktivitasList.length > 0) {
      conditions.push({
        aktivitas: { in: aktivitasList, mode: 'insensitive' },
      });
    }

    if (jenisBibitList.length > 0) {
      conditions.push({
        jenisBibit: { in: jenisBibitList, mode: 'insensitive' },
      });
    }

    if (monthList.length > 0) {
      conditions.push({
        OR: monthList.map((m) => ({
          tanggal: { contains: `/${m.padStart(2, '0')}/2026` },
        })),
      });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    // Build orderBy
    let orderBy: any = [];
    if (sortField === 'tanggalDate') {
      orderBy = [
        { tanggalDate: sortOrder === 'desc' ? 'desc' : 'asc' },
        { id: sortOrder === 'desc' ? 'desc' : 'asc' },
      ];
    } else {
      orderBy = [{ [sortField]: sortOrder === 'desc' ? 'desc' : 'asc' }];
    }

    if (all) {
      // Return all matching rows without pagination (used for Excel export)
      const transactions = await prisma.plantingDetail.findMany({
        where,
        orderBy,
      });

      return NextResponse.json({
        success: true,
        data: transactions,
        total: transactions.length,
      });
    }

    // Paginated fetch
    const [total, transactions, aggregate] = await Promise.all([
      prisma.plantingDetail.count({ where }),
      prisma.plantingDetail.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.plantingDetail.aggregate({
        where,
        _sum: {
          total: true,
          standar: true,
          besar: true,
          sedang: true,
          kecil: true,
          extraKecil: true,
        },
      }),
    ]);

    // Available distinct filter options
    const [distinctWilayahs, distinctAktivitas, distinctJenis] = await Promise.all([
      prisma.plantingDetail.findMany({
        select: { wilayah: true },
        distinct: ['wilayah'],
        where: { wilayah: { not: null } },
      }),
      prisma.plantingDetail.findMany({
        select: { aktivitas: true },
        distinct: ['aktivitas'],
        where: { aktivitas: { not: null } },
      }),
      prisma.plantingDetail.findMany({
        select: { jenisBibit: true },
        distinct: ['jenisBibit'],
        where: { jenisBibit: { not: null } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalHa: aggregate._sum.total || 0,
        standarHa: aggregate._sum.standar || 0,
        besarHa: aggregate._sum.besar || 0,
        sedangHa: aggregate._sum.sedang || 0,
        kecilHa: aggregate._sum.kecil || 0,
        extraKecilHa: aggregate._sum.extraKecil || 0,
      },
      filters: {
        wilayahs: distinctWilayahs.map((w) => w.wilayah).filter(Boolean).sort(),
        aktivitas: distinctAktivitas.map((a) => a.aktivitas).filter(Boolean).sort(),
        jenisBibit: distinctJenis.map((j) => j.jenisBibit).filter(Boolean).sort(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching planting transactions:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat data transaksi planting.' },
      { status: 500 }
    );
  }
}
