import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';

// GET: Ambil riwayat transaksi terkini ATAU daftar lokasi yang memiliki saldo (mode=saldo_pengirim)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // Jika mode saldo_pengirim: hanya kembalikan lokasi dari tabel database lokasiordergoronggorong yang memiliki sisa saldo
    if (mode === 'saldo_pengirim' || mode === 'saldo') {
      const rows = await prisma.lokasiOrderGorongGorong.findMany({
        orderBy: { lokasi: 'asc' },
      });

      const listWithSaldo = rows
        .map((r) => {
          const pasang40 = Math.max(r.pasangManD40 || 0, r.pasangSapD40 || 0);
          const saldo40 = Math.max(0, (r.dropD40 || 0) - pasang40);

          const pasang60 = Math.max(r.pasangManD60 || 0, r.pasangSapD60 || 0);
          const saldo60 = Math.max(0, (r.dropD60 || 0) - pasang60);

          const pasang80 = Math.max(r.pasangManD80 || 0, r.pasangSapD80 || 0);
          const saldo80 = Math.max(0, (r.dropD80 || 0) - pasang80);

          const pasang100 = Math.max(r.pasangManD100 || 0, r.pasangSapD100 || 0);
          const saldo100 = Math.max(0, (r.dropD100 || 0) - pasang100);

          const totalSaldo = saldo40 + saldo60 + saldo80 + saldo100;

          return {
            lokasi: r.lokasi,
            wilayah: r.wilayah || '-',
            strucPlant: r.wilayah || '-',
            saldoD40: saldo40,
            saldoD60: saldo60,
            saldoD80: saldo80,
            saldoD100: saldo100,
            totalSaldo,
          };
        })
        .filter((it) => it.totalSaldo > 0);

      return NextResponse.json({
        success: true,
        data: listWithSaldo,
      });
    }

    const lokasi = searchParams.get('lokasi')?.trim().toUpperCase();
    const jenis = searchParams.get('jenis')?.trim().toUpperCase();
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    const where: any = {};
    if (lokasi) where.lokasi = { contains: lokasi, mode: 'insensitive' };
    if (jenis && jenis !== 'ALL') where.jenisTransaksi = jenis;

    const [total, list] = await Promise.all([
      prisma.transaksiGorongGorong.count({ where }),
      prisma.transaksiGorongGorong.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: list,
      total,
      page,
      totalPages,
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
      .map((it: any) => {
        const destLok = it.lokasiPenerima || it.lokasiTujuan || it.lokasi;
        const srcLok = it.lokasiPengirim || it.lokasiAsal || null;
        return {
          lokasi: destLok,
          lokasiAsal: srcLok && srcLok.trim().toUpperCase() !== destLok?.trim().toUpperCase() ? srcLok.trim().toUpperCase() : null,
          lokasiTujuan: destLok ? destLok.trim().toUpperCase() : '',
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
        };
      })
      .filter((it: any) => it.lokasi && typeof it.lokasi === 'string' && it.lokasi.trim() !== '');

    if (itemsToProcess.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Silakan isi minimal satu lokasi dengan jumlah gorong-gorong.' },
        { status: 400 }
      );
    }

    const validJenis = ['ORDER', 'DROP', 'PASANG_MANUAL', 'PINDAH_LOKASI'];
    const validatedData = [];

    // Baca sesi user dari cookie ggf_session untuk verifikasi hak akses wilayah tugas di sisi server
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    let sessionUser: any = null;
    if (match) {
      try {
        sessionUser = JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {}
    }

    const isPrivileged = sessionUser && ['admin', 'super_admin', 'kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'].includes(sessionUser.role);
    const userWilayah = sessionUser?.wilayah && sessionUser.wilayah !== 'ALL' ? sessionUser.wilayah.trim().toUpperCase() : null;

    // Validasi ketat: Seluruh lokasi wajib terdaftar resmi di MasterStatusLokasi
    const masterLocations = await prisma.masterStatusLokasi.findMany({
      select: { lokasi: true, strucPlant: true },
    });
    const validLokasiMap = new Map<string, string>();
    for (const m of masterLocations) {
      if (m.lokasi) {
        validLokasiMap.set(m.lokasi.trim().toUpperCase(), m.strucPlant || 'AW01');
      }
    }

    for (const it of itemsToProcess) {
      const cleanLokasi = String(it.lokasi || '').trim().toUpperCase();
      if (!cleanLokasi || !validLokasiMap.has(cleanLokasi)) {
        return NextResponse.json(
          {
            success: false,
            message: `Lokasi '${it.lokasi}' tidak valid atau tidak terdaftar di Master Status Lokasi! Harap gunakan lokasi resmi yang berawalan angka 0 (contoh: 085C).`,
          },
          { status: 400 }
        );
      }

      if (it.lokasiAsal) {
        const cleanAsal = String(it.lokasiAsal || '').trim().toUpperCase();
        if (!validLokasiMap.has(cleanAsal)) {
          return NextResponse.json(
            {
              success: false,
              message: `Lokasi Asal '${it.lokasiAsal}' tidak valid atau tidak terdaftar di Master Status Lokasi!`,
            },
            { status: 400 }
          );
        }
      }

      const cleanJenis = String(it.jenisTransaksi || 'ORDER').toUpperCase().trim();

      if (!validJenis.includes(cleanJenis)) {
        return NextResponse.json(
          { success: false, message: `Jenis transaksi tidak valid: ${it.jenisTransaksi} pada lokasi ${cleanLokasi}` },
          { status: 400 }
        );
      }

      const isPindah = cleanJenis === 'PINDAH_LOKASI' || (cleanJenis === 'DROP' && !!it.lokasiAsal);
      if (['USER_WILAYAH', 'MANDOR_WILAYAH'].includes(it.userRole) && cleanJenis !== 'PASANG_MANUAL' && !isPindah) {
        return NextResponse.json(
          {
            success: false,
            message: 'Akses Ditolak: Mandor Wilayah hanya berhak mengisi data Pasang Manual dan Pindah Lokasi.',
          },
          { status: 403 }
        );
      }

      if (['USER_FE', 'VERIFIKATOR_FE'].includes(it.userRole) && cleanJenis !== 'DROP') {
        return NextResponse.json(
          {
            success: false,
            message: 'Akses Ditolak: Verifikator FE hanya berhak membuat transaksi DROP.',
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
        autoWil = validLokasiMap.get(cleanLokasi) || 'AW01';
      }

      // Validasi ketat hak akses wilayah di sisi server: Mandor Wilayah dan Kepala Wilayah hanya berhak pada wilayah tugasnya
      if (!isPrivileged && userWilayah) {
        if (autoWil && autoWil.toUpperCase() !== userWilayah) {
          return NextResponse.json(
            {
              success: false,
              message: `Akses Ditolak: Lokasi '${cleanLokasi}' (${autoWil}) berada di luar wilayah tugas resmi Anda (${userWilayah}).`,
            },
            { status: 403 }
          );
        }

        if (it.lokasiAsal) {
          const cleanAsal = String(it.lokasiAsal || '').trim().toUpperCase();
          const asalWil = validLokasiMap.get(cleanAsal) || 'AW01';
          if (asalWil.toUpperCase() !== userWilayah) {
            return NextResponse.json(
              {
                success: false,
                message: `Akses Ditolak: Lokasi asal/pengirim '${cleanAsal}' (${asalWil}) berada di luar wilayah tugas resmi Anda (${userWilayah}).`,
              },
              { status: 403 }
            );
          }
        }
      }

      const trxDate = it.tanggal ? new Date(it.tanggal) : new Date();

      validatedData.push({
        lokasi: cleanLokasi,
        lokasiAsal: it.lokasiAsal || null,
        lokasiTujuan: cleanLokasi,
        wilayah: autoWil,
        jenisTransaksi: cleanJenis === 'PINDAH_LOKASI' ? 'DROP' : cleanJenis,
        tanggal: isNaN(trxDate.getTime()) ? new Date() : trxDate,
        qtyD40: numD40,
        qtyD60: numD60,
        qtyD80: numD80,
        qtyD100: numD100,
        keterangan: it.keterangan ? String(it.keterangan).trim() : null,
        createdBy: String(it.createdBy || 'user').trim(),
        userRole: it.userRole === 'USER_WILAYAH' || it.userRole === 'MANDOR_WILAYAH'
          ? 'MANDOR_WILAYAH'
          : it.userRole === 'USER_FE' || it.userRole === 'VERIFIKATOR_FE'
          ? 'VERIFIKATOR_FE'
          : it.userRole === 'KEPALA_WILAYAH'
          ? 'KEPALA_WILAYAH'
          : String(it.userRole || 'USER').trim(),
      });
    }

    // Eksekusi insert batch secara atomik ke riwayat transaksi
    const created = await prisma.$transaction(
      validatedData.map((data) => prisma.transaksiGorongGorong.create({ data }))
    );

    // 1. Sinkronisasi penambahan data ke tabel Master (Sebagai baris baru terhubung transaksiId)
    for (const d of created) {
      try {
        if (d.jenisTransaksi === 'ORDER') {
          // Selalu buat baris baru di Master Data Order terhubung transaksiId
          await prisma.masterDataOrderGorongGorong.create({
            data: {
              transaksiId: d.id,
              lokasi: d.lokasi,
              wilayah: d.wilayah || 'AW01',
              tanggal: d.tanggal || new Date(),
              diameter40: d.qtyD40 || 0,
              diameter60: d.qtyD60 || 0,
              diameter80: d.qtyD80 || 0,
              diameter100: d.qtyD100 || 0,
            },
          });
        } else if (d.jenisTransaksi === 'DROP') {
          // Jika pindah lokasi: catat ke MasterDataPindahGorongGorong & kurangi drop di asal pada MasterDataDropGorongGorong
          if (d.lokasiAsal) {
            let asalWil = null;
            const mAsal = await prisma.masterStatusLokasi.findUnique({
              where: { lokasi: d.lokasiAsal },
            });
            asalWil = mAsal?.strucPlant || 'AW01';

            // Catat mutasi resmi ke MasterDataPindahGorongGorong
            await prisma.masterDataPindahGorongGorong.create({
              data: {
                transaksiId: d.id,
                lokasiPengirim: d.lokasiAsal,
                wilayahPengirim: asalWil,
                lokasiPenerima: d.lokasi,
                wilayahPenerima: d.wilayah,
                tanggal: d.tanggal || new Date(),
                diameter40: d.qtyD40 || 0,
                diameter60: d.qtyD60 || 0,
                diameter80: d.qtyD80 || 0,
                diameter100: d.qtyD100 || 0,
                keterangan: (d as any).keterangan || null,
              },
            });
          }

          // Tambah drop di tujuan sebagai baris baru di MasterDataDropGorongGorong
          await prisma.masterDataDropGorongGorong.create({
            data: {
              transaksiId: d.id,
              lokasi: d.lokasi,
              wilayah: d.wilayah || 'AW01',
              tanggal: d.tanggal || new Date(),
              diameter40: d.qtyD40 || 0,
              diameter60: d.qtyD60 || 0,
              diameter80: d.qtyD80 || 0,
              diameter100: d.qtyD100 || 0,
            },
          });
        } else if (d.jenisTransaksi === 'PASANG_MANUAL') {
          // Selalu buat baris baru di Master Data Pasang Manual terhubung transaksiId
          await prisma.masterDataPasangManual.create({
            data: {
              transaksiId: d.id,
              lokasi: d.lokasi,
              wilayah: d.wilayah || 'AW01',
              tanggalPasangManual: d.tanggal || new Date(),
              diameter40: d.qtyD40 || 0,
              diameter60: d.qtyD60 || 0,
              diameter80: d.qtyD80 || 0,
              diameter100: d.qtyD100 || 0,
            },
          });
        }
      } catch (errMaster) {
        console.warn(`Failed to update master tables for ${d.lokasi}:`, errMaster);
      }
    }

    // 2. Sinkronisasi pembaruan kuantiti dan transisi prioritas otomatis ke tabel LokasiOrderGorongGorong
    for (const d of validatedData) {
      try {
        const tglStr = d.tanggal ? (typeof d.tanggal === 'string' ? d.tanggal : d.tanggal.toISOString().slice(0, 10)) : '-';

        // 1. Jika transaksi DROP memiliki Lokasi Asal (Pindah Lokasi antar petak):
        // Lokasi Asal (Pengirim) berkurang Drop-nya dan Pindah Lokasi bernilai minus (-)
        if (d.jenisTransaksi === 'DROP' && d.lokasiAsal) {
          const asalOrder = await prisma.lokasiOrderGorongGorong.findUnique({
            where: { lokasi: d.lokasiAsal },
          });

          if (asalOrder) {
            const asalUpdate: any = {};
            if (d.qtyD40 > 0) {
              asalUpdate.pindahD40 = ((asalOrder as any).pindahD40 || 0) - d.qtyD40;
              asalUpdate.dropD40 = (asalOrder.dropD40 || 0) - d.qtyD40;
            }
            if (d.qtyD60 > 0) {
              asalUpdate.pindahD60 = ((asalOrder as any).pindahD60 || 0) - d.qtyD60;
              asalUpdate.dropD60 = (asalOrder.dropD60 || 0) - d.qtyD60;
            }
            if (d.qtyD80 > 0) {
              asalUpdate.pindahD80 = ((asalOrder as any).pindahD80 || 0) - d.qtyD80;
              asalUpdate.dropD80 = (asalOrder.dropD80 || 0) - d.qtyD80;
            }
            if (d.qtyD100 > 0) {
              asalUpdate.pindahD100 = ((asalOrder as any).pindahD100 || 0) - d.qtyD100;
              asalUpdate.dropD100 = (asalOrder.dropD100 || 0) - d.qtyD100;
            }

            if (Object.keys(asalUpdate).length > 0) {
              await prisma.lokasiOrderGorongGorong.update({
                where: { lokasi: d.lokasiAsal },
                data: asalUpdate,
              });
            }
          } else {
            const masterLokasi = await prisma.masterStatusLokasi.findUnique({
              where: { lokasi: d.lokasiAsal },
            });
            const asalWil = masterLokasi?.strucPlant || 'AW01';
            await prisma.lokasiOrderGorongGorong.create({
              data: {
                lokasi: d.lokasiAsal,
                wilayah: asalWil,
                prioritas: '4',
                tanggalOrder: '-',
                statusAll: '-',
                dropD40: d.qtyD40 > 0 ? -d.qtyD40 : 0,
                pindahD40: d.qtyD40 > 0 ? -d.qtyD40 : 0,
                dropD60: d.qtyD60 > 0 ? -d.qtyD60 : 0,
                pindahD60: d.qtyD60 > 0 ? -d.qtyD60 : 0,
                dropD80: d.qtyD80 > 0 ? -d.qtyD80 : 0,
                pindahD80: d.qtyD80 > 0 ? -d.qtyD80 : 0,
                dropD100: d.qtyD100 > 0 ? -d.qtyD100 : 0,
                pindahD100: d.qtyD100 > 0 ? -d.qtyD100 : 0,
              },
            });
          }
        }

        // 2. Update Lokasi Tujuan (Penerima)
        const existingLokasiOrder = await prisma.lokasiOrderGorongGorong.findUnique({
          where: { lokasi: d.lokasi },
        });

        if (existingLokasiOrder) {
          const updateData: any = {};
          if (d.jenisTransaksi === 'DROP') {
            if (d.qtyD40 > 0) {
              updateData.dropD40 = (existingLokasiOrder.dropD40 || 0) + d.qtyD40;
              if (d.lokasiAsal) {
                updateData.pindahD40 = ((existingLokasiOrder as any).pindahD40 || 0) + d.qtyD40;
              }
              updateData.tglDropD40 = tglStr;
            }
            if (d.qtyD60 > 0) {
              updateData.dropD60 = (existingLokasiOrder.dropD60 || 0) + d.qtyD60;
              if (d.lokasiAsal) {
                updateData.pindahD60 = ((existingLokasiOrder as any).pindahD60 || 0) + d.qtyD60;
              }
            }
            if (d.qtyD80 > 0) {
              updateData.dropD80 = (existingLokasiOrder.dropD80 || 0) + d.qtyD80;
              if (d.lokasiAsal) {
                updateData.pindahD80 = ((existingLokasiOrder as any).pindahD80 || 0) + d.qtyD80;
              }
            }
            if (d.qtyD100 > 0) {
              updateData.dropD100 = (existingLokasiOrder.dropD100 || 0) + d.qtyD100;
              if (d.lokasiAsal) {
                updateData.pindahD100 = ((existingLokasiOrder as any).pindahD100 || 0) + d.qtyD100;
              }
            }

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
              pindahD40: (d.jenisTransaksi === 'DROP' && d.lokasiAsal) ? d.qtyD40 : 0,
              tglDropD40: d.jenisTransaksi === 'DROP' ? tglStr : null,
              pasangManD40: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD40 : 0,
              orderD60: d.jenisTransaksi === 'ORDER' ? d.qtyD60 : 0,
              dropD60: d.jenisTransaksi === 'DROP' ? d.qtyD60 : 0,
              pindahD60: (d.jenisTransaksi === 'DROP' && d.lokasiAsal) ? d.qtyD60 : 0,
              pasangManD60: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD60 : 0,
              orderD80: d.jenisTransaksi === 'ORDER' ? d.qtyD80 : 0,
              dropD80: d.jenisTransaksi === 'DROP' ? d.qtyD80 : 0,
              pindahD80: (d.jenisTransaksi === 'DROP' && d.lokasiAsal) ? d.qtyD80 : 0,
              pasangManD80: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD80 : 0,
              orderD100: d.jenisTransaksi === 'ORDER' ? d.qtyD100 : 0,
              dropD100: d.jenisTransaksi === 'DROP' ? d.qtyD100 : 0,
              pindahD100: (d.jenisTransaksi === 'DROP' && d.lokasiAsal) ? d.qtyD100 : 0,
              pasangManD100: d.jenisTransaksi === 'PASANG_MANUAL' ? d.qtyD100 : 0,
            },
          });
        }
      } catch (err) {
        console.warn(`Failed to sync LokasiOrderGorongGorong for ${d.lokasi}:`, err);
      }
    }

    // Sinkronisasi tabel database lokasiordergoronggorong agar selalu konsisten
    try {
      await syncLokasiOrderDatabase();
    } catch (syncErr) {
      console.warn('Warning syncing database after order transaction:', syncErr);
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

// Helper: Revert dampak kuantiti transaksi lama pada MasterData & LokasiOrder
export async function revertTransactionImpact(existing: any) {
  try {
    if (existing.jenisTransaksi === 'ORDER') {
      let deleted = false;
      if (existing.id) {
        const delRes = await prisma.masterDataOrderGorongGorong.deleteMany({
          where: { transaksiId: existing.id },
        });
        if (delRes.count > 0) deleted = true;
      }

      if (!deleted) {
        const exactOrder = await prisma.masterDataOrderGorongGorong.findFirst({
          where: {
            lokasi: existing.lokasi,
            diameter40: existing.qtyD40 || 0,
            diameter60: existing.qtyD60 || 0,
            diameter80: existing.qtyD80 || 0,
            diameter100: existing.qtyD100 || 0,
          },
          orderBy: { id: 'desc' },
        });

        if (exactOrder) {
          await prisma.masterDataOrderGorongGorong.delete({
            where: { id: exactOrder.id },
          });
        } else {
          const masterOrd = await prisma.masterDataOrderGorongGorong.findFirst({
            where: { lokasi: existing.lokasi },
            orderBy: { id: 'desc' },
          });
          if (masterOrd) {
            const rem40 = Math.max(0, (masterOrd.diameter40 || 0) - (existing.qtyD40 || 0));
            const rem60 = Math.max(0, (masterOrd.diameter60 || 0) - (existing.qtyD60 || 0));
            const rem80 = Math.max(0, (masterOrd.diameter80 || 0) - (existing.qtyD80 || 0));
            const rem100 = Math.max(0, (masterOrd.diameter100 || 0) - (existing.qtyD100 || 0));
            if (rem40 === 0 && rem60 === 0 && rem80 === 0 && rem100 === 0) {
              await prisma.masterDataOrderGorongGorong.delete({
                where: { id: masterOrd.id },
              });
            } else {
              await prisma.masterDataOrderGorongGorong.update({
                where: { id: masterOrd.id },
                data: {
                  diameter40: rem40,
                  diameter60: rem60,
                  diameter80: rem80,
                  diameter100: rem100,
                },
              });
            }
          }
        }
      }
    } else if (existing.jenisTransaksi === 'DROP') {
      // 1. Revert Lokasi Asal jika transfer DROP & hapus catatan di MasterDataPindahGorongGorong
      if (existing.lokasiAsal) {
        if (existing.id) {
          await prisma.masterDataPindahGorongGorong.deleteMany({
            where: { transaksiId: existing.id },
          });
        }

        const matchingPindah = await prisma.masterDataPindahGorongGorong.findFirst({
          where: {
            lokasiPengirim: existing.lokasiAsal,
            lokasiPenerima: existing.lokasi,
          },
          orderBy: { id: 'desc' },
        });
        if (matchingPindah) {
          await prisma.masterDataPindahGorongGorong.delete({
            where: { id: matchingPindah.id },
          });
        }

        const asalDrop = await prisma.masterDataDropGorongGorong.findFirst({
          where: { lokasi: existing.lokasiAsal },
          orderBy: { tanggal: 'desc' },
        });
        if (asalDrop) {
          await prisma.masterDataDropGorongGorong.update({
            where: { id: asalDrop.id },
            data: {
              diameter40: (asalDrop.diameter40 || 0) + (existing.qtyD40 || 0),
              diameter60: (asalDrop.diameter60 || 0) + (existing.qtyD60 || 0),
              diameter80: (asalDrop.diameter80 || 0) + (existing.qtyD80 || 0),
              diameter100: (asalDrop.diameter100 || 0) + (existing.qtyD100 || 0),
            },
          });
        }
      }

      // 2. Revert Lokasi Tujuan: hapus baris yang dibuat oleh transaksi form input
      let deletedDrop = false;
      if (existing.id) {
        const delRes = await prisma.masterDataDropGorongGorong.deleteMany({
          where: { transaksiId: existing.id },
        });
        if (delRes.count > 0) deletedDrop = true;
      }

      if (!deletedDrop) {
        const exactDrop = await prisma.masterDataDropGorongGorong.findFirst({
          where: {
            lokasi: existing.lokasi,
            diameter40: existing.qtyD40 || 0,
            diameter60: existing.qtyD60 || 0,
            diameter80: existing.qtyD80 || 0,
            diameter100: existing.qtyD100 || 0,
          },
          orderBy: { id: 'desc' },
        });

        if (exactDrop) {
          await prisma.masterDataDropGorongGorong.delete({
            where: { id: exactDrop.id },
          });
        } else {
          const destDrop = await prisma.masterDataDropGorongGorong.findFirst({
            where: { lokasi: existing.lokasi },
            orderBy: { tanggal: 'desc' },
          });
          if (destDrop) {
            const rem40 = Math.max(0, (destDrop.diameter40 || 0) - (existing.qtyD40 || 0));
            const rem60 = Math.max(0, (destDrop.diameter60 || 0) - (existing.qtyD60 || 0));
            const rem80 = Math.max(0, (destDrop.diameter80 || 0) - (existing.qtyD80 || 0));
            const rem100 = Math.max(0, (destDrop.diameter100 || 0) - (existing.qtyD100 || 0));
            if (rem40 === 0 && rem60 === 0 && rem80 === 0 && rem100 === 0) {
              await prisma.masterDataDropGorongGorong.delete({
                where: { id: destDrop.id },
              });
            } else {
              await prisma.masterDataDropGorongGorong.update({
                where: { id: destDrop.id },
                data: {
                  diameter40: rem40,
                  diameter60: rem60,
                  diameter80: rem80,
                  diameter100: rem100,
                },
              });
            }
          }
        }
      }
    } else if (existing.jenisTransaksi === 'PASANG_MANUAL') {
      let deletedPasang = false;
      if (existing.id) {
        const delRes = await prisma.masterDataPasangManual.deleteMany({
          where: { transaksiId: existing.id },
        });
        if (delRes.count > 0) deletedPasang = true;
      }

      if (!deletedPasang) {
        const exactPasang = await prisma.masterDataPasangManual.findFirst({
          where: {
            lokasi: existing.lokasi,
            diameter40: existing.qtyD40 || 0,
            diameter60: existing.qtyD60 || 0,
            diameter80: existing.qtyD80 || 0,
            diameter100: existing.qtyD100 || 0,
          },
          orderBy: { id: 'desc' },
        });

        if (exactPasang) {
          await prisma.masterDataPasangManual.delete({
            where: { id: exactPasang.id },
          });
        } else {
          const existingPasang = await prisma.masterDataPasangManual.findFirst({
            where: { lokasi: existing.lokasi },
            orderBy: { tanggalPasangManual: 'desc' },
          });
          if (existingPasang) {
            const rem40 = Math.max(0, (existingPasang.diameter40 || 0) - (existing.qtyD40 || 0));
            const rem60 = Math.max(0, (existingPasang.diameter60 || 0) - (existing.qtyD60 || 0));
            const rem80 = Math.max(0, (existingPasang.diameter80 || 0) - (existing.qtyD80 || 0));
            const rem100 = Math.max(0, (existingPasang.diameter100 || 0) - (existing.qtyD100 || 0));
            if (rem40 === 0 && rem60 === 0 && rem80 === 0 && rem100 === 0) {
              await prisma.masterDataPasangManual.delete({
                where: { id: existingPasang.id },
              });
            } else {
              await prisma.masterDataPasangManual.update({
                where: { id: existingPasang.id },
                data: {
                  diameter40: rem40,
                  diameter60: rem60,
                  diameter80: rem80,
                  diameter100: rem100,
                },
              });
            }
          }
        }
      }
    }

    // Jika lokasi bukan lokasi resmi di MasterStatusLokasi, bersihkan seluruh sisa data yatim
    const isOfficial = await prisma.masterStatusLokasi.findUnique({
      where: { lokasi: existing.lokasi },
    });
    if (!isOfficial) {
      await prisma.masterDataDropGorongGorong.deleteMany({ where: { lokasi: existing.lokasi } });
      await prisma.masterDataOrderGorongGorong.deleteMany({ where: { lokasi: existing.lokasi } });
      await prisma.masterDataPasangManual.deleteMany({ where: { lokasi: existing.lokasi } });
      await prisma.masterDataPindahGorongGorong.deleteMany({
        where: { OR: [{ lokasiPengirim: existing.lokasi }, { lokasiPenerima: existing.lokasi }] },
      });
      await prisma.lokasiOrderGorongGorong.deleteMany({ where: { lokasi: existing.lokasi } });
    }
  } catch (err) {
    console.warn('Failed to revert MasterData:', err);
  }

  // Revert perubahan kuantiti pada tabel LokasiOrderGorongGorong
  try {
    if (existing.jenisTransaksi === 'DROP' && existing.lokasiAsal) {
      const asalOrder = await prisma.lokasiOrderGorongGorong.findUnique({
        where: { lokasi: existing.lokasiAsal },
      });
      if (asalOrder) {
        const asalRevert: any = {};
        if (existing.qtyD40 > 0) {
          asalRevert.pindahD40 = ((asalOrder as any).pindahD40 || 0) + existing.qtyD40;
          asalRevert.dropD40 = (asalOrder.dropD40 || 0) + existing.qtyD40;
        }
        if (existing.qtyD60 > 0) {
          asalRevert.pindahD60 = ((asalOrder as any).pindahD60 || 0) + existing.qtyD60;
          asalRevert.dropD60 = (asalOrder.dropD60 || 0) + existing.qtyD60;
        }
        if (existing.qtyD80 > 0) {
          asalRevert.pindahD80 = ((asalOrder as any).pindahD80 || 0) + existing.qtyD80;
          asalRevert.dropD80 = (asalOrder.dropD80 || 0) + existing.qtyD80;
        }
        if (existing.qtyD100 > 0) {
          asalRevert.pindahD100 = ((asalOrder as any).pindahD100 || 0) + existing.qtyD100;
          asalRevert.dropD100 = (asalOrder.dropD100 || 0) + existing.qtyD100;
        }
        if (Object.keys(asalRevert).length > 0) {
          await prisma.lokasiOrderGorongGorong.update({
            where: { lokasi: existing.lokasiAsal },
            data: asalRevert,
          });
        }
      }
    }

    const destOrder = await prisma.lokasiOrderGorongGorong.findUnique({
      where: { lokasi: existing.lokasi },
    });
    if (destOrder) {
      const destRevert: any = {};
      if (existing.jenisTransaksi === 'DROP') {
        if (existing.qtyD40 > 0) {
          destRevert.dropD40 = Math.max(0, (destOrder.dropD40 || 0) - existing.qtyD40);
          if (existing.lokasiAsal) {
            destRevert.pindahD40 = ((destOrder as any).pindahD40 || 0) - existing.qtyD40;
          }
        }
        if (existing.qtyD60 > 0) {
          destRevert.dropD60 = Math.max(0, (destOrder.dropD60 || 0) - existing.qtyD60);
          if (existing.lokasiAsal) {
            destRevert.pindahD60 = ((destOrder as any).pindahD60 || 0) - existing.qtyD60;
          }
        }
        if (existing.qtyD80 > 0) {
          destRevert.dropD80 = Math.max(0, (destOrder.dropD80 || 0) - existing.qtyD80);
          if (existing.lokasiAsal) {
            destRevert.pindahD80 = ((destOrder as any).pindahD80 || 0) - existing.qtyD80;
          }
        }
        if (existing.qtyD100 > 0) {
          destRevert.dropD100 = Math.max(0, (destOrder.dropD100 || 0) - existing.qtyD100);
          if (existing.lokasiAsal) {
            destRevert.pindahD100 = ((destOrder as any).pindahD100 || 0) - existing.qtyD100;
          }
        }
      } else if (existing.jenisTransaksi === 'ORDER') {
        if (existing.qtyD40 > 0) destRevert.orderD40 = Math.max(0, (destOrder.orderD40 || 0) - existing.qtyD40);
        if (existing.qtyD60 > 0) destRevert.orderD60 = Math.max(0, (destOrder.orderD60 || 0) - existing.qtyD60);
        if (existing.qtyD80 > 0) destRevert.orderD80 = Math.max(0, (destOrder.orderD80 || 0) - existing.qtyD80);
        if (existing.qtyD100 > 0) destRevert.orderD100 = Math.max(0, (destOrder.orderD100 || 0) - existing.qtyD100);
      } else if (existing.jenisTransaksi === 'PASANG_MANUAL') {
        if (existing.qtyD40 > 0) destRevert.pasangManD40 = Math.max(0, (destOrder.pasangManD40 || 0) - existing.qtyD40);
        if (existing.qtyD60 > 0) destRevert.pasangManD60 = Math.max(0, (destOrder.pasangManD60 || 0) - existing.qtyD60);
        if (existing.qtyD80 > 0) destRevert.pasangManD80 = Math.max(0, (destOrder.pasangManD80 || 0) - existing.qtyD80);
        if (existing.qtyD100 > 0) destRevert.pasangManD100 = Math.max(0, (destOrder.pasangManD100 || 0) - existing.qtyD100);
      }

      if (Object.keys(destRevert).length > 0) {
        await prisma.lokasiOrderGorongGorong.update({
          where: { lokasi: existing.lokasi },
          data: destRevert,
        });
      }
    }
  } catch (err) {
    console.warn('Failed to revert LokasiOrderGorongGorong:', err);
  }
}

// Helper: Terapkan dampak kuantiti transaksi baru pada MasterData & LokasiOrder
async function applyTransactionImpact(d: {
  transaksiId?: number;
  lokasi: string;
  lokasiAsal?: string | null;
  wilayah?: string | null;
  jenisTransaksi: string;
  tanggal: Date;
  qtyD40: number;
  qtyD60: number;
  qtyD80: number;
  qtyD100: number;
  keterangan?: string | null;
}) {
  try {
    if (d.jenisTransaksi === 'ORDER') {
      await prisma.masterDataOrderGorongGorong.create({
        data: {
          transaksiId: d.transaksiId || null,
          lokasi: d.lokasi,
          wilayah: d.wilayah || 'AW01',
          tanggal: d.tanggal || new Date(),
          diameter40: d.qtyD40 || 0,
          diameter60: d.qtyD60 || 0,
          diameter80: d.qtyD80 || 0,
          diameter100: d.qtyD100 || 0,
        },
      });
    } else if (d.jenisTransaksi === 'DROP') {
      if (d.lokasiAsal) {
        let asalWil = null;
        const mAsal = await prisma.masterStatusLokasi.findUnique({
          where: { lokasi: d.lokasiAsal },
        });
        asalWil = mAsal?.strucPlant || 'AW01';

        await prisma.masterDataPindahGorongGorong.create({
          data: {
            transaksiId: d.transaksiId || null,
            lokasiPengirim: d.lokasiAsal,
            wilayahPengirim: asalWil,
            lokasiPenerima: d.lokasi,
            wilayahPenerima: d.wilayah || 'AW01',
            tanggal: d.tanggal || new Date(),
            diameter40: d.qtyD40 || 0,
            diameter60: d.qtyD60 || 0,
            diameter80: d.qtyD80 || 0,
            diameter100: d.qtyD100 || 0,
            keterangan: d.keterangan || null,
          },
        });

        const existingDropAsal = await prisma.masterDataDropGorongGorong.findFirst({
          where: { lokasi: d.lokasiAsal },
          orderBy: { tanggal: 'desc' },
        });
        if (existingDropAsal) {
          const rem40 = Math.max(0, (existingDropAsal.diameter40 || 0) - (d.qtyD40 || 0));
          const rem60 = Math.max(0, (existingDropAsal.diameter60 || 0) - (d.qtyD60 || 0));
          const rem80 = Math.max(0, (existingDropAsal.diameter80 || 0) - (d.qtyD80 || 0));
          const rem100 = Math.max(0, (existingDropAsal.diameter100 || 0) - (d.qtyD100 || 0));
          if (rem40 === 0 && rem60 === 0 && rem80 === 0 && rem100 === 0) {
            await prisma.masterDataDropGorongGorong.delete({
              where: { id: existingDropAsal.id },
            });
          } else {
            await prisma.masterDataDropGorongGorong.update({
              where: { id: existingDropAsal.id },
              data: {
                diameter40: rem40,
                diameter60: rem60,
                diameter80: rem80,
                diameter100: rem100,
              },
            });
          }
        }
      }

      await prisma.masterDataDropGorongGorong.create({
        data: {
          transaksiId: d.transaksiId || null,
          lokasi: d.lokasi,
          wilayah: d.wilayah || 'AW01',
          tanggal: d.tanggal || new Date(),
          diameter40: d.qtyD40 || 0,
          diameter60: d.qtyD60 || 0,
          diameter80: d.qtyD80 || 0,
          diameter100: d.qtyD100 || 0,
        },
      });
    } else if (d.jenisTransaksi === 'PASANG_MANUAL') {
      await prisma.masterDataPasangManual.create({
        data: {
          transaksiId: d.transaksiId || null,
          lokasi: d.lokasi,
          wilayah: d.wilayah || 'AW01',
          tanggalPasangManual: d.tanggal || new Date(),
          diameter40: d.qtyD40 || 0,
          diameter60: d.qtyD60 || 0,
          diameter80: d.qtyD80 || 0,
          diameter100: d.qtyD100 || 0,
        },
      });
    }
  } catch (errMaster) {
    console.warn(`Failed to update master tables for ${d.lokasi}:`, errMaster);
  }

  // Update LokasiOrderGorongGorong
  try {
    if (d.jenisTransaksi === 'DROP' && d.lokasiAsal) {
      const asalOrder = await prisma.lokasiOrderGorongGorong.findUnique({
        where: { lokasi: d.lokasiAsal },
      });
      if (asalOrder) {
        const asalUpdate: any = {};
        if (d.qtyD40 > 0) {
          asalUpdate.pindahD40 = ((asalOrder as any).pindahD40 || 0) - d.qtyD40;
          asalUpdate.dropD40 = (asalOrder.dropD40 || 0) - d.qtyD40;
        }
        if (d.qtyD60 > 0) {
          asalUpdate.pindahD60 = ((asalOrder as any).pindahD60 || 0) - d.qtyD60;
          asalUpdate.dropD60 = (asalOrder.dropD60 || 0) - d.qtyD60;
        }
        if (d.qtyD80 > 0) {
          asalUpdate.pindahD80 = ((asalOrder as any).pindahD80 || 0) - d.qtyD80;
          asalUpdate.dropD80 = (asalOrder.dropD80 || 0) - d.qtyD80;
        }
        if (d.qtyD100 > 0) {
          asalUpdate.pindahD100 = ((asalOrder as any).pindahD100 || 0) - d.qtyD100;
          asalUpdate.dropD100 = (asalOrder.dropD100 || 0) - d.qtyD100;
        }
        if (Object.keys(asalUpdate).length > 0) {
          await prisma.lokasiOrderGorongGorong.update({
            where: { lokasi: d.lokasiAsal },
            data: asalUpdate,
          });
        }
      }
    }

    const destOrder = await prisma.lokasiOrderGorongGorong.findUnique({
      where: { lokasi: d.lokasi },
    });
    if (destOrder) {
      const destUpdate: any = {};
      if (d.jenisTransaksi === 'DROP') {
        if (d.qtyD40 > 0) {
          destUpdate.dropD40 = (destOrder.dropD40 || 0) + d.qtyD40;
          if (d.lokasiAsal) destUpdate.pindahD40 = ((destOrder as any).pindahD40 || 0) + d.qtyD40;
        }
        if (d.qtyD60 > 0) {
          destUpdate.dropD60 = (destOrder.dropD60 || 0) + d.qtyD60;
          if (d.lokasiAsal) destUpdate.pindahD60 = ((destOrder as any).pindahD60 || 0) + d.qtyD60;
        }
        if (d.qtyD80 > 0) {
          destUpdate.dropD80 = (destOrder.dropD80 || 0) + d.qtyD80;
          if (d.lokasiAsal) destUpdate.pindahD80 = ((destOrder as any).pindahD80 || 0) + d.qtyD80;
        }
        if (d.qtyD100 > 0) {
          destUpdate.dropD100 = (destOrder.dropD100 || 0) + d.qtyD100;
          if (d.lokasiAsal) destUpdate.pindahD100 = ((destOrder as any).pindahD100 || 0) + d.qtyD100;
        }
      } else if (d.jenisTransaksi === 'ORDER') {
        if (d.qtyD40 > 0) destUpdate.orderD40 = (destOrder.orderD40 || 0) + d.qtyD40;
        if (d.qtyD60 > 0) destUpdate.orderD60 = (destOrder.orderD60 || 0) + d.qtyD60;
        if (d.qtyD80 > 0) destUpdate.orderD80 = (destOrder.orderD80 || 0) + d.qtyD80;
        if (d.qtyD100 > 0) destUpdate.orderD100 = (destOrder.orderD100 || 0) + d.qtyD100;
      } else if (d.jenisTransaksi === 'PASANG_MANUAL') {
        if (d.qtyD40 > 0) destUpdate.pasangManD40 = (destOrder.pasangManD40 || 0) + d.qtyD40;
        if (d.qtyD60 > 0) destUpdate.pasangManD60 = (destOrder.pasangManD60 || 0) + d.qtyD60;
        if (d.qtyD80 > 0) destUpdate.pasangManD80 = (destOrder.pasangManD80 || 0) + d.qtyD80;
        if (d.qtyD100 > 0) destUpdate.pasangManD100 = (destOrder.pasangManD100 || 0) + d.qtyD100;
      }

      if (Object.keys(destUpdate).length > 0) {
        await prisma.lokasiOrderGorongGorong.update({
          where: { lokasi: d.lokasi },
          data: destUpdate,
        });
      }
    }
  } catch (err) {
    console.warn(`Failed to update LokasiOrderGorongGorong for ${d.lokasi}:`, err);
  }
}

// PUT: Edit transaksi riwayat gorong-gorong (Khusus Admin / Super Admin)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = parseInt(String(body.id || '0'), 10);

    if (!id || id <= 0) {
      return NextResponse.json({ success: false, message: 'ID transaksi tidak valid.' }, { status: 400 });
    }

    const existing = await prisma.transaksiGorongGorong.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Data transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    // Jenis Transaksi & Lokasi Baru
    const rawJenis = String(body.jenisTransaksi || existing.jenisTransaksi || 'ORDER').toUpperCase().trim();
    const isPindah = rawJenis === 'PINDAH_LOKASI' || (rawJenis === 'DROP' && !!body.lokasiAsal);
    const cleanJenis = isPindah ? 'DROP' : rawJenis;

    const cleanLokasi = String(body.lokasi || existing.lokasi || '').trim().toUpperCase();
    const cleanLokasiAsal = isPindah && body.lokasiAsal ? String(body.lokasiAsal).trim().toUpperCase() : null;

    if (!cleanLokasi) {
      return NextResponse.json(
        { success: false, message: 'Lokasi tujuan tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // Validasi ketat: Lokasi wajib terdaftar resmi di MasterStatusLokasi
    const mLoc = await prisma.masterStatusLokasi.findUnique({
      where: { lokasi: cleanLokasi },
    });

    if (!mLoc) {
      return NextResponse.json(
        {
          success: false,
          message: `Lokasi '${cleanLokasi}' tidak valid atau tidak terdaftar di Master Status Lokasi! Harap gunakan lokasi resmi yang berawalan angka 0 (contoh: 085C).`,
        },
        { status: 400 }
      );
    }

    let asalWil: string | null = null;
    if (cleanLokasiAsal) {
      const mAsal = await prisma.masterStatusLokasi.findUnique({
        where: { lokasi: cleanLokasiAsal },
      });
      if (!mAsal) {
        return NextResponse.json(
          {
            success: false,
            message: `Lokasi Asal '${cleanLokasiAsal}' tidak valid atau tidak terdaftar di Master Status Lokasi!`,
          },
          { status: 400 }
        );
      }
      asalWil = mAsal.strucPlant || 'AW01';
    }

    const autoWil = mLoc.strucPlant || body.wilayah || existing.wilayah || 'AW01';

    // Verifikasi hak akses wilayah di sisi server untuk edit transaksi
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    let sessionUser: any = null;
    if (match) {
      try {
        sessionUser = JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {}
    }

    const isPrivileged = sessionUser && ['admin', 'super_admin', 'kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'].includes(sessionUser.role);
    const userWilayah = sessionUser?.wilayah && sessionUser.wilayah !== 'ALL' ? sessionUser.wilayah.trim().toUpperCase() : null;

    if (!isPrivileged && userWilayah) {
      if (autoWil && autoWil.toUpperCase() !== userWilayah) {
        return NextResponse.json(
          {
            success: false,
            message: `Akses Ditolak: Lokasi '${cleanLokasi}' (${autoWil}) berada di luar wilayah tugas resmi Anda (${userWilayah}).`,
          },
          { status: 403 }
        );
      }
      if (cleanLokasiAsal && asalWil && asalWil.toUpperCase() !== userWilayah) {
        return NextResponse.json(
          {
            success: false,
            message: `Akses Ditolak: Lokasi asal '${cleanLokasiAsal}' (${asalWil}) berada di luar wilayah tugas resmi Anda (${userWilayah}).`,
          },
          { status: 403 }
        );
      }
    }

    // Hitung kuantiti baru (0 - 999)
    const newQtyD40 = body.qtyD40 !== undefined ? Math.max(0, Math.min(999, Math.round(Number(body.qtyD40) || 0))) : existing.qtyD40;
    const newQtyD60 = body.qtyD60 !== undefined ? Math.max(0, Math.min(999, Math.round(Number(body.qtyD60) || 0))) : existing.qtyD60;
    const newQtyD80 = body.qtyD80 !== undefined ? Math.max(0, Math.min(999, Math.round(Number(body.qtyD80) || 0))) : existing.qtyD80;
    const newQtyD100 = body.qtyD100 !== undefined ? Math.max(0, Math.min(999, Math.round(Number(body.qtyD100) || 0))) : existing.qtyD100;

    if (newQtyD40 === 0 && newQtyD60 === 0 && newQtyD80 === 0 && newQtyD100 === 0) {
      return NextResponse.json(
        { success: false, message: 'Minimal salah satu diameter (Ø40, Ø60, Ø80, Ø100) harus lebih dari 0.' },
        { status: 400 }
      );
    }

    const trxDate = body.tanggal ? new Date(body.tanggal) : existing.tanggal;

    // 1. Batalkan/Revert dampak transaksi lama
    await revertTransactionImpact(existing);

    // 2. Terapkan dampak transaksi baru
    await applyTransactionImpact({
      transaksiId: id,
      lokasi: cleanLokasi,
      lokasiAsal: cleanLokasiAsal,
      wilayah: autoWil,
      jenisTransaksi: cleanJenis,
      tanggal: isNaN(trxDate.getTime()) ? existing.tanggal : trxDate,
      qtyD40: newQtyD40,
      qtyD60: newQtyD60,
      qtyD80: newQtyD80,
      qtyD100: newQtyD100,
    });

    // 3. Update data pada record TransaksiGorongGorong
    const updated = await prisma.transaksiGorongGorong.update({
      where: { id },
      data: {
        jenisTransaksi: cleanJenis,
        lokasi: cleanLokasi,
        lokasiAsal: cleanLokasiAsal,
        lokasiTujuan: cleanLokasi,
        wilayah: autoWil,
        qtyD40: newQtyD40,
        qtyD60: newQtyD60,
        qtyD80: newQtyD80,
        qtyD100: newQtyD100,
        tanggal: isNaN(trxDate.getTime()) ? existing.tanggal : trxDate,
      },
    });

    try {
      await syncLokasiOrderDatabase();
    } catch (syncErr) {
      console.warn('Warning syncing database after edit transaction:', syncErr);
    }

    return NextResponse.json({
      success: true,
      message: `Transaksi ${cleanJenis} lokasi ${cleanLokasi} berhasil diperbarui.`,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui transaksi', error: error.message },
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

    // Verifikasi hak akses wilayah di sisi server untuk delete transaksi
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/ggf_session=([^;]+)/);
    let sessionUser: any = null;
    if (match) {
      try {
        sessionUser = JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {}
    }

    const isPrivileged = sessionUser && ['admin', 'super_admin', 'kepala_bagian_fe', 'manajer_fe', 'manajer_fm', 'manajer_osd'].includes(sessionUser.role);
    const userWilayah = sessionUser?.wilayah && sessionUser.wilayah !== 'ALL' ? sessionUser.wilayah.trim().toUpperCase() : null;

    if (!isPrivileged && userWilayah) {
      if (existing.wilayah && existing.wilayah.toUpperCase() !== userWilayah) {
        return NextResponse.json(
          {
            success: false,
            message: `Akses Ditolak: Anda tidak dapat menghapus transaksi di wilayah ${existing.wilayah} karena wilayah tugas Anda adalah ${userWilayah}.`,
          },
          { status: 403 }
        );
      }
    }

    // Revert dampak pada MasterData dan LokasiOrder
    await revertTransactionImpact(existing);

    await prisma.transaksiGorongGorong.delete({
      where: { id },
    });

    try {
      await syncLokasiOrderDatabase();
    } catch (syncErr) {
      console.warn('Warning syncing database after delete transaction:', syncErr);
    }

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
