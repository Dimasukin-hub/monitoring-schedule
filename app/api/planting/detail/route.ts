import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lokasiParam = searchParams.get('lokasi')?.trim();
    const field = (searchParams.get('field')?.trim() || 'lokasi').toLowerCase();
    const filterAktParam = searchParams.get('aktivitas')?.trim() || 'DEFAULT';

    if (!lokasiParam) {
      return NextResponse.json(
        { success: false, error: 'Parameter lokasi wajib diisi.' },
        { status: 400 }
      );
    }

    // 1. Ambil data master dari tabel Planting
    let master = await prisma.planting.findFirst({
      where: { lokasi: { equals: lokasiParam, mode: 'insensitive' } },
    });

    // Fallback: Jika tidak ditemukan di Planting, cek di Land
    let landMaster: any = null;
    if (!master) {
      landMaster = await prisma.land.findFirst({
        where: { lokasi: { equals: lokasiParam, mode: 'insensitive' } },
      });
      if (landMaster) {
        master = {
          id: landMaster.id,
          lokasi: landMaster.lokasi,
          luas: landMaster.luasNetto || landMaster.luasBruto || 0,
          jenisBibit: landMaster.jenisBibit,
          kelasBibit: landMaster.kelasBibit,
          realTanam: 0,
          sisa: landMaster.luasNetto || landMaster.luasBruto || 0,
          estSelesai: null,
          progress: 0,
          awalTanam: landMaster.realMulaiTanam || landMaster.rencMulaiTanam || null,
          leadtime: landMaster.hariWaktu || null,
          status: landMaster.status || 'BELUM TANAM',
          createdAt: landMaster.createdAt,
          updatedAt: landMaster.updatedAt,
        };
      }
    }

    // 2. Ambil seluruh transaksi lokasi dari PlantingDetail
    const allTxForLoc = await prisma.plantingDetail.findMany({
      where: { lokasi: { equals: lokasiParam, mode: 'insensitive' } },
      orderBy: [{ id: 'asc' }],
    });

    // Hitung ringkasan total seluruh transaksi lokasi
    let totalTanam = 0;
    let totalPetik = 0;
    let countTanam = 0;
    let countPetik = 0;
    const bibitBreakdown: Record<
      string,
      { total: number; standar: number; besar: number; sedang: number; kecil: number }
    > = {};

    for (const tx of allTxForLoc) {
      const akt = (tx.aktivitas || '').toLowerCase();
      const vol = tx.total || 0;
      if (akt.includes('tanam')) {
        totalTanam += vol;
        countTanam++;
      } else if (akt.includes('petik')) {
        totalPetik += vol;
        countPetik++;
      }

      const bibitKey = tx.jenisBibit || 'Lainnya';
      if (!bibitBreakdown[bibitKey]) {
        bibitBreakdown[bibitKey] = { total: 0, standar: 0, besar: 0, sedang: 0, kecil: 0 };
      }
      bibitBreakdown[bibitKey].total += vol;
      bibitBreakdown[bibitKey].standar += tx.standar || 0;
      bibitBreakdown[bibitKey].besar += tx.besar || 0;
      bibitBreakdown[bibitKey].sedang += tx.sedang || 0;
      bibitBreakdown[bibitKey].kecil += tx.kecil || 0;
    }

    const totalAll = totalTanam + totalPetik;

    // 3. Tentukan filter transaksi spesifik sesuai instruksi per field
    // Default aktivitas tab:
    let defaultActiveTab: 'ALL' | 'Tanam Bibit' | 'Petik Bibit' = 'ALL';
    let fieldFilteredTransactions = allTxForLoc;
    let filterAppliedDesc = `Lokasi = ${lokasiParam}`;

    const luasTarget = master ? master.luas : 0;
    const realTanamMaster = master ? master.realTanam || 0 : 0;
    const progressMaster = master ? master.progress || 0 : 0;
    const sisaMaster = master ? master.sisa || 0 : 0;
    const statusMaster = master ? master.status || 'BELUM TANAM' : 'BELUM TANAM';

    const calcRealTanam = Number(totalTanam.toFixed(3));
    const calcSisa = Number((realTanamMaster - luasTarget).toFixed(3));
    const calcProgress = luasTarget > 0 ? Number(((realTanamMaster / luasTarget) * 100).toFixed(1)) : 0;

    let lineageCategory: 'SOURCE' | 'AGGREGATED' | 'CALCULATED' = 'SOURCE';
    let fieldTitle = `Detail Lokasi ${lokasiParam}`;
    let formulaDesc = '';
    let formulaMath = '';
    let calculationDetails: any = null;
    let sourceMasterInfo: { file: string; sheet: string; column: string; value: any } | null = null;
    let sourceDetailInfo: { file: string; sheet: string; column: string; count: number } | null = null;

    switch (field) {
      case 'realtanam':
      case 'real_tanam':
        lineageCategory = 'AGGREGATED';
        fieldTitle = 'Detail Real Tanam (Aggregated)';
        defaultActiveTab = 'Tanam Bibit';
        fieldFilteredTransactions = allTxForLoc.filter((t) =>
          (t.aktivitas || '').toLowerCase().includes('tanam')
        );
        filterAppliedDesc = `Lokasi = "${lokasiParam}" AND Aktivitas = "Tanam Bibit"`;
        formulaDesc =
          'Angka Real Tanam diperoleh dari agregasi SUM(Total) seluruh baris transaksi beraktivitas "Tanam Bibit" pada sheet Input Real Tanam&Petik Nanas untuk lokasi ini.';
        formulaMath = 'Real Tanam = SUM(Total) [Filter: Lokasi = ' + lokasiParam + ' & Aktivitas = "Tanam Bibit"]';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom F (Real Tanam)',
          value: `${realTanamMaster.toFixed(2)} Ha`,
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom I (Total Ha) & Kolom D (Aktivitas)',
          count: fieldFilteredTransactions.length,
        };
        calculationDetails = {
          luasTarget,
          realTanamMaster,
          sumTanamTransaksi: calcRealTanam,
          totalTransaksiTanam: fieldFilteredTransactions.length,
          selisihMasterVsDetail: Number(Math.abs(realTanamMaster - calcRealTanam).toFixed(3)),
          isMatch: Math.abs(realTanamMaster - calcRealTanam) < 0.05,
          filterUsed: filterAppliedDesc,
        };
        break;

      case 'jenisbibit':
      case 'jenis_bibit':
        lineageCategory = 'SOURCE';
        fieldTitle = 'Detail Jenis Bibit (Source & Transaksi)';
        if (master?.jenisBibit) {
          fieldFilteredTransactions = allTxForLoc.filter(
            (t) => (t.jenisBibit || '').toLowerCase() === (master?.jenisBibit || '').toLowerCase()
          );
          filterAppliedDesc = `Lokasi = "${lokasiParam}" AND Jenis Bibit = "${master.jenisBibit}"`;
        }
        formulaDesc =
          'Jenis Bibit master rencana bersumber langsung dari Sheet RTN. Tabel di bawah menampilkan seluruh transaksi lapangan yang sesuai dengan Lokasi dan Jenis Bibit terkait.';
        formulaMath = 'Relasi: Lokasi = ' + lokasiParam + ' AND Jenis Bibit = "' + (master?.jenisBibit || '-') + '"';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom D (Jenis Bibit)',
          value: master?.jenisBibit || '-',
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom J (Jenis Bibit)',
          count: fieldFilteredTransactions.length,
        };
        calculationDetails = {
          jenisMaster: master?.jenisBibit || '-',
          transaksiCocok: fieldFilteredTransactions.length,
          totalVolumeBibit: Number(
            fieldFilteredTransactions.reduce((acc, t) => acc + t.total, 0).toFixed(3)
          ),
          filterUsed: filterAppliedDesc,
        };
        break;

      case 'kelasbibit':
      case 'kelas_bibit':
        lineageCategory = 'SOURCE';
        fieldTitle = 'Detail Kelas Bibit (Source & Distribusi)';
        const masterKelas = (master?.kelasBibit || '').toLowerCase();
        fieldFilteredTransactions = allTxForLoc.filter((t) => {
          if (masterKelas.includes('besar') && (t.besar || 0) > 0) return true;
          if (masterKelas.includes('sedang') && (t.sedang || 0) > 0) return true;
          if (masterKelas.includes('kecil') && (t.kecil || 0) > 0) return true;
          if (masterKelas.includes('standar') && (t.standar || 0) > 0) return true;
          return false;
        });
        if (fieldFilteredTransactions.length === 0) {
          fieldFilteredTransactions = allTxForLoc;
        }
        filterAppliedDesc = `Lokasi = "${lokasiParam}" AND Distribusi Kelas = "${master?.kelasBibit || '-'}"`;
        formulaDesc =
          'Kelas Bibit rencana bersumber dari master Sheet RTN. Tabel di bawah menampilkan rincian transaksi lapangan yang memiliki alokasi volume pada kelas bibit tersebut.';
        formulaMath = 'Relasi: Lokasi = ' + lokasiParam + ' AND Kelas Bibit = "' + (master?.kelasBibit || '-') + '"';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom E (Kelas Bibit)',
          value: master?.kelasBibit || '-',
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom F-I (Standar, Besar, Sedang, Kecil)',
          count: fieldFilteredTransactions.length,
        };
        calculationDetails = {
          kelasMaster: master?.kelasBibit || '-',
          breakdownRealisasi: bibitBreakdown,
          filterUsed: filterAppliedDesc,
        };
        break;

      case 'luas':
        lineageCategory = 'SOURCE';
        fieldTitle = 'Detail Luas Target Master vs Luas Netto';
        formulaDesc =
          'Luas Target (Ha) bersumber langsung dari data master rencana jadwal tanam (Sheet RTN). Pada sheet Input Real Tanam&Petik Nanas terdapat kolom Netto (Ha) sebagai perbandingan luas petak.';
        formulaMath = 'Luas Target Master (RTN Col C) vs Luas Netto Transaksi (Input Col C)';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom C (Luas Target)',
          value: `${luasTarget.toFixed(2)} Ha`,
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom C (Netto Ha)',
          count: allTxForLoc.length,
        };
        calculationDetails = {
          luasTargetMaster: luasTarget,
          luasNettoTransaksi: allTxForLoc.length > 0 ? allTxForLoc[0].luasNetto : null,
          totalRealisasiTanam: calcRealTanam,
          selisihRealisasiVsTarget: Number((calcRealTanam - luasTarget).toFixed(3)),
        };
        break;

      case 'sisa':
        lineageCategory = 'CALCULATED';
        fieldTitle = 'Detail Perhitungan Sisa Luas (Calculated)';
        formulaDesc =
          'Nilai Sisa dihitung secara dinamis oleh sistem berdasarkan selisih antara akumulasi Real Tanam dengan Luas Target master.';
        formulaMath = 'Sisa (Ha) = Luas Target (Ha) - Real Tanam (Ha)';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom G (Sisa)',
          value: `${sisaMaster.toFixed(2)} Ha`,
        };
        calculationDetails = {
          luasTarget,
          realTanam: realTanamMaster,
          sisa: sisaMaster,
          formulaDisplay: `${luasTarget.toFixed(2)} Ha (Target) - ${realTanamMaster.toFixed(2)} Ha (Real) = ${sisaMaster.toFixed(2)} Ha`,
          statusKeterangan:
            sisaMaster === 0
              ? 'Tepat sesuai target / Selesai (0 Ha)'
              : sisaMaster > 0
              ? `Sisa lahan belum tertanam: ${sisaMaster.toFixed(2)} Ha`
              : `Realisasi tuntas (${sisaMaster.toFixed(2)} Ha)`,
        };
        break;

      case 'progress':
        lineageCategory = 'CALCULATED';
        fieldTitle = 'Detail Perhitungan % Progress (Calculated)';
        formulaDesc =
          'Progress ketercapaian penanaman dihitung secara matematis dari perbandingan antara Real Tanam terhadap Luas Target master dikalikan 100%.';
        formulaMath = 'Progress (%) = (Real Tanam / Luas Target) × 100%';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom I (% Progress)',
          value: `${progressMaster.toFixed(1)}%`,
        };
        calculationDetails = {
          luasTarget,
          realTanam: realTanamMaster,
          progress: progressMaster,
          calcProgress,
          formulaDisplay: `(${realTanamMaster.toFixed(2)} / ${luasTarget.toFixed(2)}) × 100% = ${calcProgress}%`,
          businessRule:
            'Jika Progress ≥ 100% atau Real Tanam ≥ Luas Target, lokasi otomatis berstatus SELESAI.',
        };
        break;

      case 'awaltanam':
      case 'awal_tanam':
        lineageCategory = 'SOURCE';
        fieldTitle = 'Detail Awal Tanam (Source)';
        formulaDesc =
          'Tanggal Awal Tanam bersumber langsung dari catatan master RTN serta divalidasi dengan kolom Tanggal Awal Tanam pada sheet transaksi lapangan.';
        formulaMath = 'Awal Tanam = Master RTN (Kolom J: Awal Tnm) & Input Transaksi (Kolom L: Awal Tanam)';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom J (Awal Tnm)',
          value: master?.awalTanam || '-',
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom L (Tanggal Awal Tanam)',
          count: allTxForLoc.length,
        };
        calculationDetails = {
          awalTanamMaster: master?.awalTanam || '-',
          awalTanamTransaksi: allTxForLoc.length > 0 ? allTxForLoc[0].awalTanam : '-',
          transaksiPertama: allTxForLoc.length > 0 ? allTxForLoc[0].tanggal : '-',
        };
        break;

      case 'estselesai':
      case 'est_selesai':
        lineageCategory = 'SOURCE';
        fieldTitle = 'Detail Estimasi Selesai (Source)';
        formulaDesc =
          'Tanggal Estimasi Selesai bersumber dari jadwal master RTN atau proyeksi waktu berdasarkan leadtime proses tanam.';
        formulaMath = 'Estimasi Selesai = Master RTN (Kolom H: Est. Sls)';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom H (Est. Sls)',
          value: master?.estSelesai || '-',
        };
        calculationDetails = {
          estSelesaiMaster: master?.estSelesai || '-',
          awalTanam: master?.awalTanam || '-',
          leadtime: master?.leadtime ?? '-',
        };
        break;

      case 'leadtime':
        lineageCategory = 'CALCULATED';
        fieldTitle = 'Detail Leadtime Tanam (Calculated)';
        formulaDesc =
          'Leadtime dihitung sebagai durasi waktu pelaksanaan proses penanaman dalam satuan hari antara tanggal Selesai Tanam dan Awal Tanam.';
        formulaMath = 'Leadtime = Tanggal Selesai Tanam - Tanggal Awal Tanam (Hari)';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom K (Leadtime)',
          value: master?.leadtime ? `${master.leadtime} Hari` : '-',
        };
        calculationDetails = {
          awalTanam: master?.awalTanam || '-',
          selesaiTanam: master?.estSelesai || (allTxForLoc.length > 0 ? allTxForLoc[0].selesaiTanam : '-'),
          leadtimeHari: master?.leadtime ?? null,
          formulaDisplay: 'Leadtime = Tanggal Selesai - Tanggal Awal Tanam',
        };
        break;

      case 'status':
        lineageCategory = 'CALCULATED';
        fieldTitle = 'Detail Penentuan Status (Rule-Based)';
        formulaDesc =
          'Status lokasi ditentukan secara otomatis berdasarkan aturan bisnis ketercapaian progress dan volume real tanam.';
        formulaMath =
          'SELESAI (Progress ≥ 100% / Real ≥ Luas) | PROSES (Real > 0 & Progress < 100%) | BELUM TANAM (Real = 0)';
        calculationDetails = {
          status: statusMaster,
          progress: progressMaster,
          realTanam: realTanamMaster,
          luasTarget,
          criteriaMatched:
            progressMaster >= 100 || (luasTarget > 0 && realTanamMaster >= luasTarget)
              ? 'Target terpenuhi ≥ 100% (Status: SELESAI)'
              : realTanamMaster > 0
              ? 'Penanaman sedang berlangsung (Status: PROSES)'
              : 'Belum ada realisasi penanaman (Status: BELUM TANAM)',
        };
        break;

      default:
        lineageCategory = 'SOURCE';
        fieldTitle = `Detail Profil Lokasi ${lokasiParam}`;
        formulaDesc =
          'Data master lokasi dari sheet RTN disandingkan dengan seluruh riwayat transaksi penanaman dan pemetikan dari sheet Input Real Tanam&Petik Nanas.';
        formulaMath = 'Profil Lokasi Master & Riwayat Transaksi Sumber';
        sourceMasterInfo = {
          file: 'Monitor Schedule - 2026.xlsx',
          sheet: 'RTN',
          column: 'Kolom B (LOKASI)',
          value: lokasiParam,
        };
        sourceDetailInfo = {
          file: 'Monitor Siap Nanas Update.xlsx',
          sheet: 'Input Real Tanam&Petik Nanas',
          column: 'Kolom B (Lokasi)',
          count: allTxForLoc.length,
        };
        calculationDetails = {
          luasTarget,
          realTanam: realTanamMaster,
          progress: progressMaster,
          sisa: sisaMaster,
          status: statusMaster,
        };
        break;
    }

    // Jika user secara eksplisit memilih filter aktivitas via tab di drawer
    let finalTransactions = fieldFilteredTransactions;
    if (filterAktParam !== 'DEFAULT' && filterAktParam !== 'ALL') {
      finalTransactions = allTxForLoc.filter(
        (t) => (t.aktivitas || '').toLowerCase() === filterAktParam.toLowerCase()
      );
    } else if (filterAktParam === 'ALL') {
      finalTransactions = allTxForLoc;
    }

    // Hitung total dari transaksi yang BENAR-BENAR ditampilkan (sesuai Poin 3)
    const displayedSumTotal = Number(
      finalTransactions.reduce((acc, t) => acc + (t.total || 0), 0).toFixed(3)
    );

    return NextResponse.json({
      success: true,
      lokasi: lokasiParam,
      field,
      defaultActiveTab,
      master,
      source: {
        masterFile: 'Monitor Schedule - 2026.xlsx',
        masterSheet: 'RTN',
        detailFile: 'Monitor Siap Nanas Update.xlsx',
        detailSheet: 'Input Real Tanam&Petik Nanas',
        masterSource: sourceMasterInfo,
        detailSource: sourceDetailInfo,
      },
      lineage: {
        category: lineageCategory,
        title: fieldTitle,
        formulaDesc,
        formulaMath,
        filterApplied: filterAppliedDesc,
        calculationDetails,
      },
      summary: {
        totalTanam: Number(totalTanam.toFixed(3)),
        totalPetik: Number(totalPetik.toFixed(3)),
        totalAll: Number(totalAll.toFixed(3)),
        displayedSumTotal,
        countTanam,
        countPetik,
        countTotal: allTxForLoc.length,
        countDisplayed: finalTransactions.length,
        bibitBreakdown,
        firstDate: allTxForLoc.length > 0 ? allTxForLoc[0].tanggal : null,
        lastDate: allTxForLoc.length > 0 ? allTxForLoc[allTxForLoc.length - 1].tanggal : null,
      },
      transactions: finalTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching planting detail drilldown:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat detail data.' },
      { status: 500 }
    );
  }
}

