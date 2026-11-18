import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    // Gunakan rentang waktu hari ini WIB (UTC+7)
    const utcOffsetMs = 7 * 60 * 60 * 1000;
    const wibNow = new Date(now.getTime() + utcOffsetMs);
    const yyyy = wibNow.getUTCFullYear();
    const mm = wibNow.getUTCMonth();
    const dd = wibNow.getUTCDate();

    const startOfDay = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0, 0) - utcOffsetMs);
    const endOfDay = new Date(Date.UTC(yyyy, mm, dd, 23, 59, 59, 999) - utcOffsetMs);

    const transactions = await prisma.transaksiGorongGorong.findMany({
      where: {
        jenisTransaksi: { in: ['DROP', 'PASANG_MANUAL'] },
        tanggal: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { id: 'desc' },
    });

    // 1. Hitung total Drop per Diameter
    const dropItems = transactions.filter((t) => t.jenisTransaksi === 'DROP');
    const dropD40 = dropItems.reduce((acc, t) => acc + (t.qtyD40 || 0), 0);
    const dropD60 = dropItems.reduce((acc, t) => acc + (t.qtyD60 || 0), 0);
    const dropD80 = dropItems.reduce((acc, t) => acc + (t.qtyD80 || 0), 0);
    const dropD100 = dropItems.reduce((acc, t) => acc + (t.qtyD100 || 0), 0);
    const dropTotal = dropD40 + dropD60 + dropD80 + dropD100;

    // 2. Hitung total Pasang Manual per Diameter
    const pasangItems = transactions.filter((t) => t.jenisTransaksi === 'PASANG_MANUAL');
    const pasangD40 = pasangItems.reduce((acc, t) => acc + (t.qtyD40 || 0), 0);
    const pasangD60 = pasangItems.reduce((acc, t) => acc + (t.qtyD60 || 0), 0);
    const pasangD80 = pasangItems.reduce((acc, t) => acc + (t.qtyD80 || 0), 0);
    const pasangD100 = pasangItems.reduce((acc, t) => acc + (t.qtyD100 || 0), 0);
    const pasangTotal = pasangD40 + pasangD60 + pasangD80 + pasangD100;

    // 3. Hitung Realisasi Hari Ini per Wilayah (AW01 sampai AW07)
    const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];
    const wilayahBarData = WILAYAH_LIST.map((w) => {
      const dropCount = transactions
        .filter((t) => t.jenisTransaksi === 'DROP' && t.wilayah === w)
        .reduce((acc, t) => acc + (t.qtyD40 || 0) + (t.qtyD60 || 0) + (t.qtyD80 || 0) + (t.qtyD100 || 0), 0);
      const pasangCount = transactions
        .filter((t) => t.jenisTransaksi === 'PASANG_MANUAL' && t.wilayah === w)
        .reduce((acc, t) => acc + (t.qtyD40 || 0) + (t.qtyD60 || 0) + (t.qtyD80 || 0) + (t.qtyD100 || 0), 0);

      return {
        wilayah: w,
        drop: dropCount,
        pasangManual: pasangCount,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        dropSummary: {
          d40: dropD40,
          d60: dropD60,
          d80: dropD80,
          d100: dropD100,
          total: dropTotal,
          chartData: [
            { name: 'Ø40', diameter: '40', value: dropD40, color: '#10B981' },
            { name: 'Ø60', diameter: '60', value: dropD60, color: '#3B82F6' },
            { name: 'Ø80', diameter: '80', value: dropD80, color: '#F59E0B' },
            { name: 'Ø100', diameter: '100', value: dropD100, color: '#8B5CF6' },
          ].filter((d) => d.value > 0),
        },
        pasangSummary: {
          d40: pasangD40,
          d60: pasangD60,
          d80: pasangD80,
          d100: pasangD100,
          total: pasangTotal,
          chartData: [
            { name: 'Ø40', diameter: '40', value: pasangD40, color: '#10B981' },
            { name: 'Ø60', diameter: '60', value: pasangD60, color: '#3B82F6' },
            { name: 'Ø80', diameter: '80', value: pasangD80, color: '#F59E0B' },
            { name: 'Ø100', diameter: '100', value: pasangD100, color: '#8B5CF6' },
          ].filter((d) => d.value > 0),
        },
        wilayahBarData,
      },
    });
  } catch (error: any) {
    console.error('Error fetching realisasi harian gorong-gorong:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memuat data realisasi harian: ' + error.message },
      { status: 500 }
    );
  }
}
