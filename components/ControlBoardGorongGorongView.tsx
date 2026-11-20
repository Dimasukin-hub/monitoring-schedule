'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileCheck2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

interface TableRow {
  rawDate: string;
  tanggal: string;
  lokasi: string;
  d40Manual: number;
  d40Sap: number;
  d60Manual: number;
  d60Sap: number;
  d80Manual: number;
  d80Sap: number;
  d100Manual: number;
  d100Sap: number;
  status: 'Match' | 'Check';
}

interface SummaryData {
  totalOrder: number;
  totalDrop: number;
  totalPasangManual: number;
  totalPasangSap: number;
  pctKedatangan: number;
  pctPemasangan: number;
}

interface DailyKedatanganItem {
  dateStr: string;
  label: string;
  dropPcs: number;
  cumDropPcs: number;
  pctKedatangan: number;
}

interface DailyPemasanganItem {
  dateStr: string;
  label: string;
  pasangPcs: number;
  cumPasangPcs: number;
  pctPemasangan: number;
}

// Custom Label untuk Nilai Bar
const renderCustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#64748b"
      textAnchor="middle"
      fontSize={10}
      fontWeight="bold"
      className="select-none"
    >
      {value}
    </text>
  );
};

// Custom Label untuk Persentase Line
const renderCustomLineLabel = (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;
  return (
    <text
      x={x}
      y={y - 10}
      fill="#10b981"
      textAnchor="middle"
      fontSize={10}
      fontWeight="bold"
      className="select-none"
    >
      {value}%
    </text>
  );
};

