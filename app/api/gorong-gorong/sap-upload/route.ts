import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000) {
    const utcDays = num - 25569;
    const d = new Date(Math.round(utcDays * 86400 * 1000));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      const d = new Date(Date.UTC(year, month, day));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function detectDiameter(text: any): number {
  if (!text) return 40;
  const str = String(text);
  if (str.includes('100')) return 100;
  if (str.includes('80')) return 80;
  if (str.includes('60')) return 60;
  return 40;
}

// GET: Ambil daftar data riwayat upload realisasi SAP (19 Kolom)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const diameter = searchParams.get('diameter');
    const bulan = searchParams.get('bulan');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const where: any = {};
    if (search) {
      where.OR = [
        { lokasi: { contains: search, mode: 'insensitive' } },
        { spkId: { contains: search, mode: 'insensitive' } },
        { pasDocument: { contains: search, mode: 'insensitive' } },
        { penanggungJawab: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (diameter && diameter !== 'ALL') {
      const dList = diameter.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n));
      if (dList.length === 1) {
        where.diameter = dList[0];
      } else if (dList.length > 1) {
        where.diameter = { in: dList };
      }
    }

    if (bulan && bulan !== 'ALL') {
      const bList = bulan.split(',').map((b) => b.trim()).filter(Boolean);
      const dateFilters: any[] = [];
      const curYear = new Date().getFullYear();

      for (const b of bList) {
        if (b.includes('-')) {
          const [yStr, mStr] = b.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          if (!isNaN(y) && !isNaN(m)) {
            const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
            dateFilters.push({
              tanggalRealisasi: { gte: startDate, lte: endDate },
            });
          }
        } else {
          const m = parseInt(b, 10);
          if (!isNaN(m) && m >= 1 && m <= 12) {
            const startDate = new Date(Date.UTC(curYear, m - 1, 1, 0, 0, 0));
            const endDate = new Date(Date.UTC(curYear, m, 0, 23, 59, 59, 999));
            dateFilters.push({
              tanggalRealisasi: { gte: startDate, lte: endDate },
            });
          }
        }
      }

      if (dateFilters.length === 1) {
        where.tanggalRealisasi = dateFilters[0].tanggalRealisasi;
      } else if (dateFilters.length > 1) {
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: dateFilters }];
          delete where.OR;
        } else {
          where.OR = dateFilters;
        }
      }
    }

    const [total, records] = await Promise.all([
      prisma.masterSapGorongGorong.count({ where }),
      prisma.masterSapGorongGorong.findMany({
        where,
        orderBy: { tanggalRealisasi: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        records,
      },
    });
  } catch (error: any) {
    console.error('Error fetching SAP records:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data realisasi SAP', error: error.message },
      { status: 500 }
    );
  }
}

