import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Great Giant Foods - PG1';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Data Lahan', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    // Definisi 55 Kolom Template Data Lahan Resmi (Pilihan 1: Deretan Rencana lalu Deretan Realisasi)
    worksheet.columns = [
      // 1. Informasi Dasar Lahan (10 Kolom)
      { header: 'Wilayah', key: 'wilayah', width: 12 },
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Luas Bruto (Ha)', key: 'luasBruto', width: 16 },
      { header: 'Luas Netto (Ha)', key: 'luasNetto', width: 16 },
      { header: 'STS', key: 'status', width: 12 },
      { header: 'Eks', key: 'eks', width: 14 },
      { header: 'Sejarah PS', key: 'sejarah', width: 16 },
      { header: 'Bibit & Kelas', key: 'bibitKelas', width: 18 },
      { header: 'Bulan Tanam', key: 'bulanTanam', width: 14 },
      { header: 'Rencana Bero (Hari)', key: 'rencanaBero', width: 18 },

      // 2. Blok DERETAN RENCANA (21 Kolom Berurutan dari Hulu ke Hilir)
      { header: 'Chopper (Renc)', key: 'chopperRenc', width: 16 },
      { header: 'Chopper Lu (Renc)', key: 'chopperLuRenc', width: 18 },
      { header: 'RH1 (Renc)', key: 'rh1Renc', width: 14 },
      { header: 'Cutting Banana (Renc)', key: 'cuttingBananaRenc', width: 20 },
      { header: 'Dolomit (Renc)', key: 'dolomitRenc', width: 16 },
      { header: 'DP 1 (Renc)', key: 'dp1Renc', width: 14 },
      { header: 'DP Cross (Renc)', key: 'dpCrossRenc', width: 16 },
      { header: 'DP 2 (Renc)', key: 'dp2Renc', width: 14 },
      { header: 'Belerang (Renc)', key: 'belerangRenc', width: 16 },
      { header: 'Kompos (Renc)', key: 'komposRenc', width: 16 },
      { header: 'MB 5 BTR (Renc)', key: 'mb5BtrRenc', width: 18 },
      { header: 'MB 2.5 (Renc)', key: 'mb25Renc', width: 16 },
      { header: 'MPH (Renc)', key: 'mphRenc', width: 14 },
      { header: 'Nardi (Renc)', key: 'nardiRenc', width: 14 },
      { header: 'HR EKS MB (Renc)', key: 'hrEksMbRenc', width: 18 },
      { header: 'SS1 (Renc)', key: 'ss1Renc', width: 14 },
      { header: 'SS2 (Renc)', key: 'ss2Renc', width: 14 },
      { header: 'Rotary FH1 (Renc)', key: 'rotaryFh1Renc', width: 18 },
      { header: 'Rotary FH2 (Renc)', key: 'rotaryFh2Renc', width: 18 },
      { header: 'Ridger (Renc)', key: 'ridgerRenc', width: 16 },
      { header: 'Jalan & Sal (Renc)', key: 'jalanSalRenc', width: 18 },

      // 3. Blok DERETAN REALISASI (24 Kolom Berurutan)
      { header: 'Chopper (Real)', key: 'chopperReal', width: 16 },
      { header: 'Chopper Lu (Real)', key: 'chopperLuReal', width: 18 },
      { header: 'RH1 (Real)', key: 'rh1Real', width: 14 },
      { header: 'Cutting Banana (Real)', key: 'cuttingBananaReal', width: 20 },
      { header: 'Dolomit (Real)', key: 'dolomitReal', width: 16 },
      { header: 'DP 1 (Real)', key: 'dp1Real', width: 14 },
      { header: 'DP Cross (Real)', key: 'dpCrossReal', width: 16 },
      { header: 'DP 2 (Real)', key: 'dp2Real', width: 14 },
      { header: 'Belerang (Real)', key: 'belerangReal', width: 16 },
      { header: 'Kompos (Real)', key: 'komposReal', width: 16 },
      { header: 'MB 5 BTR (Real)', key: 'mb5BtrReal', width: 18 },
      { header: 'MB 2.5 (Real)', key: 'mb25Real', width: 16 },
      { header: 'MPH (Real)', key: 'mphReal', width: 14 },
      { header: 'Nardi (Real)', key: 'nardiReal', width: 14 },
      { header: 'HR EKS MB (Real)', key: 'hrEksMbReal', width: 18 },
      { header: 'SS1 (Real)', key: 'ss1Real', width: 14 },
      { header: 'SS2 (Real)', key: 'ss2Real', width: 14 },
      { header: 'Rotary FH1 (Real)', key: 'rotaryFh1Real', width: 18 },
      { header: 'Rotary FH2 (Real)', key: 'rotaryFh2Real', width: 18 },
      { header: 'Ridger (Real)', key: 'ridgerReal', width: 16 },
      { header: 'Jalan & Sal (Real)', key: 'jalanSalReal', width: 18 },
      { header: 'Siap Tanam', key: 'siapTanam', width: 16 },
      { header: 'Proses Tanam', key: 'prosesTanam', width: 16 },
      { header: 'Selesai Tanam', key: 'selesaiTanam', width: 16 },
    ];

    // Styling Baris Header Berdasarkan 3 Blok Kategori
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;

    headerRow.eachCell((cell, colNumber) => {
      // 1. Informasi Lahan (Kolom 1 - 10): Soft Gray/Slate
      let bgColor = 'FFF1F5F9';
      let textColor = 'FF0F172A';
      let borderColor = 'FFCBD5E1';
      let bottomBorderColor = 'FF64748B';

      // 2. Deretan RENCANA (Kolom 11 - 31): Soft Sky/Blue
      if (colNumber >= 11 && colNumber <= 31) {
        bgColor = 'FFE0F2FE';
        textColor = 'FF0369A1';
        borderColor = 'FFBAE6FD';
        bottomBorderColor = 'FF0284C7';
      }
      // 3. Deretan REALISASI (Kolom 32 - 55): Soft Emerald/Green khas Labita
      else if (colNumber >= 32 && colNumber <= 55) {
        bgColor = 'FFDCFCE7';
        textColor = 'FF166534';
        borderColor = 'FFBBF7D0';
        bottomBorderColor = 'FF16A34A';
      }

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 9.5,
        bold: true,
        color: { argb: textColor },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: false,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'medium', color: { argb: bottomBorderColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } },
      };
    });

    // Aktifkan Filter Otomatis (AutoFilter) untuk seluruh 55 kolom
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: 55 },
    };

    // Template bersih tanpa dummy rows (kosong)
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Data_Lahan_PG1.xlsx"',
      },
    });
  } catch (error: any) {
    console.error('Error generating land template excel:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat file template Excel Data Lahan' },
      { status: 500 }
    );
  }
}
