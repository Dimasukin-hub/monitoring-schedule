import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncPlantingToStokLahan, parseDateString } from '@/lib/tanamSyncService';

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      tanggal,
      lokasi,
      aktivitas,
      jenisBibit,
      wilayah,
      standar,
      besar,
      sedang,
      kecil,
      extraKecil,
      petikKe,
    } = body;

    if (!lokasi || String(lokasi).trim() === '') {
      return NextResponse.json({ success: false, error: 'Nama lokasi/petak wajib dipilih.' }, { status: 400 });
    }
    const cleanLokasi = String(lokasi).trim().toUpperCase();

    if (!tanggal || String(tanggal).trim() === '') {
      return NextResponse.json({ success: false, error: 'Tanggal transaksi wajib diisi.' }, { status: 400 });
    }
    const cleanTanggal = String(tanggal).trim();

    const cleanAktivitas = aktivitas && String(aktivitas).trim() !== '' ? String(aktivitas).trim() : 'Tanam Bibit';
    const cleanJenis = jenisBibit && String(jenisBibit).trim() !== '' ? String(jenisBibit).trim() : 'Crown';

    const numStandar = Number(standar) || 0;
    const numBesar = Number(besar) || 0;
    const numSedang = Number(sedang) || 0;
    const numKecil = Number(kecil) || 0;
    const numExtraKecil = Number(extraKecil) || 0;

    const rawTotal = numStandar + numBesar + numSedang + numKecil + numExtraKecil;
    const cleanTotal = Number(rawTotal.toFixed(2));

    if (cleanTotal <= 0) {
      return NextResponse.json(
        { success: false, error: 'Total luasan bibit harus lebih dari 0 Ha (isi minimal satu kelas bibit).' },
        { status: 400 }
      );
    }

    // Lookup master informasi jika ada
    let luasNetto = 0;
    let autoWilayah = wilayah ? String(wilayah).trim() : null;

    const pMaster = await prisma.planting.findFirst({
      where: { lokasi: cleanLokasi },
    });
    if (pMaster) {
      luasNetto = pMaster.luas;
    }

    if (!autoWilayah) {
      const lMaster = await prisma.land.findFirst({
        where: { lokasi: cleanLokasi },
      });
      if (lMaster) {
        autoWilayah = lMaster.wilayah;
        if (!luasNetto) luasNetto = lMaster.luasNetto || lMaster.luasBruto || 0;
      }
    }

    // Parse tanggal ke Date
    const parsedDate = parseDateString(cleanTanggal);
    const tanggalDate = parsedDate || new Date();

    const created = await prisma.plantingDetail.create({
      data: {
        lokasi: cleanLokasi,
        tanggal: cleanTanggal,
        tanggalDate,
        luasNetto,
        aktivitas: cleanAktivitas,
        jenisBibit: cleanJenis,
        wilayah: autoWilayah,
        standar: numStandar,
        besar: numBesar,
        sedang: numSedang,
        kecil: numKecil,
        extraKecil: numExtraKecil,
        total: cleanTotal,
        petikKe: petikKe ? String(petikKe).trim() : null,
        sourceFile: 'Web Application',
        sourceSheet: 'Input Real Tanam&Petik Nanas',
      },
    });

    // Jika aktivitas Tanam Bibit, recalculate realTanam di Planting master
    if (cleanAktivitas.toLowerCase().includes('tanam')) {
      const tanamTxs = await prisma.plantingDetail.findMany({
        where: {
          lokasi: { equals: cleanLokasi, mode: 'insensitive' },
          aktivitas: { contains: 'tanam', mode: 'insensitive' },
        },
      });
      const newRealTanam = Number(tanamTxs.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2));

      if (pMaster) {
        await prisma.planting.update({
          where: { id: pMaster.id },
          data: { realTanam: newRealTanam },
        });
      }

      // Sinkronisasi Est. Selesai, Leadtime, Sisa, Progress, Status otomatis
      try {
        await syncPlantingToStokLahan(cleanLokasi);
      } catch (syncErr) {
        console.error('Error syncing planting after creating transaction:', syncErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: created,
      message: `Transaksi ${cleanAktivitas} untuk petak ${cleanLokasi} sebesar ${cleanTotal} Ha berhasil ditambahkan.`,
    });
  } catch (error: any) {
    console.error('Error creating planting transaction:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
