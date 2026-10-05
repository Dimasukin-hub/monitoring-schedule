import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File Excel tidak ditemukan dalam request' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'File Excel tidak memiliki lembar kerja (worksheet)' },
        { status: 400 }
      );
    }

    // Pick first worksheet or one with 'Stok' / 'Data'
    const targetSheetName =
      workbook.SheetNames.find((n) => n.toLowerCase().includes('stok') || n.toLowerCase().includes('data')) ||
      workbook.SheetNames[0];

    const worksheet = workbook.Sheets[targetSheetName];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json(
        { success: false, error: `Worksheet "${targetSheetName}" tidak memiliki baris data` },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let createdCount = 0;
    const errors: string[] = [];

    // Helper functions for safe parsing
    const parseNum = (v: any): number | null => {
      if (v === undefined || v === null || v === '' || v === '-') return null;
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    const parseStr = (v: any): string | null => {
      if (v === undefined || v === null) return null;
      const s = String(v).trim();
      return s === '' || s === '-' || s === '#N/A' ? null : s;
    };

    const cleanStatus = (v: any): string | null => {
      const s = parseStr(v);
      if (!s) return null;
      const cleaned = s.replace(/\d+/g, '').trim();
      return cleaned || s;
    };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];

      // Find lokasi field flexibly
      const lokasiRaw =
        row['Lokasi'] ||
        row['lokasi'] ||
        row['LOKASI'] ||
        row['Kode Lokasi'] ||
        row['Kode'] ||
        row['Petak'];

      const lokasi = parseStr(lokasiRaw);
      if (!lokasi) {
        continue; // Skip rows without lokasi
      }

      const wilayah =
        parseStr(row['Wilayah'] || row['wilayah'] || row['WILAYAH'] || row['Wil']) || 'UNKNOWN';

      const luasBruto =
        parseNum(row['Luas Bruto (Ha)'] || row['Luas Bruto'] || row['luasBruto'] || row['BRUTO']) || 0;

      const luasNetto =
        parseNum(row['Luas Netto (Ha)'] || row['Luas Netto'] || row['luasNetto'] || row['NETTO']) || 0;

      const status = cleanStatus(row['Status'] || row['status'] || row['STATUS'] || row['STS']);

      const eks = parseStr(row['Eks'] || row['eks'] || row['EKS'] || row['Eks Tanaman']);

      const sejarah = parseStr(row['Sejarah'] || row['sejarah'] || row['SEJARAH']);

      const phBk = parseNum(row['pH BK'] || row['PH BK'] || row['phBk'] || row['PH_BK']);

      const phSn = parseNum(row['pH SN'] || row['PH SN'] || row['phSn'] || row['PH_SN']);

      const aplikasiTerakhir = parseStr(
        row['Aktivitas Terakhir'] || row['aktivitasTerakhir'] || row['Aplikasi Terakhir']
      );

      try {
        // Upsert into Land table
        const existing = await prisma.land.findFirst({
          where: { lokasi },
        });

        if (existing) {
          await prisma.land.update({
            where: { id: existing.id },
            data: {
              ...(wilayah !== 'UNKNOWN' ? { wilayah } : {}),
              ...(luasBruto > 0 ? { luasBruto } : {}),
              ...(luasNetto > 0 ? { luasNetto } : {}),
              ...(status ? { status } : {}),
              ...(eks ? { eks } : {}),
              ...(sejarah ? { sejarah } : {}),
              ...(phBk !== null ? { phBk } : {}),
              ...(phSn !== null ? { phSn } : {}),
              ...(aplikasiTerakhir ? { aplikasiTerakhir } : {}),
            },
          });
          updatedCount++;
        } else {
          await prisma.land.create({
            data: {
              lokasi,
              wilayah,
              luasBruto,
              luasNetto,
              status,
              eks,
              sejarah,
              phBk,
              phSn,
              aplikasiTerakhir,
            },
          });
          createdCount++;
        }
      } catch (err: any) {
        errors.push(`Baris ${i + 2} (${lokasi}): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil memproses Excel: ${updatedCount} lokasi diperbarui, ${createdCount} lokasi baru ditambahkan`,
      updatedCount,
      createdCount,
      totalProcessed: updatedCount + createdCount,
      errors: errors.slice(0, 5),
    });
  } catch (error: any) {
    console.error('Error uploading stok Excel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