export default function ControlBoardGorongGorongView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<SummaryData>({
    totalOrder: 0,
    totalDrop: 0,
    totalPasangManual: 0,
    totalPasangSap: 0,
    pctKedatangan: 0,
    pctPemasangan: 0,
  });
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [dailyKedatangan, setDailyKedatangan] = useState<DailyKedatanganItem[]>([]);
  const [dailyPemasangan, setDailyPemasangan] = useState<DailyPemasanganItem[]>([]);

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Match' | 'Check'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const loadControlBoardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gorong-gorong/control-board');
      const json = await res.json();
      if (json.success) {
        setSummary(json.summary || {
          totalOrder: 0,
          totalDrop: 0,
          totalPasangManual: 0,
          totalPasangSap: 0,
          pctKedatangan: 0,
          pctPemasangan: 0,
        });
        setTableData(json.tableVerification || []);
        setDailyKedatangan(json.dailyKedatangan || []);
        setDailyPemasangan(json.dailyPemasangan || []);
      }
    } catch (err) {
      console.error('Failed to fetch control board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadControlBoardData();
  }, []);

  // Filter table data
  const filteredTableData = tableData.filter((row) => {
    const matchSearch =
      !searchTerm ||
      row.lokasi.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.tanggal.includes(searchTerm);
    const matchStatus = statusFilter === 'ALL' || row.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredTableData.length / pageSize) || 1;
  const paginatedData = filteredTableData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
              <Activity className="w-5 h-5 text-blue-200" />
            </span>
            <h1 className="text-lg sm:text-xl font-black tracking-tight">
              Control Board Gorong-Gorong PG1
            </h1>
          </div>
          <p className="text-xs text-blue-100/80 max-w-2xl leading-relaxed">
            Summary harian verifikasi Pasang Manual vs Pasang SAP, serta monitoring tren kedatangan drop dan pemasangan gorong-gorong.
          </p>
        </div>

        <button
          onClick={loadControlBoardData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors border border-white/20 cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Order */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Order</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white font-mono">
            {summary.totalOrder.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">pcs</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Baseline kebutuhan petak</div>
        </div>

        {/* Total Drop & % Kedatangan */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Drop</span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {summary.totalDrop.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              ({summary.pctKedatangan}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Total drop ke lapangan</div>
        </div>

        {/* Total Pasang Manual */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pasang Manual</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {summary.totalPasangManual.toLocaleString('id-ID')}
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
              ({summary.pctPemasangan}%)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Input verifikator & mandor</div>
        </div>

        {/* Total Pasang SAP */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Pasang SAP (Real)</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {summary.totalPasangSap.toLocaleString('id-ID')}
            <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">pcs</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">Tersinkronisasi ke Monitor Gorong-Gorong</div>
        </div>
      </div>

      {/* 3. TABEL VERIFIKASI HARIAN PASANG MANUAL VS SAP */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Table Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Verifikasi Harian Pasang Manual vs SAP
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pencocokan kuantitas pasang manual (form input) dan SAP (excel upload) per tanggal & lokasi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Semua ({tableData.length})
              </button>
              <button
                onClick={() => { setStatusFilter('Match'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'Match'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-emerald-600'
                }`}
              >
                Match ({tableData.filter((r) => r.status === 'Match').length})
              </button>
              <button
                onClick={() => { setStatusFilter('Check'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  statusFilter === 'Check'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-amber-600'
                }`}
              >
                Check ({tableData.filter((r) => r.status === 'Check').length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari lokasi / tanggal..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40 w-44 sm:w-52"
              />
            </div>
          </div>
        </div>

        {/* The 3-Tier Merged Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              {/* Row 1 Header */}
              <tr>
                <th rowSpan={3} className="px-3 py-2 border-r border-slate-200 dark:border-slate-700 w-12 text-center">
                  No
                </th>
                <th rowSpan={3} className="px-3.5 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                  Tanggal
                </th>
                <th rowSpan={3} className="px-3.5 py-2 border-r border-slate-200 dark:border-slate-700 text-center">
                  Lokasi
                </th>
                <th colSpan={8} className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 text-center bg-slate-200/60 dark:bg-slate-700/60">
                  Diameter
                </th>
                <th rowSpan={3} className="px-4 py-2 text-center w-24">
                  Status
                </th>
              </tr>

              {/* Row 2 Header: Diameter sizes */}
              <tr className="border-t border-slate-200/70 dark:border-slate-700/70 text-[11px]">
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                  Ø40
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 bg-blue-500/10">
                  Ø60
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 bg-amber-500/10">
                  Ø80
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400 bg-purple-500/10">
                  Ø100
                </th>
              </tr>

              {/* Row 3 Header: Manual vs SAP */}
              <tr className="border-t border-slate-200/70 dark:border-slate-700/70 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-emerald-500/5">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-emerald-500/5">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-blue-500/5">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-blue-500/5">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-amber-500/5">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-amber-500/5">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-purple-500/5">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-purple-500/5">SAP</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-mono">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-slate-400 font-sans italic text-xs">
                    {loading ? 'Memuat data verifikasi...' : 'Tidak ada data verifikasi yang sesuai.'}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const isMatch = row.status === 'Match';
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={`${row.rawDate}_${row.lokasi}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-3 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center text-slate-400 font-sans text-[11px]">
                        {rowNumber}
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center text-slate-600 dark:text-slate-400 text-xs">
                        {row.tanggal}
                      </td>
                      <td className="px-3.5 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-bold font-sans text-xs">
                        {row.lokasi}
                      </td>

                      {/* Ø40 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d40Manual !== row.d40Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d40Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d40Manual !== row.d40Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d40Sap}
                      </td>

                      {/* Ø60 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d60Manual !== row.d60Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d60Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d60Manual !== row.d60Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d60Sap}
                      </td>

                      {/* Ø80 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d80Manual !== row.d80Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d80Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d80Manual !== row.d80Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d80Sap}
                      </td>

                      {/* Ø100 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d100Manual !== row.d100Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d100Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center ${row.d100Manual !== row.d100Sap ? 'text-amber-600 font-bold bg-amber-50/30' : ''}`}>
                        {row.d100Sap}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center font-sans">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                            isMatch
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isMatch ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Match
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Check
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
            <span>
              Menampilkan {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredTableData.length)} dari {filteredTableData.length} baris
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. GRAFIK % KEDATANGAN DAN % PEMASANGAN HARIAN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: % Kedatangan Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Grafik % Kedatangan Harian
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Batang: Volume Drop Harian (pcs) • Garis: Progres % Kedatangan Kumulatif
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {dailyKedatangan.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada transaksi drop harian untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyKedatangan}
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    unit=" pcs"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#10b981' }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => {
                      if (name === 'dropPcs') return [`${val} pcs`, 'Drop Harian'];
                      if (name === 'pctKedatangan') return [`${val}%`, '% Kedatangan'];
                      return [val, name];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="dropPcs"
                    name="Drop Harian (pcs)"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                    label={renderCustomBarLabel}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctKedatangan"
                    name="% Kedatangan"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    label={renderCustomLineLabel}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Grafik 2: % Pemasangan Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Grafik % Pemasangan Harian
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Batang: Volume Pasang Manual Harian (pcs) • Garis: Progres % Pemasangan Kumulatif
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {dailyPemasangan.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Belum ada transaksi pasang manual harian untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyPemasangan}
                  margin={{ top: 20, right: 20, bottom: 20, left: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    unit=" pcs"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#f59e0b' }}
                    tickLine={false}
                    axisLine={false}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any, name: any) => {
                      if (name === 'pasangPcs') return [`${val} pcs`, 'Pasang Manual'];
                      if (name === 'pctPemasangan') return [`${val}%`, '% Pemasangan'];
                      return [val, name];
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="pasangPcs"
                    name="Pasang Manual (pcs)"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={45}
                    label={renderCustomBarLabel}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="pctPemasangan"
                    name="% Pemasangan"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                    label={renderCustomLineLabel}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

