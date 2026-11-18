'use client';

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Truck,
  CheckCircle2,
  Clock,
  Layers,
  XCircle,
} from 'lucide-react';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];

export default function MonitorSulamView() {
  const [loading, setLoading] = useState(true);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [kpi, setKpi] = useState<any>({
    totalLokasi: 0,
    totalPermintaanRit: 0,
    totalDropRit: 0,
    totalRealSulamRit: 0,
    overallPctDrop: 0,
    overallPctSulam: 0,
  });

  const [search, setSearch] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [isWilayahOpen, setIsWilayahOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent && dataRows.length === 0) setLoading(true);
      const wilParam = selectedWilayah.length > 0 && selectedWilayah.length < WILAYAH_LIST.length
        ? selectedWilayah.join(',')
        : '';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (wilParam) params.set('wilayah', wilParam);

      const res = await fetch(`/api/sulam/monitoring?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataRows(json.rows || []);
        if (json.kpi) setKpi(json.kpi);
        if (json.pagination) setTotalCount(json.pagination.total);
      }
    } catch (err) {
      console.error('Error fetching sulam monitoring:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, search, selectedWilayah]);

  // Real-time auto-sync saat ada pembaruan data master sulam
  useEffect(() => {
    const handleSync = () => {
      fetchData(true);
    };
    window.addEventListener('sulam_updated', handleSync);
    window.addEventListener('master_data_updated', handleSync);
    return () => {
      window.removeEventListener('sulam_updated', handleSync);
      window.removeEventListener('master_data_updated', handleSync);
    };
  }, [page, search, selectedWilayah]);

  const handleToggleWilayah = (wil: string) => {
    if (selectedWilayah.includes(wil)) {
      setSelectedWilayah(selectedWilayah.filter((w) => w !== wil));
    } else {
      setSelectedWilayah([...selectedWilayah, wil]);
    }
    setPage(1);
  };

  const handleSelectAllWilayah = () => {
    if (selectedWilayah.length === WILAYAH_LIST.length || selectedWilayah.length === 0) {
      setSelectedWilayah([]);
    } else {
      setSelectedWilayah([...WILAYAH_LIST]);
    }
    setPage(1);
  };

  const getWilayahLabel = () => {
    if (selectedWilayah.length === 0 || selectedWilayah.length === WILAYAH_LIST.length) {
      return 'Semua Wilayah';
    }
    if (selectedWilayah.length === 1) {
      return selectedWilayah[0];
    }
    return `${selectedWilayah.length} Wilayah`;
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-4">
      {/* Top Banner & Export Excel */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-emerald-700 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <Sprout className="w-4 h-4 text-white" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Monitoring List Sulam</h2>
          </div>
          <p className="text-xs text-white/80 max-w-xl">
            Tabel summary dinamis yang mengkalkulasi status, permintaan ritase, drop bibit, dan realisasi sulam secara otomatis dari Master Data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs transition-colors border border-white/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <a
            href="/api/sulam/export"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Lokasi</span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalCount} Petak</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Permintaan Rit</span>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{kpi.totalPermintaanRit} Rit</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Drop Real</span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{kpi.totalDropRit} Rit</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Realisasi Sulam</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{kpi.totalRealSulamRit} Rit</div>
        </div>
      </div>

      {/* Filter Bar & Controls */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-3 relative z-30">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari Lokasi / Jenis / Kelas..."
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsWilayahOpen(!isWilayahOpen)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Filter className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{getWilayahLabel()}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isWilayahOpen ? 'rotate-180 text-emerald-600' : 'text-slate-400'}`} />
          </button>

          {isWilayahOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsWilayahOpen(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={handleSelectAllWilayah}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Semua Wilayah</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      selectedWilayah.length === 0 || selectedWilayah.length === WILAYAH_LIST.length
                        ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/50 scale-110'
                        : 'bg-slate-200 dark:bg-slate-600'
                    }`}
                  />
                </button>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {WILAYAH_LIST.map((wil) => {
                    const isSelected = selectedWilayah.includes(wil);
                    return (
                      <button
                        key={wil}
                        type="button"
                        onClick={() => handleToggleWilayah(wil)}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer"
                      >
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{wil}</span>
                        <span
                          className={`w-2 h-2 rounded-full transition-all ${
                            isSelected
                              ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/50 scale-110'
                              : 'bg-slate-200 dark:bg-slate-600'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Table: 17 Kolom Berurutan List Sulam */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[640px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold tracking-wider shadow-xs">
              {/* Baris 1 Header Grup */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[45px]">No</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[70px]">1. Wilayah</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[85px]">2. Lokasi</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">3. Jenis Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">4. Kelas Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">5. Tgl Rawat</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">6. Tgl STD Forcing</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">7. Tgl F Prod</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">8. Tgl F Max</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">9. Tgl Order</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[95px]">10. Umur Forcing</th>
                <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-blue-50/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                  11. Permintaan Ritase
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                  12. Monitor Drop
                </th>
                <th colSpan={5} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                  13. Monitor Sulam
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[140px]">14. Spek Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[130px]">15. Ket Proses</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[120px]">16. Ket Mati</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[130px]">17. Ket Ritase</th>
              </tr>
              {/* Baris 2 Sub Header */}
              <tr className="border-b border-slate-200 dark:border-slate-700 text-[10px]">
                {/* 11. Permintaan Ritase */}
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-blue-50/40 dark:bg-blue-950/20 min-w-[75px]">Jumlah</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-blue-50/40 dark:bg-blue-950/20 min-w-[65px]">Rit</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-blue-50/40 dark:bg-blue-950/20 min-w-[65px]">Real Rit</th>

                {/* 12. Monitor Drop */}
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/40 dark:bg-amber-950/20 min-w-[65px]">Real</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/40 dark:bg-amber-950/20 min-w-[65px]">Total</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/40 dark:bg-amber-950/20 min-w-[65px]">Dev</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/40 dark:bg-amber-950/20 min-w-[70px]">%Drop</th>

                {/* 13. Monitor Sulam */}
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 min-w-[65px]">Real</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 min-w-[65px]">Manual</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 min-w-[65px]">Saldo</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 min-w-[70px]">%Sulam</th>
                <th className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/40 dark:bg-emerald-950/20 min-w-[95px]">Last Sulam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={24} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                      <p className="text-xs font-semibold">Mengkalkulasi summary list sulam...</p>
                    </div>
                  </td>
                </tr>
              ) : dataRows.length === 0 ? (
                <tr>
                  <td colSpan={24} className="py-16 text-center text-slate-400">
                    <p className="text-xs font-semibold">Tidak ada data petak yang cocok.</p>
                  </td>
                </tr>
              ) : (
                dataRows.map((row, idx) => (
                  <tr
                    key={row.lokasi || idx}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* No */}
                    <td className="py-2 px-2 text-center text-slate-500 border-r border-slate-200/70 dark:border-slate-800/70 font-mono">
                      {(page - 1) * pageSize + idx + 1}
                    </td>

                    {/* 1. Wilayah */}
                    <td className="py-2 px-2.5 text-center font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.wilayah}
                    </td>

                    {/* 2. Lokasi */}
                    <td className="py-2 px-2.5 text-center font-black text-slate-900 dark:text-white border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.lokasi}
                    </td>

                    {/* 3. Jenis Bibit */}
                    <td className="py-2 px-2.5 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.jenisBibit}
                    </td>

                    {/* 4. Kelas Bibit */}
                    <td className="py-2 px-2.5 text-center text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.kelasBibit}
                    </td>

                    {/* 5. Tanggal Rawat */}
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px]">
                      {row.tglRawat}
                    </td>

                    {/* 6. Tanggal STD Forcing */}
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px]">
                      {row.tglStdForcing}
                    </td>

                    {/* 7. Tanggal F Prod */}
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px]">
                      {row.tglFProd}
                    </td>

                    {/* 8. Tanggal F Max */}
                    <td className="py-2 px-2 text-center text-slate-700 dark:text-slate-300 font-semibold border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px]">
                      {row.tglFMax}
                    </td>

                    {/* 9. Tanggal Order */}
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px]">
                      {row.tglOrder}
                    </td>

                    {/* 10. Umur Forcing */}
                    <td className="py-2 px-2 text-center font-bold text-teal-700 dark:text-teal-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.umurForcing !== '-' ? `${row.umurForcing} bln` : '-'}
                    </td>

                    {/* 11. Permintaan Ritase (Jumlah, Rit, Real Rit) */}
                    <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800/70 bg-blue-50/20 dark:bg-blue-950/10">
                      {row.permintaanJumlah ? Number(row.permintaanJumlah).toLocaleString('id-ID') : 0}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70 bg-blue-50/20 dark:bg-blue-950/10">
                      {row.permintaanRit}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70 bg-blue-50/20 dark:bg-blue-950/10">
                      {row.permintaanRealRit}
                    </td>

                    {/* 12. Monitor Drop (Real, Total, Dev, %Drop) */}
                    <td className="py-2 px-2 text-center font-bold text-amber-700 dark:text-amber-400 border-r border-slate-200/70 dark:border-slate-800/70 bg-amber-50/20 dark:bg-amber-950/10">
                      {row.dropReal}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70 bg-amber-50/20 dark:bg-amber-950/10">
                      {row.dropTotal}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70 bg-amber-50/20 dark:bg-amber-950/10">
                      {row.dropDev}
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200/70 dark:border-slate-800/70 bg-amber-50/20 dark:bg-amber-950/10">
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        row.dropPct >= 100
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : row.dropPct > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'text-slate-400'
                      }`}>
                        {row.dropPct}%
                      </span>
                    </td>

                    {/* 13. Monitor Sulam (Real, Manual, Saldo, %Sulam, Last Sulam) */}
                    <td className="py-2 px-2 text-center font-bold text-emerald-700 dark:text-emerald-400 border-r border-slate-200/70 dark:border-slate-800/70 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.sulamReal}
                    </td>
                    <td className="py-2 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-200/70 dark:border-slate-800/70 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.sulamManual}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200/70 dark:border-slate-800/70 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.sulamSaldo}
                    </td>
                    <td className="py-2 px-2 text-center font-bold border-r border-slate-200/70 dark:border-slate-800/70 bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.sulamPct !== '-' ? (
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                          Number(row.sulamPct) >= 100
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : Number(row.sulamPct) > 0
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'text-slate-400'
                        }`}>
                          {row.sulamPct}%
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70 font-mono text-[11px] bg-emerald-50/20 dark:bg-emerald-950/10">
                      {row.sulamLastDate}
                    </td>

                    {/* 14. Spek Bibit */}
                    <td className="py-2 px-2.5 text-center font-semibold text-emerald-700 dark:text-emerald-300 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.spekBibit}
                    </td>

                    {/* 15. Keterangan Proses */}
                    <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.keteranganProses}
                    </td>

                    {/* 16. Keterangan Mati */}
                    <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400 border-r border-slate-200/70 dark:border-slate-800/70">
                      {row.keteranganMati}
                    </td>

                    {/* 17. Keterangan Ritase */}
                    <td className="py-2 px-2.5 text-center text-slate-600 dark:text-slate-400">
                      {row.keteranganRitase}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Clean Pagination Footer */}
        <div className="py-3.5 px-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400 font-semibold">
          <div>
            Halaman {page} dari {totalPages} ({totalCount} total petak)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
