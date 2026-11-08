import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Monitor Gorong-Gorong PG1';
    workbook.lastModifiedBy = 'Antigravity System';
    workbook.created = new Date();
    workbook.modified = new Date();

    const headerFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF00873D' },
    };

    const subHeaderFill: ExcelJS.FillPattern = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF006E31' },
    };

    const fontHeader: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    const fontSubHeader: Partial<ExcelJS.Font> = {
      name: 'Calibri',
      size: 9,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    const thinBorder: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    };

    // =========================================================================
    // SHEET 1: Lokasi Order (33 Kolom, Ratio Gorong2 / Ha, Tanpa Keterangan)
    // =========================================================================
    const wsLokasi = workbook.addWorksheet('Lokasi Order', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 4, showGridLines: true }],
    });

    // Row 1: Title
    wsLokasi.mergeCells('A1:AG1');
    const titleCell = wsLokasi.getCell('A1');
    titleCell.value = 'TEMPLATE UPLOAD MONITORING GORONG-GORONG PER LOKASI';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF00873D' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
    wsLokasi.getRow(1).height = 25;

    // Row 2: Empty
    wsLokasi.getRow(2).height = 8;

    // Row 3: Super Headers
    // A3:L3 = INFORMASI LOKASI & STATUS (12 kolom)
    wsLokasi.mergeCells('A3:L3');
    const supGeneral = wsLokasi.getCell('A3');
    supGeneral.value = 'INFORMASI LOKASI & STATUS';
    supGeneral.fill = headerFill;
    supGeneral.font = fontHeader;
    supGeneral.alignment = { vertical: 'middle', horizontal: 'center' };

    // M3:R3 = DIAMETER 40 (6 kolom)
    wsLokasi.mergeCells('M3:R3');
    const supD40 = wsLokasi.getCell('M3');
    supD40.value = 'DIAMETER 40';
    supD40.fill = subHeaderFill;
    supD40.font = fontHeader;
    supD40.alignment = { vertical: 'middle', horizontal: 'center' };

    // S3:W3 = DIAMETER 60 (5 kolom)
    wsLokasi.mergeCells('S3:W3');
    const supD60 = wsLokasi.getCell('S3');
    supD60.value = 'DIAMETER 60';
    supD60.fill = headerFill;
    supD60.font = fontHeader;
    supD60.alignment = { vertical: 'middle', horizontal: 'center' };

    // X3:AB3 = DIAMETER 80 (5 kolom)
    wsLokasi.mergeCells('X3:AB3');
    const supD80 = wsLokasi.getCell('X3');
    supD80.value = 'DIAMETER 80';
    supD80.fill = subHeaderFill;
    supD80.font = fontHeader;
    supD80.alignment = { vertical: 'middle', horizontal: 'center' };

    // AC3:AG3 = DIAMETER 100 (5 kolom)
    wsLokasi.mergeCells('AC3:AG3');
    const supD100 = wsLokasi.getCell('AC3');
    supD100.value = 'DIAMETER 100';
    supD100.fill = headerFill;
    supD100.font = fontHeader;
    supD100.alignment = { vertical: 'middle', horizontal: 'center' };

    wsLokasi.getRow(3).height = 20;

    // Row 4: Column Headers (33 Kolom Resmi)
    const loColumns = [
      'Lokasi', 'Wilayah', 'Luas (Ha)', 'Status', 'Umur Bln', 'Tgl Order',
      'Akt. BK', 'DSM BK', 'DSM ST', 'Prioritas', 'Status All', 'Ratio Gorong2 / Ha',
      // D40 (6 kolom)
      'Order D40', 'Drop D40', 'Tgl Drop D40', 'Pasang Man D40', 'Pasang SAP D40', 'Status D40',
      // D60 (5 kolom)
      'Order D60', 'Drop D60', 'Pasang Man D60', 'Pasang SAP D60', 'Status D60',
      // D80 (5 kolom)
      'Order D80', 'Drop D80', 'Pasang Man D80', 'Pasang SAP D80', 'Status D80',
      // D100 (5 kolom)
      'Order D100', 'Drop D100', 'Pasang Man D100', 'Pasang SAP D100', 'Status D100',
    ];

    wsLokasi.getRow(4).values = loColumns;
    wsLokasi.getRow(4).height = 24;

    for (let c = 1; c <= loColumns.length; c++) {
      const cell = wsLokasi.getRow(4).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: c <= 12
            ? 'FF1E293B'
            : (c <= 18 ? 'FF0F766E' : (c <= 23 ? 'FF0369A1' : (c <= 28 ? 'FF4338CA' : 'FF6D28D9'))),
        },
      };
      cell.font = fontSubHeader;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder;
    }

    // Set Column Widths (33 Kolom)
    const loWidths = [
      12, 10, 10, 10, 10, 12,
      18, 12, 12, 10, 12, 18,
      // D40
      12, 12, 13, 14, 14, 12,
      // D60
      12, 12, 14, 14, 12,
      // D80
      12, 12, 14, 14, 12,
      // D100
      12, 12, 14, 14, 12,
    ];
    loWidths.forEach((w, idx) => {
      wsLokasi.getColumn(idx + 1).width = w;
    });

    // Sample Data Rows for Lokasi Order
    const sampleLokasiRows = [
      [
        '024K', 'AW02', 15.2, 'FC', 3, '2026-01-15',
        '20. Selesai Tanam', 'NON DSM', 'A. GOOD', '1', 'Open', 2.63,
        30, 20, '2026-02-10', 0, 18, 'Open',
        10, 10, 0, 10, 'Close',
        0, 0, 0, 0, '-',
        0, 0, 0, 0, '-',
      ],
      [
        '063G2', 'AW04', 18.5, 'FC', 4, '2026-02-01',
        '20. Selesai Tanam', 'NON DSM', 'A. GOOD', '2', 'Open', 3.78,
        40, 40, '2026-02-20', 0, 40, 'Close',
        20, 15, 0, 10, 'Open',
        10, 5, 0, 0, 'Open',
        0, 0, 0, 0, '-',
      ],
      [
        '083A', 'AW05', 12.0, 'ST', 2, '2026-02-15',
        '18. Finishing Harrow', 'DSM', 'C. POOR', '3', 'Open', 2.00,
        24, 0, null, 0, 0, 'Open',
        0, 0, 0, 0, '-',
        0, 0, 0, 0, '-',
        0, 0, 0, 0, '-',
      ],
    ];

    sampleLokasiRows.forEach((rowVals, rIdx) => {
      const row = wsLokasi.getRow(5 + rIdx);
      row.values = rowVals;
      row.height = 20;
      for (let c = 1; c <= loColumns.length; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 2 || c === 4 || c === 6 || c === 11 || c === 18 || c === 23 || c === 28 || c === 33
            ? 'center'
            : (c === 3 || c === 5 || c === 10 || c === 12 || (c >= 13 && c <= 32) ? 'right' : 'left'),
        };
      }
    });

    // =========================================================================
    // SHEET 2: Data Order (9 Kolom Resmi - Tanpa Kolom Keterangan)
    // =========================================================================
    const wsOrder = workbook.addWorksheet('Data Order', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 4, showGridLines: true }],
    });

    // Row 1: Title
    wsOrder.mergeCells('A1:I1');
    const orderTitle = wsOrder.getCell('A1');
    orderTitle.value = 'MASTER DATA ORDER GORONG-GORONG';
    orderTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF00873D' } };
    orderTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    wsOrder.getRow(1).height = 25;

    // Row 2: Empty
    wsOrder.getRow(2).height = 8;

    // Row 3: Super Header
    wsOrder.mergeCells('A3:D3');
    const supOrderIdent = wsOrder.getCell('A3');
    supOrderIdent.value = 'IDENTITAS ORDER';
    supOrderIdent.fill = headerFill;
    supOrderIdent.font = fontHeader;
    supOrderIdent.alignment = { vertical: 'middle', horizontal: 'center' };

    wsOrder.mergeCells('E3:H3');
    const supOrderDia = wsOrder.getCell('E3');
    supOrderDia.value = 'DIAMETER GORONG - GORONG (PCS)';
    supOrderDia.fill = subHeaderFill;
    supOrderDia.font = fontHeader;
    supOrderDia.alignment = { vertical: 'middle', horizontal: 'center' };

    wsOrder.mergeCells('I3:I3');
    const supOrderLookup = wsOrder.getCell('I3');
    supOrderLookup.value = 'STATUS LOOKUP';
    supOrderLookup.fill = headerFill;
    supOrderLookup.font = fontHeader;
    supOrderLookup.alignment = { vertical: 'middle', horizontal: 'center' };

    wsOrder.getRow(3).height = 20;

    // Row 4: Column Headers (9 Kolom Resmi)
    const orderColumns = [
      'Area',
      'Lokasi',
      'Wilayah',
      'Tanggal',
      'Diameter 40',
      'Diameter 60',
      'Diameter 80',
      'Diameter 100',
      'Lookup Status',
    ];

    wsOrder.getRow(4).values = orderColumns;
    wsOrder.getRow(4).height = 24;

    for (let c = 1; c <= orderColumns.length; c++) {
      const cell = wsOrder.getRow(4).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: c <= 4 ? 'FF1E293B' : (c <= 8 ? 'FF00873D' : 'FF0F766E') },
      };
      cell.font = fontSubHeader;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder;
    }

    // Set Column Widths (9 Kolom)
    const orderWidths = [12, 14, 12, 14, 14, 14, 14, 14, 18];
    orderWidths.forEach((w, idx) => {
      wsOrder.getColumn(idx + 1).width = w;
    });

    // Sample Data Rows for Data Order
    const sampleOrderRows = [
      ['A1', '024K', 'AW02', '2026-01-15', 30, 10, 0, 0, 'A. GOOD'],
      ['A2', '063G2', 'AW04', '2026-02-01', 40, 20, 10, 0, 'A. GOOD'],
      ['A3', '083A', 'AW05', '2026-02-15', 24, 0, 0, 0, 'C. POOR'],
      ['A1', '020B', 'AW01', '2026-03-01', 50, 20, 0, 0, 'A. GOOD'],
    ];

    sampleOrderRows.forEach((rowVals, rIdx) => {
      const row = wsOrder.getRow(5 + rIdx);
      row.values = rowVals;
      row.height = 20;
      for (let c = 1; c <= orderColumns.length; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 2 || c === 3 || c === 4 ? 'center' : (c >= 5 && c <= 8 ? 'right' : 'left'),
        };
      }
    });

    // =========================================================================
    // SHEET 3: Data Drop (7 Kolom Resmi)
    // =========================================================================
    const wsDrop = workbook.addWorksheet('Data Drop', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 4, showGridLines: true }],
    });

    // Row 1: Title
    wsDrop.mergeCells('A1:G1');
    const dropTitle = wsDrop.getCell('A1');
    dropTitle.value = 'MASTER DATA DROP GORONG-GORONG (7 KOLOM)';
    dropTitle.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF00873D' } };
    dropTitle.alignment = { vertical: 'middle', horizontal: 'left' };
    wsDrop.getRow(1).height = 25;

    // Row 2: Empty
    wsDrop.getRow(2).height = 8;

    // Row 3: Super Header
    wsDrop.mergeCells('A3:C3');
    const supDropIdent = wsDrop.getCell('A3');
    supDropIdent.value = 'IDENTITAS KEDATANGAN (DROP)';
    supDropIdent.fill = headerFill;
    supDropIdent.font = fontHeader;
    supDropIdent.alignment = { vertical: 'middle', horizontal: 'center' };

    wsDrop.mergeCells('D3:G3');
    const supDropDia = wsDrop.getCell('D3');
    supDropDia.value = 'DIAMETER GORONG - GORONG DROP (PCS)';
    supDropDia.fill = subHeaderFill;
    supDropDia.font = fontHeader;
    supDropDia.alignment = { vertical: 'middle', horizontal: 'center' };

    wsDrop.getRow(3).height = 20;

    // Row 4: Column Headers (7 Kolom Resmi)
    const dropColumns = [
      'Lokasi',
      'Wilayah',
      'Tanggal',
      'Diameter 40',
      'Diameter 60',
      'Diameter 80',
      'Diameter 100',
    ];

    wsDrop.getRow(4).values = dropColumns;
    wsDrop.getRow(4).height = 24;

    for (let c = 1; c <= dropColumns.length; c++) {
      const cell = wsDrop.getRow(4).getCell(c);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: c <= 3 ? 'FF1E293B' : 'FF00873D' },
      };
      cell.font = fontSubHeader;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = thinBorder;
    }

    // Set Column Widths (7 Kolom)
    const dropWidths = [14, 12, 14, 14, 14, 14, 14];
    dropWidths.forEach((w, idx) => {
      wsDrop.getColumn(idx + 1).width = w;
    });

    // Sample Data Rows for Data Drop
    const sampleDropRows = [
      ['024K', 'AW02', '2026-02-10', 20, 10, 0, 0],
      ['063G2', 'AW04', '2026-02-20', 40, 15, 5, 0],
      ['083A', 'AW05', '2025-11-20', 10, 0, 0, 0],
      ['020B', 'AW01', '2026-03-05', 25, 10, 0, 0],
    ];

    sampleDropRows.forEach((rowVals, rIdx) => {
      const row = wsDrop.getRow(5 + rIdx);
      row.values = rowVals;
      row.height = 20;
      for (let c = 1; c <= dropColumns.length; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 9 };
        cell.border = thinBorder;
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 1 || c === 2 || c === 3 ? 'center' : 'right',
        };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Upload_Monitor_Gorong_Gorong.xlsx"',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error('Error generating template Excel:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal membuat berkas template Excel' },
      { status: 500 }
    );
  }
}