// POST: Upload file Excel Realisasi SAP (Mendukung 18 Kolom Sesuai Format Form 630 maupun Sheet Data Pasang SAP)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const mode = (formData.get('mode') as string) || 'full_replace'; // 'full_replace' | 'partial' | 'month_replace'
    const isPartial = mode === 'partial' || mode === 'merge';
    const uploadedBy = (formData.get('uploadedBy') as string) || 'admin';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File Excel (.xlsx / .xls) wajib diunggah.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    // Cari sheet yang relevan: Form 630 SAP, Real Gorong, Data Pasang SAP, atau sheet pertama
    const findSheet = (patterns: string[]) => {
      const match = wb.SheetNames.find((name) =>
        patterns.some((p) => name.trim().toLowerCase().includes(p.toLowerCase()))
      );
      return match ? wb.Sheets[match] : null;
    };

    const ws =
      findSheet(['Form 630', 'Real Gorong', 'Data Pasang SAP', 'Data SAP', 'Pasang SAP']) ||
      wb.Sheets[wb.SheetNames[0]];

    if (!ws) {
      return NextResponse.json(
        { success: false, message: 'Sheet Excel tidak ditemukan.' },
        { status: 400 }
      );
    }

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const sapList: any[] = [];
    let countD40 = 0;
    let countD60 = 0;
    let countD80 = 0;
    let countD100 = 0;
    let totalBiayaSum = 0;

    // 1. Cek apakah ini Sheet Format Matriks "Data Pasang SAP" (Lokasi Col C, Wil Col D, Tgl Col F, D40..D100)
    let isMatrixSheet = false;
    for (let r = 1; r <= Math.min(6, range.e.r); r++) {
      const cG = ws['G' + r]?.v;
      const cH = ws['H' + r]?.v;
      if (
        (cG === 40 || cG === '40') &&
        (cH === 60 || cH === '60')
      ) {
        isMatrixSheet = true;
        break;
      }
    }

    if (isMatrixSheet) {
      // Pembacaan Matriks Data Pasang SAP (persis seperti di sheet Data Pasang SAP master PG1)
      for (let r = 5; r <= range.e.r; r++) {
        const cellC = ws['C' + r] || ws['B' + r];
        if (!cellC || cellC.v === undefined || cellC.v === null) continue;
        const lokStr = String(cellC.v).trim().toUpperCase();
        if (!lokStr || lokStr === 'LOKASI' || lokStr.startsWith('TOTAL')) continue;

        const rawWil = ws['D' + r] ? String(ws['D' + r].v).trim().toUpperCase() : '';
        const wilayah = /^AW0[1-7]$/.test(rawWil) ? rawWil : (/^W0[1-7]$/.test(rawWil) ? 'A' + rawWil : rawWil || null);
        const rawDate = ws['F' + r] ? ws['F' + r].v : null;
        const tanggal = parseExcelDate(rawDate) || new Date();

        const cleanVal = (val: any) => {
          const num = Number(val);
          return isNaN(num) ? 0 : Math.round(num);
        };

        const qtyD40 = cleanVal(ws['G' + r]?.v);
        const qtyD60 = cleanVal(ws['H' + r]?.v);
        const qtyD80 = cleanVal(ws['I' + r]?.v);
        const qtyD100 = cleanVal(ws['J' + r]?.v);

        const cellN = ws['N' + r];
        const refLok = cellN ? String(cellN.v).trim().toUpperCase() : lokStr;
        const pj = wilayah ? (wilayah.startsWith('AW0') ? 'Wilayah ' + parseInt(wilayah.replace(/\D/g, ''), 10) : wilayah) : null;

        const diaList: [number, number][] = [
          [40, qtyD40],
          [60, qtyD60],
          [80, qtyD80],
          [100, qtyD100],
        ];

        for (const [dia, qty] of diaList) {
          if (qty > 0) {
            if (dia === 40) countD40 += qty;
            else if (dia === 60) countD60 += qty;
            else if (dia === 80) countD80 += qty;
            else if (dia === 100) countD100 += qty;

            sapList.push({
              lokasi: lokStr,
              wilayahSap: wilayah,
              plantCostCenter: null,
              statusTanaman: null,
              spkId: null,
              pasDocument: null,
              tanggalRealisasi: tanggal,
              deskripsiKegiatan: 'Bantu pasang gorong2',
              deskripsiBahan: `GORONG-GORONG;Ø${dia}CM`,
              jenisData: 'Material',
              kodeBahan: null,
              qty,
              hasilEfektif: null,
              totalBiaya: null,
              penanggungJawab: pj,
              waktuPelaksanaan: null,
              air: 0,
              jumlahAir: 0,
              referensiLokasi: refLok || lokStr,
              diameter: dia,
              fileName: file.name,
              uploadedBy,
            });
          }
        }
      }
    } else {
      // 2. Pembacaan Format 18 Kolom Standar Realisasi SAP Form 630
      // Header: Wilayah, Lokasi, Status tanaman, SPK ID, PAS Document, Tanggal Realisasi,
      // Deskripsi, Deskripsi Bahan/Alat/Lainlain, Jenis Data, Kode Bahan/Alat/Lainlain,
      // Resource Bahan/Alat, Hasil Efektif, Total Realisasi Biaya, Penanggung Jawab, Time, Air, Jumlah Air, Referensi Lokasi
      let headerRowIndex = -1;
      const colMap: Record<string, number> = {};

      for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
        let matches = 0;
        const tempMap: Record<string, number> = {};
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = ws[XLSX.utils.encode_cell({ r, c })];
          if (!cell || cell.v === undefined || cell.v === null) continue;
          const h = String(cell.v).trim().toLowerCase();

          if (h.includes('referensi') || h === 'ref lokasi' || h === 'ref. lokasi') {
            tempMap.referensiLokasi = c;
            matches++;
          } else if (h.includes('spk')) {
            tempMap.spkId = c;
            matches++;
          } else if (h.includes('pas')) {
            tempMap.pasDocument = c;
            matches++;
          } else if (h.includes('tanggal') || h.includes('tgl')) {
            tempMap.tanggalRealisasi = c;
            matches++;
          } else if (h.includes('bahan') && (h.includes('deskripsi') || h.includes('nama'))) {
            tempMap.deskripsiBahan = c;
            matches++;
          } else if (h.includes('resource') || h.includes('qty') || h.includes('jumlah bahan') || h.includes('kuantitas')) {
            tempMap.qty = c;
            matches++;
          } else if (h.includes('biaya')) {
            tempMap.totalBiaya = c;
            matches++;
          } else if (h.includes('penanggung') || h === 'pj') {
            tempMap.penanggungJawab = c;
            matches++;
          } else if (h.includes('status') && (h.includes('tanam') || h.includes('tnm'))) {
            tempMap.statusTanaman = c;
            matches++;
          } else if (h.includes('jenis')) {
            tempMap.jenisData = c;
            matches++;
          } else if (h.includes('kode') && h.includes('bahan')) {
            tempMap.kodeBahan = c;
            matches++;
          } else if (h.includes('hasil') && h.includes('efektif')) {
            tempMap.hasilEfektif = c;
            matches++;
          } else if (h.includes('time') || h.includes('waktu')) {
            tempMap.waktuPelaksanaan = c;
            matches++;
          } else if (h === 'air') {
            tempMap.air = c;
            matches++;
          } else if (h.includes('jumlah air') || h.includes('jml air')) {
            tempMap.jumlahAir = c;
            matches++;
          } else if (h === 'wilayah' || h.startsWith('wilayah')) {
            tempMap.wilayahSap = c;
            matches++;
          } else if (h === 'lokasi' || h.includes('cost center') || h === 'plant') {
            tempMap.lokasi = c;
            matches++;
          } else if (h === 'deskripsi' || h.includes('kegiatan')) {
            tempMap.deskripsiKegiatan = c;
            matches++;
          }
        }

        if (matches >= 4) {
          headerRowIndex = r;
          Object.assign(colMap, tempMap);
          break;
        }
      }

      if (headerRowIndex === -1) {
        return NextResponse.json(
          { success: false, message: 'Format kolom file Excel tidak dikenali sebagai Realisasi SAP Form 630 atau sheet Data Pasang SAP.' },
          { status: 400 }
        );
      }

      for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
        const getVal = (colIndex?: number) => {
          if (colIndex === undefined) return null;
          const cell = ws[XLSX.utils.encode_cell({ r, c: colIndex })];
          return cell && cell.v !== undefined && cell.v !== null ? cell.v : null;
        };

        const refLokVal = getVal(colMap.referensiLokasi);
        const lokVal = getVal(colMap.lokasi);
        const extraColB = ws['B' + (r + 1)] ? ws['B' + (r + 1)].v : null;

        const rawRefLok = refLokVal ? String(refLokVal).trim().toUpperCase() : '';
        const rawLok = lokVal ? String(lokVal).trim().toUpperCase() : '';
        const rawExtraB = extraColB ? String(extraColB).trim().toUpperCase() : '';

        const lokasi = rawRefLok || rawLok || (rawExtraB && rawExtraB !== 'WILAYAH' ? rawExtraB : null);
        if (!lokasi || lokasi === 'LOKASI' || lokasi.startsWith('TOTAL')) continue;

        const wilayahSap = getVal(colMap.wilayahSap) ? String(getVal(colMap.wilayahSap)).trim() : null;
        const statusTanaman = getVal(colMap.statusTanaman) ? String(getVal(colMap.statusTanaman)).trim() : null;
        const spkId = getVal(colMap.spkId) ? String(getVal(colMap.spkId)).trim() : null;
        const pasDocument = getVal(colMap.pasDocument) ? String(getVal(colMap.pasDocument)).trim() : null;
        const tanggalRealisasi = parseExcelDate(getVal(colMap.tanggalRealisasi)) || new Date();
        const deskripsiKegiatan = getVal(colMap.deskripsiKegiatan) ? String(getVal(colMap.deskripsiKegiatan)).trim() : null;
        const deskripsiBahan = getVal(colMap.deskripsiBahan) ? String(getVal(colMap.deskripsiBahan)).trim() : '';
        const jenisData = getVal(colMap.jenisData) ? String(getVal(colMap.jenisData)).trim() : null;
        const kodeBahan = getVal(colMap.kodeBahan) ? String(getVal(colMap.kodeBahan)).trim() : null;
        const qty = Math.round(Number(getVal(colMap.qty)) || 0);
        const hasilEfektif = getVal(colMap.hasilEfektif) ? Number(getVal(colMap.hasilEfektif)) : null;
        const totalBiaya = getVal(colMap.totalBiaya) ? Number(getVal(colMap.totalBiaya)) : null;
        const penanggungJawab = getVal(colMap.penanggungJawab) ? String(getVal(colMap.penanggungJawab)).trim() : null;
        const waktuPelaksanaan = getVal(colMap.waktuPelaksanaan) ? Number(getVal(colMap.waktuPelaksanaan)) : null;
        const air = getVal(colMap.air) ? Number(getVal(colMap.air)) : 0;
        const jumlahAir = getVal(colMap.jumlahAir) ? Number(getVal(colMap.jumlahAir)) : 0;
        const referensiLokasi = rawRefLok || lokasi;
        const diameter = detectDiameter(deskripsiBahan);

        if (diameter === 40) countD40 += qty;
        else if (diameter === 60) countD60 += qty;
        else if (diameter === 80) countD80 += qty;
        else if (diameter === 100) countD100 += qty;

        if (totalBiaya) totalBiayaSum += totalBiaya;

        sapList.push({
          lokasi,
          wilayahSap,
          plantCostCenter: rawLok || null,
          statusTanaman,
          spkId,
          pasDocument,
          tanggalRealisasi,
          deskripsiKegiatan,
          deskripsiBahan,
          jenisData,
          kodeBahan,
          qty,
          hasilEfektif,
          totalBiaya,
          penanggungJawab,
          waktuPelaksanaan,
          air,
          jumlahAir,
          referensiLokasi,
          diameter,
          fileName: file.name,
          uploadedBy,
        });
      }
    }

    if (sapList.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Tidak ada baris data valid yang terbaca dari file Excel tersebut.' },
        { status: 400 }
      );
    }

    // Eksekusi Database: Replace Semua Data (All) vs Replace Parsial (Per Baris / Lokasi)
    const touchedLocations = Array.from(new Set(sapList.map((item) => item.lokasi).filter(Boolean)));

    if (mode === 'full_replace') {
      // Replace Semua Data: Hapus seluruh transaksi SAP lama di database
      await prisma.masterSapGorongGorong.deleteMany({});
    } else if (isPartial) {
      // Replace Parsial: Hapus transaksi SAP hanya untuk lokasi-lokasi yang ada di berkas upload
      if (touchedLocations.length > 0) {
        await prisma.masterSapGorongGorong.deleteMany({
          where: {
            lokasi: { in: touchedLocations },
          },
        });
      }
    } else if (mode === 'month_replace') {
      // Fallback mode periode bulan
      const detectedMonths = new Set<string>();
      for (const item of sapList) {
        if (item.tanggalRealisasi) {
          const d = new Date(item.tanggalRealisasi);
          const yyyy = d.getUTCFullYear();
          const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
          detectedMonths.add(`${yyyy}-${mm}`);
        }
      }
      for (const ym of detectedMonths) {
        const [yearStr, monthStr] = ym.split('-');
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10);
        const startDate = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
        await prisma.masterSapGorongGorong.deleteMany({
          where: { tanggalRealisasi: { gte: startDate, lte: endDate } },
        });
      }
    }

    // Insert batch data baru ke database (chunk 200)
    for (let i = 0; i < sapList.length; i += 200) {
      const chunk = sapList.slice(i, i + 200);
      await prisma.masterSapGorongGorong.createMany({ data: chunk });
    }

    const summaryObj = {
      mode: isPartial ? 'partial' : 'full_replace',
      totalLocations: touchedLocations.length,
      totalBaris: sapList.length,
      totalInserted: sapList.length,
      fileName: file.name,
      totalQty: countD40 + countD60 + countD80 + countD100,
      qtyD40: countD40,
      qtyD60: countD60,
      qtyD80: countD80,
      qtyD100: countD100,
      countD40,
      countD60,
      countD80,
      countD100,
      totalBiaya: totalBiayaSum,
      totalBiayaSum,
    };

    return NextResponse.json({
      success: true,
      message: isPartial
        ? `Replace Parsial Berhasil: ${touchedLocations.length} lokasi realisasi SAP diperbarui (${sapList.length} baris). Baris lokasi lain tetap aman!`
        : `Replace Seluruh Data Berhasil: Database realisasi SAP telah diperbarui 100% (${sapList.length} transaksi) dari berkas Excel!`,
      data: summaryObj,
      summary: summaryObj,
    });
  } catch (error: any) {
    console.error('Error uploading SAP Form 630:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memproses file upload SAP', error: error.message },
      { status: 500 }
    );
  }
}
