'use client';

import React, { useState, useEffect } from 'react';
import {
  Sprout,
  Calendar,
  CheckCircle2,
  Clock,
  CircleDashed,
  TrendingUp,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useTheme } from './ThemeProvider';

interface TanamViewProps {
  tanamCounts?: {
    selesai: number;
    proses: number;
    belum: number;
  };
  totalRealisasiHa: number;
  totalLuasNetto: number;
  plantingByMonth: Array<{
    bulan: string;
    totalLahan: number;
    totalLuasNetto: number;
  }>;
  onOpenLand: (lokasi: string) => void;
  refreshTrigger?: number;
}

export default function TanamView({
  tanamCounts = { selesai: 0, proses: 0, belum: 0 },
  totalRealisasiHa,
  totalLuasNetto,
  plantingByMonth = [],
  onOpenLand,
  refreshTrigger = 0,
}: TanamViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [lands, setLands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [wilayah, setWilayah] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [tanamMonthly, setTanamMonthly] = useState<any[]>([]);

  const total = tanamCounts.selesai + tanamCounts.proses + tanamCounts.belum;
  const pctSelesai = total > 0 ? Math.round((tanamCounts.selesai / total) * 100) : 0;
  const pctProses = total > 0 ? Math.round((tanamCounts.proses / total) * 100) : 0;
  const pctBelum = total > 0 ? Math.round((tanamCounts.belum / total) * 100) : 0;

  // Fetch Monthly Tanam target vs realization from charts API
  useEffect(() => {
    fetch('/api/dashboard/charts')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.monthlyTanam) {
          setTanamMonthly(d.data.monthlyTanam);
        }
      })
      .catch(() => {});
  }, [refreshTrigger]);

  // Fetch planting land list from /api/tanam
  const fetchTanamLands = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      wilayah,
      status: statusFilter,
    });

    fetch(`/api/tanam?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLands(d.data);
          setPagination(d.pagination);
        }
      })
      .catch((err) => console.error('Error fetching tanam lands:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTanamLands();
  }, [page, limit, search, wilayah, statusFilter, refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Top Banner (Bab 24 PRD) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-slate-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-slate-900 border border-emerald-200 dark:border-emerald-500/20 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sprout className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Monitoring Tanam 2026 (Bab 24 PRD)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Jadwal, Realisasi & Detail Lokasi Penanaman Nanas
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mt-1">
            Data pemantauan status penanaman per lokasi, jadwal mulai/selesai tanam rencana vs realisasi,
            durasi tanam (hari waktu), serta distribusi penanaman menurut bulan dan wilayah.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shrink-0 shadow-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Realisasi Tanam</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalRealisasiHa.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ha
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm">
            {pctSelesai}%
          </div>
        </div>
      </div>

      {/* KPI Status Row (Istilah Lokasi - Bab 11 PRD) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 glass-panel flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Selesai Tanam</span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
              {tanamCounts.selesai} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Lokasi</span>
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300/80 mt-1 block font-semibold">
              {pctSelesai}% dari total lokasi
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-amber-200 dark:border-amber-500/30 glass-panel flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Sedang Proses Tanam</span>
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {tanamCounts.proses} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Lokasi</span>
            </span>
            <span className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1 block font-semibold">
              {pctProses}% dari total lokasi
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 glass-panel flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Belum Mulai Tanam</span>
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-300 mt-1 block">
              {tanamCounts.belum} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Lokasi</span>
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-semibold">
              {pctBelum}% dalam tahap olah tanah
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <CircleDashed className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visualizations Grid (Bab 24 PRD: Rencana vs Realisasi & Distribusi Tanam) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Rencana vs Realisasi Tanam (from sheet Summ) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Rencana vs Realisasi Tanam 2026 (Ha)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Data bulanan dari sheet Summ (Tanam)</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tanamMonthly} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(val: any) => [`${Number(val).toFixed(1)} Ha`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                <Bar dataKey="rencana" name="Rencana (Ha)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="realisasi" name="Realisasi (Ha)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rfc" name="Target (Ha)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Distribusi Luas per Bulan Tanam */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Distribusi Luas per Bulan Tanam</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Total Luas Netto (Ha) per periode tanam</p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plantingByMonth} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
                <XAxis dataKey="bulan" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} />
                <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(val: any) => [`${Number(val).toLocaleString('id-ID')} Ha`]}
                />
                <Bar dataKey="totalLuasNetto" name="Luas Netto (Ha)" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Detail Table (Bab 24 PRD: Rencana/Realisasi Mulai & Selesai Tanam, Bibit, Kelas, Lokasi, Wilayah) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel flex flex-col shadow-xs">
        {/* Table Filter Controls */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Tabel Jadwal & Realisasi Penanaman
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({pagination.total} lokasi)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">Semua Status Tanam</option>
              <option value="SELESAI">Selesai Tanam (100%)</option>
              <option value="PROSES">Proses Tanam (50%)</option>
              <option value="BELUM">Belum Mulai</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-56 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Cari lokasi / wilayah / bibit..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Table Content (Bab 24 PRD) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Wil</th>
                <th className="py-3 px-3">Lokasi</th>
                <th className="py-3 px-3 text-right">Luas Netto</th>
                <th className="py-3 px-3">Bibit & Kelas</th>
                <th className="py-3 px-3">Bulan Tanam</th>
                <th className="py-3 px-3 text-center bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">Renc Mulai</th>
                <th className="py-3 px-3 text-center bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">Renc Selesai</th>
                <th className="py-3 px-3 text-center bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">Real Mulai</th>
                <th className="py-3 px-3 text-center bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">Real Selesai</th>
                <th className="py-3 px-3 text-center">Durasi (Hari)</th>
                <th className="py-3 px-3 text-center">Status Tanam</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat jadwal penanaman...</span>
                    </div>
                  </td>
                </tr>
              ) : lands.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada lokasi yang sesuai kriteria penanaman.
                  </td>
                </tr>
              ) : (
                lands.map((land) => (
                  <tr
                    key={land.id}
                    onClick={() => onOpenLand(land.id)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        {land.wilayah}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wide group-hover:underline">
                      {land.lokasi}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                      {land.luasNetto ? land.luasNetto.toFixed(2) : '-'} Ha
                    </td>
                    <td className="py-2.5 px-3">
                      {land.jenisBibit ? (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {land.jenisBibit}{' '}
                          <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                            ({land.kelasBibit || 'Std'})
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {land.bulanTanam || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-700 dark:text-slate-400 bg-blue-50/60 dark:bg-blue-950/10">
                      {land.rencMulaiTanam || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-slate-700 dark:text-slate-400 bg-blue-50/60 dark:bg-blue-950/10">
                      {land.rencSelesaiTanam || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/10 font-semibold">
                      {land.realMulaiTanam || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/10 font-semibold">
                      {land.realSelesaiTanam || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {land.hariWaktu ? `${land.hariWaktu} Hari` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          land.plantingStatus === 'Selesai Tanam'
                            ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                            : land.plantingStatus === 'Proses Tanam'
                            ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {land.plantingStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLand(land.id);
                        }}
                        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:text-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-all inline-flex items-center justify-center cursor-pointer"
                        title="Lihat Detail Profil Lokasi"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Tampilkan per halaman:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span className="ml-2">
              Halaman {page} dari {pagination.totalPages}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-slate-900 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
