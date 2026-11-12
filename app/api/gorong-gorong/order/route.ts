import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncLokasiOrderDatabase } from '@/lib/gorongGorongSyncService';

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
        lokasiAsal: it.lokasiAsal || null,
        lokasiTujuan: cleanLokasi,
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

    // Revert perubahan kuantiti pada tabel LokasiOrderGorongGorong jika ada
    try {
      // 1. Revert Lokasi Asal jika transfer DROP
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

      // 2. Revert Lokasi Tujuan
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
      console.warn('Failed to revert LokasiOrderGorongGorong on delete:', err);
    }

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
