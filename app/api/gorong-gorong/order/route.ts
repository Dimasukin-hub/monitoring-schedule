import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Ambil riwayat transaksi terkini
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lokasi = searchParams.get('lokasi')?.trim().toUpperCase();
    const jenis = searchParams.get('jenis')?.trim().toUpperCase();
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (lokasi) where.lokasi = { contains: lokasi, mode: 'insensitive' };
    if (jenis && jenis !== 'ALL') where.jenisTransaksi = jenis;

    const list = await prisma.transaksiGorongGorong.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return NextResponse.json({
      success: true,
      data: list,
    });
  } catch (error: any) {
    console.error('Error fetching order transactions:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil riwayat transaksi', error: error.message },
      { status: 500 }
    );
  }
}

// POST: Input Form Order (Order Wilayah, Drop Admin, Pasang Manual Admin) - Mendukung single & multi-lokasi batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Dukung multi-items batch save atau single object
    const rawItems = Array.isArray(body)
      ? body
      : (Array.isArray(body.items) ? body.items : [body]);

    // Data umum dari level root
    const commonTanggal = body.tanggal;
    const commonJenis = body.jenisTransaksi;
    const commonKeterangan = body.keterangan;
    const commonCreatedBy = body.createdBy || 'user_wilayah';
    const commonUserRole = body.userRole || 'USER_WILAYAH';

    // Format items
    const itemsToProcess = rawItems
      .map((it: any) => ({
        lokasi: it.lokasi,
        wilayah: it.wilayah,
        jenisTransaksi: it.jenisTransaksi || commonJenis || 'ORDER',
        qtyD40: it.qtyD40 ?? 0,
        qtyD60: it.qtyD60 ?? 0,
        qtyD80: it.qtyD80 ?? 0,
        qtyD100: it.qtyD100 ?? 0,
        tanggal: it.tanggal || commonTanggal,
        keterangan: it.keterangan !== undefined ? it.keterangan : commonKeterangan,
        createdBy: it.createdBy || commonCreatedBy,
        userRole: it.userRole || commonUserRole,
      }))
      .filter((it: any) => it.lokasi && typeof it.lokasi === 'string' && it.lokasi.trim() !== '');

    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Silakan isi minimal satu lokasi dengan jumlah gorong-gorong.' },
        { status: 400 }
      );
    }

    const validJenis = ['ORDER', 'DROP', 'PASANG_MANUAL'];
    const validatedData = [];

    for (const it of itemsToProcess) {
      const cleanLokasi = it.lokasi.trim().toUpperCase();
      const cleanJenis = String(it.jenisTransaksi || 'ORDER').toUpperCase().trim();

      if (!validJenis.includes(cleanJenis)) {
        return NextResponse.json(
          { success: false, message: `Jenis transaksi tidak valid: ${it.jenisTransaksi} pada lokasi ${cleanLokasi}` },
          { status: 400 }
        );
      }

      if (it.userRole === 'USER_WILAYAH' && cleanJenis !== 'ORDER') {
        return NextResponse.json(
          {
            success: false,
            message: 'Akses Ditolak: User Wilayah hanya berhak membuat transaksi ORDER.',
          },
          { status: 403 }
        );
      }

      const numD40 = Math.round(Number(it.qtyD40) || 0);
      const numD60 = Math.round(Number(it.qtyD60) || 0);
      const numD80 = Math.round(Number(it.qtyD80) || 0);
      const numD100 = Math.round(Number(it.qtyD100) || 0);

      if (
        numD40 < 0 || numD40 > 999 ||
        numD60 < 0 || numD60 > 999 ||
        numD80 < 0 || numD80 > 999 ||
        numD100 < 0 || numD100 > 999
      ) {
        return NextResponse.json(
          { success: false, message: `Jumlah diameter pada lokasi ${cleanLokasi} harus bernilai antara 0 s/d 999.` },
          { status: 400 }
        );
      }

      if (numD40 === 0 && numD60 === 0 && numD80 === 0 && numD100 === 0) {
        return NextResponse.json(
          { success: false, message: `Minimal salah satu diameter (Ø40, Ø60, Ø80, atau Ø100) pada lokasi ${cleanLokasi} harus diisi lebih dari 0.` },
          { status: 400 }
        );
      }

      // Ambil wilayah otomatis dari master jika belum ada
      let autoWil = it.wilayah;
      if (!autoWil || autoWil === '-' || autoWil === '') {
        const masterLokasi = await prisma.masterStatusLokasi.findUnique({
          where: { lokasi: cleanLokasi },
        });
        autoWil = masterLokasi?.wil || 'AW01';
      }

      const trxDate = it.tanggal ? new Date(it.tanggal) : new Date();

      validatedData.push({
        lokasi: cleanLokasi,
        wilayah: autoWil,
        jenisTransaksi: cleanJenis,
        tanggal: isNaN(trxDate.getTime()) ? new Date() : trxDate,
        qtyD40: numD40,
        qtyD60: numD60,
        qtyD80: numD80,
        qtyD100: numD100,
        keterangan: it.keterangan ? String(it.keterangan).trim() : null,
        createdBy: String(it.createdBy || 'user').trim(),
        userRole: String(it.userRole || 'USER_WILAYAH').trim(),
      });
    }

    // Eksekusi insert batch secara atomik
    const created = await prisma.$transaction(
      validatedData.map((data) => prisma.transaksiGorongGorong.create({ data }))
    );

    const lokasiNames = validatedData.map((d) => d.lokasi).join(', ');
    return NextResponse.json({
      success: true,
      message: `Berhasil menyimpan transaksi untuk ${created.length} lokasi (${lokasiNames})!`,
      data: created,
    });
  } catch (error: any) {
    console.error('Error saving order transaction:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menyimpan transaksi gorong-gorong', error: error.message },
      { status: 500 }
    );
  }
}

function checkIsAdmin(req: NextRequest): boolean {
  try {
    const roleHeader = req.headers.get('x-user-role');
    if (roleHeader === 'admin') return true;

    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    if (match) {
      const session = JSON.parse(decodeURIComponent(match[1]));
      if (session && session.role === 'admin') return true;
    }
    return false;
  } catch {
    return false;
  }
}

// DELETE: Hapus transaksi jika ada kesalahan input (Khusus Admin)
export async function DELETE(request: NextRequest) {
  try {
    if (!checkIsAdmin(request)) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak. Hanya admin yang berhak menghapus data riwayat transaksi.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);

    if (!id || id <= 0) {
      return NextResponse.json({ success: false, message: 'ID transaksi tidak valid.' }, { status: 400 });
    }

    await prisma.transaksiGorongGorong.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus transaksi', error: error.message },
      { status: 500 }
    );
  }
}
