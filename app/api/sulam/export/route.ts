import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const today = new Date();

    const [masterLocations, allOrders, allDrops, allReals] = await Promise.all([
      prisma.masterStatusLokasi.findMany({
        orderBy: [{ strucPlant: 'asc' }, { lokasi: 'asc' }],
      }),
      prisma.masterDataOrderSulam.findMany({
        orderBy: [{ tanggalOrder: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterDataDropBibitSulam.findMany({
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
      prisma.masterDataRealSulam.findMany({
        orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
      }),
    ]);

    const orderMap = new Map<string, any>();
    for (const ord of allOrders) {
      const lok = ord.lokasi.trim().toUpperCase();
      if (!orderMap.has(lok)) orderMap.set(lok, ord);
    }

    const dropMap = new Map<string, number>();
    for (const drp of allDrops) {
      const lok = drp.lokasi.trim().toUpperCase();
      if (drp.statusDrop === 'V') {
        const cur = dropMap.get(lok) || 0;
        dropMap.set(lok, cur + (drp.jumlahRit || 0));
      }
    }

    const realMap = new Map<string, { totalRitPlanted: number; lastDate: Date | null }>();
    for (const rel of allReals) {
      const lok = rel.lokasi.trim().toUpperCase();
      if (!realMap.has(lok)) realMap.set(lok, { totalRitPlanted: 0, lastDate: null });
      const ent = realMap.get(lok)!;
      ent.totalRitPlanted += (rel.ritPlanted || 0);
      if (rel.tanggal && (!ent.lastDate || rel.tanggal > ent.lastDate)) {
        ent.lastDate = rel.tanggal;
      }
    }

    const exportRows = masterLocations.map((mLoc, idx) => {
      const cleanLok = mLoc.lokasi.trim().toUpperCase();
      const ord = orderMap.get(cleanLok);
      const drpRealRit = dropMap.get(cleanLok) || 0;
      const relData = realMap.get(cleanLok) || { totalRitPlanted: 0, lastDate: null };

      // 1. Wilayah
      const wil = mLoc.strucPlant || ord?.wilayah || 'AW01';

      // 2. Lokasi
      const lok = mLoc.lokasi;

      // 3. Jenis Bibit
      const jenisBibit = mLoc.jenis || '-';

      // 4. Kelas Bibit
      const kelasBibit = mLoc.kelas || '-';

      // 5. Tanggal Rawat
      const tglRawatStr = mLoc.tglRawat ? mLoc.tglRawat.toISOString().slice(0, 10) : '-';

      // 6. Tanggal STD Forcing
      const tglStdForcingStr = mLoc.forcingStd ? mLoc.forcingStd.toISOString().slice(0, 10) : '-';

      // 7. Tanggal F Prod
      const tglFProdStr = mLoc.forcingProd2026 ? mLoc.forcingProd2026.toISOString().slice(0, 10) : '-';

      // 8. Tanggal F Max
      let tglFMaxDate: Date | null = null;
      if (mLoc.forcingStd && mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingStd.getTime() >= mLoc.forcingProd2026.getTime() ? mLoc.forcingStd : mLoc.forcingProd2026;
      } else if (mLoc.forcingStd) {
        tglFMaxDate = mLoc.forcingStd;
      } else if (mLoc.forcingProd2026) {
        tglFMaxDate = mLoc.forcingProd2026;
      }
      const tglFMaxStr = tglFMaxDate ? tglFMaxDate.toISOString().slice(0, 10) : '-';

      // 9. Tanggal Order
      const tglOrderStr = ord?.tanggalOrder ? new Date(ord.tanggalOrder).toISOString().slice(0, 10) : '-';

      // 10. Umur Forcing
      let umurForcing: number | string = '-';
      if (tglFMaxDate) {
        const diffDays = (today.getTime() - tglFMaxDate.getTime()) / (1000 * 60 * 60 * 24);
        umurForcing = Math.round(diffDays / 30.4);
      }

      // 11. Permintaan Ritase
      const permintaanJumlah = ord?.jumlah ?? 0;
      const permintaanRit = ord?.rit ?? 0;
      const permintaanRealRit = ord?.realRit ?? 0;

      // 12. Monitor Drop
      const dropReal = drpRealRit;
      const dropTotal = permintaanRealRit + dropReal;
      const dropDev = permintaanRit - permintaanRealRit - dropReal;
      const dropPct = permintaanRit > 0 ? `${(((permintaanRealRit + dropReal) / permintaanRit) * 100).toFixed(1)}%` : '0%';

      // 13. Monitor Sulam
      const sulamReal = relData.totalRitPlanted;
      const sulamManual = ord?.manual ?? 0;
      const sulamSaldo = (permintaanRealRit + dropReal) - sulamReal - sulamManual;

      const pembagiSulam = dropReal + permintaanRealRit;
      let sulamPct: string = '-';
      if (pembagiSulam > 0) {
        sulamPct = `${(((sulamReal + sulamManual) / pembagiSulam) * 100).toFixed(1)}%`;
      }

      const sulamLastDateStr = relData.lastDate ? relData.lastDate.toISOString().slice(0, 10) : '-';

      // 14-17. Spek & Keterangan
      const spekBibit = ord?.spekBibit || '-';
      const keteranganProses = ord?.keteranganProses || '-';
      const keteranganMati = ord?.keteranganMati || '-';
      const keteranganRitase = ord?.keteranganRitase || '-';

      return {
        'No.': idx + 1,
        'Wilayah': wil,
        'Lokasi': lok,
        'Jenis Bibit': jenisBibit,
        'Kelas Bibit': kelasBibit,
        'Tanggal Rawat': tglRawatStr,
        'Tanggal STD Forcing': tglStdForcingStr,
        'Tanggal F Prod': tglFProdStr,
        'Tanggal F Max': tglFMaxStr,
        'Tanggal Order': tglOrderStr,
        'Umur Forcing (Bulan)': umurForcing,
        'Permintaan Jumlah': permintaanJumlah,
        'Permintaan Rit': permintaanRit,
        'Permintaan Real Rit': permintaanRealRit,
        'Drop Real': dropReal,
        'Drop Total': dropTotal,
        'Drop Dev': dropDev,
        'Drop %Drop': dropPct,
        'Sulam Real': sulamReal,
        'Sulam Manual': sulamManual,
        'Sulam Saldo': sulamSaldo,
        'Sulam %Sulam': sulamPct,
        'Sulam Last Sulam': sulamLastDateStr,
        'Spek Bibit': spekBibit,
        'Keterangan Proses': keteranganProses,
        'Keterangan Mati': keteranganMati,
        'Keterangan Ritase': keteranganRitase,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'List Sulam');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `List_Sulam_Monitoring_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting sulam monitoring:', error);
    return NextResponse.json({ success: false, message: 'Gagal mengekspor data list sulam.' }, { status: 500 });
  }
}