// Handler PUT: Edit Transaksi Sumber -> Otomatis Recalculate Master Planting (Sesuai Poin 19)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      transactionId,
      total,
      standar,
      besar,
      sedang,
      kecil,
      tanggal,
      aktivitas,
      luasNetto,
      jenisBibit,
      wilayah,
      awalTanam,
      selesaiTanam,
      akumTanam,
      persenTanam,
      petikKe,
    } = body;

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'transactionId wajib disertakan.' },
        { status: 400 }
      );
    }

    // 1. Ambil transaksi yang akan diedit
    const existingTx = await prisma.plantingDetail.findUnique({
      where: { id: Number(transactionId) },
    });

    if (!existingTx) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const lokasi = existingTx.lokasi;

    // 2. Update transaksi di PlantingDetail
    const updateData: any = {};
    if (total !== undefined) updateData.total = Number(parseFloat(total) || 0);
    if (standar !== undefined) updateData.standar = Number(parseFloat(standar) || 0);
    if (besar !== undefined) updateData.besar = Number(parseFloat(besar) || 0);
    if (sedang !== undefined) updateData.sedang = Number(parseFloat(sedang) || 0);
    if (kecil !== undefined) updateData.kecil = Number(parseFloat(kecil) || 0);
    if (tanggal !== undefined) updateData.tanggal = tanggal && String(tanggal).trim() !== '' && String(tanggal).trim() !== 'null' ? String(tanggal).trim() : null;
    if (aktivitas !== undefined) updateData.aktivitas = aktivitas && String(aktivitas).trim() !== '' ? String(aktivitas).trim() : null;
    if (luasNetto !== undefined) updateData.luasNetto = Number(parseFloat(luasNetto) || 0);
    if (jenisBibit !== undefined) updateData.jenisBibit = jenisBibit && String(jenisBibit).trim() !== '' ? String(jenisBibit).trim() : null;
    if (wilayah !== undefined) updateData.wilayah = wilayah && String(wilayah).trim() !== '' ? String(wilayah).trim() : null;
    if (awalTanam !== undefined) updateData.awalTanam = awalTanam && String(awalTanam).trim() !== '' && String(awalTanam).trim() !== 'null' ? String(awalTanam).trim() : null;
    if (selesaiTanam !== undefined) updateData.selesaiTanam = selesaiTanam && String(selesaiTanam).trim() !== '' && String(selesaiTanam).trim() !== 'null' ? String(selesaiTanam).trim() : null;
    if (akumTanam !== undefined) updateData.akumTanam = Number(parseFloat(akumTanam) || 0);
    if (persenTanam !== undefined) updateData.persenTanam = Number(parseFloat(persenTanam) || 0);
    if (petikKe !== undefined) updateData.petikKe = petikKe && String(petikKe).trim() !== '' ? String(petikKe).trim() : null;

    const updatedTx = await prisma.plantingDetail.update({
      where: { id: Number(transactionId) },
      data: updateData,
    });

    // 3. Recalculate: Jumlahkan seluruh transaksi beraktivitas Tanam Bibit untuk lokasi ini
    const tanamTxs = await prisma.plantingDetail.findMany({
      where: {
        lokasi: { equals: lokasi, mode: 'insensitive' },
        aktivitas: { contains: 'tanam', mode: 'insensitive' },
      },
    });

    const newRealTanam = Number(
      tanamTxs.reduce((sum, t) => sum + (t.total || 0), 0).toFixed(2)
    );

    // 4. Update data master Planting
    const plantingMaster = await prisma.planting.findFirst({
      where: { lokasi: { equals: lokasi, mode: 'insensitive' } },
    });

    let updatedMaster: any = null;
    if (plantingMaster) {
      const targetLuas = plantingMaster.luas || 0;
      const newProgress =
        targetLuas > 0 ? Number(((newRealTanam / targetLuas) * 100).toFixed(1)) : 0;
      let newStatus = 'BELUM TANAM';
      if (newProgress >= 100 || (targetLuas > 0 && newRealTanam >= targetLuas)) {
        newStatus = 'SELESAI';
      } else if (newRealTanam > 0) {
        newStatus = 'PROSES';
      }
      const newSisa = newStatus === 'SELESAI' ? 0 : Number(Math.max(0, targetLuas - newRealTanam).toFixed(2));

      updatedMaster = await prisma.planting.update({
        where: { id: plantingMaster.id },
        data: {
          realTanam: newRealTanam,
          sisa: newSisa,
          progress: newProgress,
          status: newStatus,
        },
      });
    } else {
      const landMaster = await prisma.land.findFirst({
        where: { lokasi: { equals: lokasi, mode: 'insensitive' } },
      });
      if (landMaster) {
        const targetLuas = landMaster.luasNetto || landMaster.luasBruto || 0;
        const newProgress =
          targetLuas > 0 ? Number(((newRealTanam / targetLuas) * 100).toFixed(1)) : 0;
        let newStatus = 'BELUM TANAM';
        if (newProgress >= 100 || (targetLuas > 0 && newRealTanam >= targetLuas)) {
          newStatus = 'SELESAI';
        } else if (newRealTanam > 0) {
          newStatus = 'PROSES';
        }
        const newSisa = newStatus === 'SELESAI' ? 0 : Number(Math.max(0, targetLuas - newRealTanam).toFixed(2));

        updatedMaster = await prisma.planting.create({
          data: {
            lokasi: landMaster.lokasi,
            luas: targetLuas,
            jenisBibit: landMaster.jenisBibit,
            kelasBibit: landMaster.kelasBibit,
            realTanam: newRealTanam,
            sisa: newSisa,
            estSelesai: null,
            progress: newProgress,
            awalTanam: landMaster.realMulaiTanam || landMaster.rencMulaiTanam || null,
            leadtime: landMaster.hariWaktu || null,
            status: newStatus,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Transaksi berhasil disimpan dan data Planting telah dihitung ulang.',
      updatedTransaction: updatedTx,
      updatedMaster,
      recalculated: {
        realTanam: newRealTanam,
        lokasi,
      },
    });
  } catch (error: any) {
    console.error('Error updating transaction & recalculating:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan transaksi.' },
      { status: 500 }
    );
  }
}
