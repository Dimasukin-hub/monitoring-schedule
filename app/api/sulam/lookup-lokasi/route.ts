import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lokasiParam = searchParams.get('lokasi');

    // Jika dipanggil untuk mengambil seluruh daftar lokasi untuk dropdown
    if (!lokasiParam) {
      const [statusLokasi, listSulam, spekBibit] = await Promise.all([
        prisma.masterStatusLokasi.findMany({
          select: { lokasi: true, strucPlant: true, status: true },
          orderBy: { lokasi: 'asc' },
        }),
        prisma.listSulam.findMany({
          select: { lokasi: true, wilayah: true, spekBB: true, tglFMax: true },
        }),
        prisma.masterSpekBibitSulam.findMany({
          orderBy: { spekBB: 'asc' },
        }),
      ]);

      // Gabungkan lokasi unik
      const lokasiMap = new Map<string, { lokasi: string; wilayah: string | null }>();
      for (const s of statusLokasi) {
        lokasiMap.set(s.lokasi.trim().toUpperCase(), {
          lokasi: s.lokasi.trim().toUpperCase(),
          wilayah: s.strucPlant ? s.strucPlant.trim().toUpperCase() : null,
        });
      }
      for (const l of listSulam) {
        const k = l.lokasi.trim().toUpperCase();
        if (!lokasiMap.has(k)) {
          lokasiMap.set(k, { lokasi: k, wilayah: l.wilayah ? l.wilayah.trim().toUpperCase() : null });
        }
      }

      return NextResponse.json({
        success: true,
        lokasiList: Array.from(lokasiMap.values()).sort((a, b) => a.lokasi.localeCompare(b.lokasi)),
        spekBibitList: spekBibit,
      });
    }

    const cleanLokasi = lokasiParam.trim().toUpperCase();

    // Ambil data dari MasterStatusLokasi, ListSulam, dan MasterSpekBibitSulam
    const [statusLokasi, listSulam, allSpek] = await Promise.all([
      prisma.masterStatusLokasi.findFirst({
        where: { lokasi: cleanLokasi },
      }),
      prisma.listSulam.findFirst({
        where: { lokasi: cleanLokasi },
      }),
      prisma.masterSpekBibitSulam.findMany({}),
    ]);

    const wilayah = statusLokasi?.strucPlant || listSulam?.wilayah || null;
    const tglFMax = listSulam?.tglFMax || null;

    // Perhitungan Umur Forcing (Usia di form):
    // Selisih hari antara tanggal saat ini dan Tanggal Forcing Max, dibagi 30,4, dibulatkan ke bilangan bulat terdekat
    let usia: number | null = null;
    let usiaDetailStr = '-';
    if (tglFMax) {
      const today = new Date();
      const diffMs = today.getTime() - new Date(tglFMax).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      usia = Math.round(diffDays / 30.4);
      usiaDetailStr = `${usia} Bulan`;
    }

    const spekBB = listSulam?.spekBB || null;
    const keterangan = listSulam?.keterangan || (spekBB?.toLowerCase().includes('pangkas prod') ? 'Pangkas Produksi' : null);

    // Cari Std Rit CD & Fuso dari MasterSpekBibitSulam
    let stdRitCD = 0;
    let stdRitFuso = 0;
    if (spekBB) {
      const matchedSpek = allSpek.find(
        (s) => s.spekBB.toLowerCase().trim() === spekBB.toLowerCase().trim()
      );
      if (matchedSpek) {
        stdRitCD = matchedSpek.stdRitCD;
        stdRitFuso = matchedSpek.stdRitFuso;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        lokasi: cleanLokasi,
        wilayah,
        tanggalForcingMax: tglFMax ? new Date(tglFMax).toISOString().slice(0, 10) : null,
        usia,
        usiaDisplay: usiaDetailStr,
        kelasBibit: spekBB || 'Sucker No. 2',
        spekBB,
        keterangan: keterangan || 'Pangkas Produksi',
        ritCD: listSulam?.permintaanRitaseRit || 0,
        ritFuso: 0,
        permintaanRitaseBtg: listSulam?.permintaanRitaseBtg || 0,
        stdRitCD,
        stdRitFuso,
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/sulam/lookup-lokasi:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil referensi data sulam.' },
      { status: 500 }
    );
  }
}

