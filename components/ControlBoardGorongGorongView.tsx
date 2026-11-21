'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  Layers,
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Activity,
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
  if (!value || value === 0 || (width && width < 20)) return null;
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

const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function ControlBoardGorongGorongView() {
  const [loading, setLoading] = useState<boolean>(true);
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [dailyKedatangan, setDailyKedatangan] = useState<DailyKedatanganItem[]>([]);
  const [dailyPemasangan, setDailyPemasangan] = useState<DailyPemasanganItem[]>([]);

  // Legend Toggle States (Redup bila non-aktif, tanpa coret garis)
  const [showDrop, setShowDrop] = useState<boolean>(true);
  const [showPctKedatangan, setShowPctKedatangan] = useState<boolean>(true);
  const [showPasangManual, setShowPasangManual] = useState<boolean>(true);
  const [showPctPemasangan, setShowPctPemasangan] = useState<boolean>(true);

  // Filter Bulan (Bulan Tunggal, Default: Bulan Berjalan)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());

  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Match' | 'Check'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Tutup dropdown picker saat klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.control-board-monthpicker-container')) {
        setIsMonthPickerOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const loadControlBoardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth !== null) {
        params.set('year', String(selectedYear));
        params.set('month', String(selectedMonth + 1));
      }
      const url = `/api/gorong-gorong/control-board${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
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
    setCurrentPage(1);
    loadControlBoardData();
  }, [selectedMonth, selectedYear]);

  // Real-time synchronization
  useEffect(() => {
    const handleSync = () => {
      loadControlBoardData();
    };
    window.addEventListener('gorong_gorong_updated', handleSync);
    return () => window.removeEventListener('gorong_gorong_updated', handleSync);
  }, [selectedMonth, selectedYear]);

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

  const isDenseKedatangan = dailyKedatangan.length > 31;
  const isDensePemasangan = dailyPemasangan.length > 31;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-4 sm:p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                <Activity className="w-5 h-5 text-blue-200" />
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                Control Board Gorong-Gorong PG1
              </h1>
            </div>
            <p className="text-xs text-blue-100/80 max-w-4xl leading-relaxed">
              Summary harian verifikasi Pasang Manual vs Pasang SAP, serta monitoring tren kedatangan drop dan pemasangan <span className="whitespace-nowrap">gorong-gorong.</span>
            </p>
          </div>

          {/* Filter Bulan (Bulan Tunggal) */}
          <div className="relative control-board-monthpicker-container shrink-0 self-start sm:self-center">
            <button
              type="button"
              onClick={() => {
                if (!isMonthPickerOpen && selectedYear) setPickerYear(selectedYear);
                setIsMonthPickerOpen((prev) => !prev);
              }}
              className={`flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors shadow-2xs ${
                selectedMonth !== null
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                  : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-200" />
                <span>
                  {selectedMonth !== null
                    ? `${MONTH_NAMES_SHORT[selectedMonth]} ${selectedYear}`
                    : 'Semua Bulan'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ${
                  isMonthPickerOpen ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </button>

            {isMonthPickerOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 p-3.5 rounded-2xl bg-[#1e2330] text-white border border-slate-700/80 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                {/* Header: Year Nav */}
                <div className="flex items-center justify-between px-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y - 1)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold tracking-tight text-white">{pickerYear}</span>
                  <button
                    type="button"
                    onClick={() => setPickerYear((y) => y + 1)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Grid 12 Bulan (Pilih Bulan Langsung Aktif) */}
                <div className="grid grid-cols-3 gap-1.5 my-2">
                  {MONTH_NAMES_SHORT.map((mName, mIdx) => {
                    const isSelected = selectedMonth === mIdx && selectedYear === pickerYear;
                    return (
                      <button
                        key={mName}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(mIdx);
                          setSelectedYear(pickerYear);
                          setIsMonthPickerOpen(false);
                        }}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00873D] text-white font-black shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                      >
                        {mName}
                      </button>
                    );
                  })}
                </div>

                {/* Footer: Semua Bulan / Bulan Ini */}
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMonth(null);
                      setIsMonthPickerOpen(false);
                    }}
                    className="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                  >
                    Semua Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      setSelectedMonth(now.getMonth());
                      setSelectedYear(now.getFullYear());
                      setPickerYear(now.getFullYear());
                      setIsMonthPickerOpen(false);
                    }}
                    className="text-slate-400 hover:text-white font-medium cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. GRAFIK % KEDATANGAN DAN % PEMASANGAN HARIAN (DIPINDAHKAN KE ATAS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: % Kedatangan Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                {selectedMonth !== null
                  ? `Batang: Drop • Garis: % Kedatangan (${MONTH_NAMES_SHORT[selectedMonth]} ${selectedYear})`
                  : 'Batang: Drop • Garis: % Kedatangan'}
              </p>
            </div>

            {/* Tombol Legenda Sejajar Judul Grafik */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDrop((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showDrop
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-40 hover:opacity-70'
                }`}
                title="Klik untuk tampilkan/sembunyikan data Drop"
              >
                <span className={`w-2.5 h-2.5 rounded-xs ${showDrop ? 'bg-blue-500' : 'bg-slate-400'}`} />
                <span>Drop</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPctKedatangan((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showPctKedatangan
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-40 hover:opacity-70'
                }`}
                title="Klik untuk tampilkan/sembunyikan data % Kedatangan"
              >
                <span className={`w-2.5 h-0.5 rounded-full ${showPctKedatangan ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span>% Kedatangan</span>
              </button>
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
                      if (name === 'dropPcs' || name === 'Drop') return [`${val} pcs`, 'Drop'];
                      if (name === 'pctKedatangan' || name === '% Kedatangan') return [`${val}%`, '% Kedatangan'];
                      return [val, name];
                    }}
                  />
                  {showDrop && (
                    <Bar
                      yAxisId="left"
                      dataKey="dropPcs"
                      name="Drop"
                      fill="#3b82f6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                      label={isDenseKedatangan ? undefined : renderCustomBarLabel}
                    />
                  )}
                  {showPctKedatangan && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pctKedatangan"
                      name="% Kedatangan"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={isDenseKedatangan ? false : { fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      label={isDenseKedatangan ? undefined : renderCustomLineLabel}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Grafik 2: % Pemasangan Harian */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                {selectedMonth !== null
                  ? `Batang: Pasang Manual • Garis: % Pemasangan (${MONTH_NAMES_SHORT[selectedMonth]} ${selectedYear})`
                  : 'Batang: Pasang Manual • Garis: % Pemasangan'}
              </p>
            </div>

            {/* Tombol Legenda Sejajar Judul Grafik */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPasangManual((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showPasangManual
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-40 hover:opacity-70'
                }`}
                title="Klik untuk tampilkan/sembunyikan data Pasang Manual"
              >
                <span className={`w-2.5 h-2.5 rounded-xs ${showPasangManual ? 'bg-amber-500' : 'bg-slate-400'}`} />
                <span>Pasang Manual</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPctPemasangan((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  showPctPemasangan
                    ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 opacity-40 hover:opacity-70'
                }`}
                title="Klik untuk tampilkan/sembunyikan data % Pemasangan"
              >
                <span className={`w-2.5 h-0.5 rounded-full ${showPctPemasangan ? 'bg-purple-500' : 'bg-slate-400'}`} />
                <span>% Pemasangan</span>
              </button>
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
                    tick={{ fontSize: 11, fill: '#8b5cf6' }}
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
                      if (name === 'pasangPcs' || name === 'Pasang Manual') return [`${val} pcs`, 'Pasang Manual'];
                      if (name === 'pctPemasangan' || name === '% Pemasangan') return [`${val}%`, '% Pemasangan'];
                      return [val, name];
                    }}
                  />
                  {showPasangManual && (
                    <Bar
                      yAxisId="left"
                      dataKey="pasangPcs"
                      name="Pasang Manual"
                      fill="#f59e0b"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={45}
                      label={isDensePemasangan ? undefined : renderCustomBarLabel}
                    />
                  )}
                  {showPctPemasangan && (
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="pctPemasangan"
                      name="% Pemasangan"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={isDensePemasangan ? false : { fill: '#8b5cf6', r: 4, strokeWidth: 2, stroke: '#ffffff' }}
                      label={isDensePemasangan ? undefined : renderCustomLineLabel}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 3. TABEL VERIFIKASI HARIAN PASANG MANUAL VS SAP (DIPINDAHKAN KE BAWAH) */}
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
                {selectedMonth !== null
                  ? `Pencocokan pasang manual & SAP periode ${MONTH_NAMES_SHORT[selectedMonth]} ${selectedYear}`
                  : 'Pencocokan kuantitas pasang manual (form input) dan SAP (excel upload) per tanggal & lokasi'}
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
                placeholder="Cari Lokasi"
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
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/40">
                  Ø40
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-950/40">
                  Ø60
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40">
                  Ø80
                </th>
                <th colSpan={2} className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 text-purple-700 dark:text-purple-400 bg-purple-500/10 dark:bg-purple-950/40">
                  Ø100
                </th>
              </tr>

              {/* Row 3 Header: Manual vs SAP */}
              <tr className="border-t border-slate-200/70 dark:border-slate-700/70 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-emerald-500/5 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-300">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-emerald-500/5 dark:bg-emerald-950/20 text-slate-600 dark:text-slate-300">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-blue-500/5 dark:bg-blue-950/20 text-slate-600 dark:text-slate-300">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-blue-500/5 dark:bg-blue-950/20 text-slate-600 dark:text-slate-300">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-amber-500/5 dark:bg-amber-950/20 text-slate-600 dark:text-slate-300">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-amber-500/5 dark:bg-amber-950/20 text-slate-600 dark:text-slate-300">SAP</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-purple-500/5 dark:bg-purple-950/20 text-slate-600 dark:text-slate-300">Manual</th>
                <th className="px-2 py-1 border-r border-slate-200 dark:border-slate-700 bg-purple-500/5 dark:bg-purple-950/20 text-slate-600 dark:text-slate-300">SAP</th>
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

                  // Aturan highlight: Jika manual 0 tapi SAP ada angkanya (> 0), tidak perlu dihighlight
                  const isDiff40 = row.d40Manual !== row.d40Sap && !(row.d40Manual === 0 && row.d40Sap > 0);
                  const isDiff60 = row.d60Manual !== row.d60Sap && !(row.d60Manual === 0 && row.d60Sap > 0);
                  const isDiff80 = row.d80Manual !== row.d80Sap && !(row.d80Manual === 0 && row.d80Sap > 0);
                  const isDiff100 = row.d100Manual !== row.d100Sap && !(row.d100Manual === 0 && row.d100Sap > 0);

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
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff40 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d40Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff40 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d40Sap}
                      </td>

                      {/* Ø60 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff60 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d60Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff60 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d60Sap}
                      </td>

                      {/* Ø80 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff80 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d80Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff80 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d80Sap}
                      </td>

                      {/* Ø100 Manual & SAP */}
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff100 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
                        {row.d100Manual}
                      </td>
                      <td className={`px-2 py-2 border-r border-slate-200/70 dark:border-slate-800/70 text-center font-mono font-bold ${isDiff100 ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-950/40' : 'text-slate-800 dark:text-slate-100'}`}>
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
          <div className="flex items-center justify-between pt-2 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <div>
              Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs text-slate-700 dark:text-slate-300"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs font-semibold text-xs text-slate-700 dark:text-slate-300"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
