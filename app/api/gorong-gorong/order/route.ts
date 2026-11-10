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

      if (it.userRole === 'USER_WILAYAH' && cleanJenis !== 'ORDER' && cleanJenis !== 'PASANG_MANUAL') {
        return NextResponse.json(
          {
            success: false,
            message: 'Akses Ditolak: User Wilayah hanya berhak membuat transaksi ORDER dan PASANG MANUAL.',
          },
          { status: 403 }
        );
      }

      if (it.userRole === 'USER_FE' && cleanJenis !== 'DROP') {
        return NextResponse.json(
          {
            success: false,
            message: 'Akses Ditolak: User FE hanya berhak membuat transaksi DROP.',
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
        autoWil = masterLokasi?.strucPlant || 'AW01';
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

    // Sinkronisasi pembaruan kuantiti dan transisi prioritas otomatis ke tabel LokasiOrderGorongGorong
    for (const d of validatedData) {
      try {
        const existingLokasiOrder = await prisma.lokasiOrderGorongGorong.findUnique({
          where: { lokasi: d.lokasi },
        });

        const tglStr = d.tanggal ? (typeof d.tanggal === 'string' ? d.tanggal : d.tanggal.toISOString().slice(0, 10)) : '-';

        if (existingLokasiOrder) {
          const updateData: any = {};
          if (d.jenisTransaksi === 'DROP') {
            if (d.qtyD40 > 0) {
              updateData.dropD40 = (existingLokasiOrder.dropD40 || 0) + d.qtyD40;
              updateData.tglDropD40 = tglStr;
            }
            if (d.qtyD60 > 0) updateData.dropD60 = (existingLokasiOrder.dropD60 || 0) + d.qtyD60;
            if (d.qtyD80 > 0) updateData.dropD80 = (existingLokasiOrder.dropD80 || 0) + d.qtyD80;
            if (d.qtyD100 > 0) updateData.dropD100 = (existingLokasiOrder.dropD100 || 0) + d.qtyD100;

            // Hitung total order dan drop terkini untuk evaluasi transisi prioritas
            const ord40 = updateData.orderD40 ?? existingLokasiOrder.orderD40 ?? 0;
            const ord60 = updateData.orderD60 ?? existingLokasiOrder.orderD60 ?? 0;
            const ord80 = updateData.orderD80 ?? existingLokasiOrder.orderD80 ?? 0;
            const ord100 = updateData.orderD100 ?? existingLokasiOrder.orderD100 ?? 0;
            const totOrd = ord40 + ord60 + ord80 + ord100;

            const drp40 = updateData.dropD40 ?? existingLokasiOrder.dropD40 ?? 0;
            const drp60 = updateData.dropD60 ?? existingLokasiOrder.dropD60 ?? 0;
            const drp80 = updateData.dropD80 ?? existingLokasiOrder.dropD80 ?? 0;
            const drp100 = updateData.dropD100 ?? existingLokasiOrder.dropD100 ?? 0;
            const totDrp = drp40 + drp60 + drp80 + drp100;

            const pctDrop = totOrd > 0 ? (totDrp / totOrd) * 100 : (totDrp > 0 ? 100 : 0);

            // Transisi prioritas operasional baru:
            // P1 -> P4 jika drop > 50% (jika drop <= 50% tetap P1)
            // P2 -> P3 jika sudah drop
            if (existingLokasiOrder.prioritas === '1' || existingLokasiOrder.prioritas === '4') {
              updateData.prioritas = pctDrop > 50 ? '4' : '1';
            } else if (existingLokasiOrder.prioritas === '2') {
              updateData.prioritas = '3';
            }
          } else if (d.jenisTransaksi === 'ORDER') {
            if (d.qtyD40 > 0) updateData.orderD40 = (existingLokasiOrder.orderD40 || 0) + d.qtyD40;
            if (d.qtyD60 > 0) updateData.orderD60 = (existingLokasiOrder.orderD60 || 0) + d.qtyD60;
            if (d.qtyD80 > 0) updateData.orderD80 = (existingLokasiOrder.orderD80 || 0) + d.qtyD80;
            if (d.qtyD100 > 0) updateData.orderD100 = (existingLokasiOrder.orderD100 || 0) + d.qtyD100;
            if (!existingLokasiOrder.tanggalOrder || existingLokasiOrder.tanggalOrder === '-') {
              updateData.tanggalOrder = tglStr;
            }
          } else if (d.jenisTransaksi === 'PASANG_MANUAL') {
            if (d.qtyD40 > 0) updateData.pasangManD40 = (existingLokasiOrder.pasangManD40 || 0) + d.qtyD40;
            if (d.qtyD60 > 0) updateData.pasangManD60 = (existingLokasiOrder.pasangManD60 || 0) + d.qtyD60;
            if (d.qtyD80 > 0) updateData.pasangManD80 = (existingLokasiOrder.pasangManD80 || 0) + d.qtyD80;
            if (d.qtyD100 > 0) updateData.pasangManD100 = (existingLokasiOrder.pasangManD100 || 0) + d.qtyD100;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.lokasiOrderGorongGorong.update({
              where: { lokasi: d.lokasi },
              data: updateData,
            });
          }
        } else {
          // Lokasi baru masuk ke list lokasi order
          let prio = d.jenisTransaksi === 'DROP' ? '4' : '1';
          await prisma.lokasiOrderGorongGorong.create({
            data: {
              lokasi: d.lokasi,
              wilayah: d.wilayah,
              prioritas: prio,
              tanggalOrder: d.jenisTransaksi === 'ORDER' ? tglStr : '-',
              statusAll: '-',
              orderD40: d.jenisTransaksi === 'ORDER' ? d.qtyD40 : 0,
              dropD40: d.jenisTransaksi === 'DROP' ? d.qtyD40 : 0,
              tglDropD40: d.jenisTransaksi === 'DROP' ? tglStr : null,
              pasangManD40: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD40 : 0,
              orderD60: d.jenisTransaksi === 'ORDER' ? d.qtyD60 : 0,
              dropD60: d.jenisTransaksi === 'DROP' ? d.qtyD60 : 0,
              pasangManD60: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD60 : 0,
              orderD80: d.jenisTransaksi === 'ORDER' ? d.qtyD80 : 0,
              dropD80: d.jenisTransaksi === 'DROP' ? d.qtyD80 : 0,
              pasangManD80: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD80 : 0,
              orderD100: d.jenisTransaksi === 'ORDER' ? d.qtyD100 : 0,
              dropD100: d.jenisTransaksi === 'DROP' ? d.qtyD100 : 0,
              pasangManD100: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD100 : 0,
            },
          });
        }
      } catch (err) {
        console.warn(`Failed to sync LokasiOrderGorongGorong for ${d.lokasi}:`, err);
      }
    }

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

// DELETE: Hapus transaksi jika ada kesalahan input
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0', 10);

    if (!id || id <= 0) {
      return NextResponse.json({ success: false, message: 'ID transaksi tidak valid.' }, { status: 400 });
    }

    const existing = await prisma.transaksiGorongGorong.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Data transaksi tidak ditemukan atau sudah dihapus.' },
        { status: 404 }
      );
    }

    await prisma.transaksiGorongGorong.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Transaksi ${existing.jenisTransaksi} lokasi ${existing.lokasi} berhasil dihapus.`,
    });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal menghapus transaksi', error: error.message },
      { status: 500 }
    );
  }
}
