import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitoring Schedule Gorong-Gorong PG1';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('Form 630 SAP', {
      views: [{ state: 'frozen', ySplit: 1 }], // Freeze panes baris pertama
    });

    // 18 Kolom resmi standar Excel Form 630 SAP (Real Gorong2) sesuai urutan pengguna
    const columns = [
      { header: 'Wilayah', key: 'wilayah', width: 14 },
      { header: 'Lokasi', key: 'lokasi', width: 14 },
      { header: 'Status tanaman', key: 'statusTanaman', width: 16 },
      { header: 'SPK ID', key: 'spkId', width: 18 },
      { header: 'PAS Document', key: 'pasDocument', width: 18 },
      { header: 'Tanggal Realisasi', key: 'tanggalRealisasi', width: 18 },
      { header: 'Deskripsi', key: 'deskripsi', width: 28 },
      { header: 'Deskripsi Bahan/Alat/Lainlain', key: 'deskripsiBahan', width: 42 },
      { header: 'Jenis Data', key: 'jenisData', width: 14 },
      { header: 'Kode Bahan/Alat/Lainlain', key: 'kodeBahan', width: 20 },
      { header: 'Resource Bahan/Alat', key: 'qty', width: 20 },
      { header: 'Hasil Efektif', key: 'hasilEfektif', width: 15 },
      { header: 'Total Realisasi Biaya', key: 'totalBiaya', width: 22 },
      { header: 'Penanggung Jawab', key: 'penanggungJawab', width: 20 },
      { header: 'Time', key: 'time', width: 14 },
      { header: 'Air', key: 'air', width: 10 },
      { header: 'Jumlah Air', key: 'jumlahAir', width: 14 },
      { header: 'Referensi Lokasi', key: 'referensiLokasi', width: 18 },
    ];

    ws.columns = columns;

    // Contoh Data Riil Form 630 SAP persis sesuai berkas pengguna
    const sampleRows = [
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007978176',
        pasDocument: 'LKB001086070',
        tanggalRealisasi: '2026-01-02',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 10,
        hasilEfektif: 0.4,
        totalBiaya: 4150000,
        penanggungJawab: 'Wilayah 4',
        time: '14:06:53',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '048G2',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007978955',
        pasDocument: 'LKB001085992',
        tanggalRealisasi: '2026-01-03',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 15,
        hasilEfektif: 0.4,
        totalBiaya: 6225000,
        penanggungJawab: 'Wilayah 4',
        time: '14:07:02',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '041B3',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007981748',
        pasDocument: 'LKB001085993',
        tanggalRealisasi: '2026-01-04',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 15,
        hasilEfektif: 0.4,
        totalBiaya: 6225000,
        penanggungJawab: 'Wilayah 4',
        time: '14:07:30',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '041B3',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007981917',
        pasDocument: 'LKB001085861',
        tanggalRealisasi: '2026-01-04',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 25,
        hasilEfektif: 5,
        totalBiaya: 10375000,
        penanggungJawab: 'Wilayah 5',
        time: '09:48:07',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '070L1',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007981739',
        pasDocument: 'LKB001085994',
        tanggalRealisasi: '2026-01-05',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 14,
        hasilEfektif: 0.4,
        totalBiaya: 5810000,
        penanggungJawab: 'Wilayah 4',
        time: '14:11:16',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '041B4',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007983988',
        pasDocument: 'LKB001085959',
        tanggalRealisasi: '2026-01-07',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø60CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203954',
        qty: 6,
        hasilEfektif: 1,
        totalBiaya: 3990000,
        penanggungJawab: 'Wilayah 3',
        time: '13:33:53',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '064D',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007984764',
        pasDocument: 'LKB001085997',
        tanggalRealisasi: '2026-01-07',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 20,
        hasilEfektif: 3.999,
        totalBiaya: 8300000,
        penanggungJawab: 'Wilayah 4',
        time: '14:31:40',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '038F1',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007985763',
        pasDocument: 'LKB001085939',
        tanggalRealisasi: '2026-01-07',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø80CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203953',
        qty: 6,
        hasilEfektif: 1,
        totalBiaya: 4710000,
        penanggungJawab: 'Wilayah 7',
        time: '10:41:11',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '097B',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007986025',
        pasDocument: 'LKB001085960',
        tanggalRealisasi: '2026-01-08',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø60CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203954',
        qty: 12,
        hasilEfektif: 2,
        totalBiaya: 7980000,
        penanggungJawab: 'Wilayah 3',
        time: '13:34:05',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '064D',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK007992863',
        pasDocument: 'LKB001088175',
        tanggalRealisasi: '2026-01-11',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø100CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203426',
        qty: 7,
        hasilEfektif: 1,
        totalBiaya: 7700000,
        penanggungJawab: 'Wilayah 7',
        time: '09:47:10',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '100A',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK008008287',
        pasDocument: 'LKB001089097',
        tanggalRealisasi: '2026-01-18',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 20,
        hasilEfektif: 1,
        totalBiaya: 8300000,
        penanggungJawab: 'Wilayah 2',
        time: '13:39:35',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '030H2',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK008018429',
        pasDocument: 'LKB001090932',
        tanggalRealisasi: '2026-01-23',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø100CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203426',
        qty: 8,
        hasilEfektif: 0.4,
        totalBiaya: 8800000,
        penanggungJawab: 'Wilayah 4',
        time: '15:24:09',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '043B',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK008040814',
        pasDocument: 'LKB001094957',
        tanggalRealisasi: '2026-02-03',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 10,
        hasilEfektif: 2.001,
        totalBiaya: 4150000,
        penanggungJawab: 'Wilayah 1',
        time: '11:22:53',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '003B',
      },
      {
        wilayah: 'AW04',
        lokasi: '042F1',
        statusTanaman: 'NSST',
        spkId: 'SPK008293312',
        pasDocument: 'LKB001137942',
        tanggalRealisasi: '2026-06-15',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 15,
        hasilEfektif: 0.4,
        totalBiaya: 6225000,
        penanggungJawab: 'Wilayah 4',
        time: '10:16:37',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '042F1',
      },
      {
        wilayah: 'AW02',
        lokasi: '017A',
        statusTanaman: 'NSST',
        spkId: 'SPK008326229',
        pasDocument: 'LKB001142868',
        tanggalRealisasi: '2026-06-29',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø40CM (ADA TULANG)',
        jenisData: 'Material',
        kodeBahan: 'SSPA0204162',
        qty: 15,
        hasilEfektif: 0.4,
        totalBiaya: 6225000,
        penanggungJawab: 'Wilayah 2',
        time: '10:46:10',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '017A',
      },
      {
        wilayah: 'AP1',
        lokasi: 'PSALPG1',
        statusTanaman: 'SLDA',
        spkId: 'SPK008600740',
        pasDocument: 'LKB001177849',
        tanggalRealisasi: '2026-10-24',
        deskripsi: 'Bantu pasang gorong2',
        deskripsiBahan: 'GORONG-GORONG;Ø80CM',
        jenisData: 'Material',
        kodeBahan: 'SSPA0203953',
        qty: 5,
        hasilEfektif: 1,
        totalBiaya: 3925000,
        penanggungJawab: 'Wilayah 5',
        time: '13:51:54',
        air: 0,
        jumlahAir: 0,
        referensiLokasi: '082L',
      },
    ];

    sampleRows.forEach((row) => ws.addRow(row));

    // Style Header Baris 1: Background Biru Muda (#D9E1F2), Bold, Center Alignment & Border Halus
    const headerRow = ws.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }, // Soft Corporate Light Blue
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: true,
        color: { argb: 'FF1E293B' },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        bottom: { style: 'medium', color: { argb: 'FF5B84B1' } },
        left: { style: 'thin', color: { argb: 'FF9CB4D8' } },
        right: { style: 'thin', color: { argb: 'FF9CB4D8' } },
      };
    });

    // Style Seluruh Baris Contoh Data: Alignment & Border Halus
    for (let r = 2; r <= sampleRows.length + 1; r++) {
      const row = ws.getRow(r);
      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF334155' },
        };
        // Kolom 13: Total Realisasi Biaya rata kanan format currency
        if (colNumber === 13) {
          cell.alignment = { vertical: 'middle', horizontal: 'right' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 7 || colNumber === 8) {
          // Deskripsi rata kiri
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }

    // Aktifkan Filter Otomatis Range A1 s/d Baris Terakhir
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sampleRows.length + 1, column: columns.length },
    };

    // Sesuaikan lebar kolom dengan isian sel agar pas dan tidak terlalu lebar
    ws.columns.forEach((column) => {
      let maxLen = 0;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const val = cell.value ? String(cell.value) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      column.width = Math.min(Math.max(maxLen + 3, 11), 26);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(Buffer.from(buffer), {
      status: 200,
      headers: {
        'Content-Disposition': 'attachment; filename="Template_Upload_Realisasi_SAP_Form630.xlsx"',
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error: any) {
    console.error('Error generating template SAP:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat template Excel SAP', error: error.message },
      { status: 500 }
    );
  }
}
