'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Layers,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useTheme } from './ThemeProvider';

interface PanenViewProps {
  onOpenLand: (lokasi: string) => void;
  refreshTrigger?: number;
}

export default function PanenView({ onOpenLand, refreshTrigger = 0 }: PanenViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [schedule, setSchedule] = useState<any[]>([]);
  const [lands, setLands] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ totalLocations: number; totalHa: number; availableMonths: string[] }>({
    totalLocations: 0,
    totalHa: 0,
    availableMonths: [],
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const fetchHarvestData = () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search,
      month: selectedMonth,
    });

    fetch(`/api/panen?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setLands(d.data);
          setPagination(d.pagination);
          if (d.summary) {
            setSummary({
              totalLocations: d.summary.totalLocations,
              totalHa: d.summary.totalHa,
              availableMonths: d.summary.availableMonths,
            });
            setSchedule(d.summary.schedule);
          }
        }
      })
      .catch((err) => console.error('Error fetching harvest data:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHarvestData();
  }, [page, limit, search, selectedMonth, refreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Top Banner (Bab 26 PRD) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/20 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
              Panen & Produksi 2026 (Bab 26 PRD)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Jadwal Panen, Standard Panen & Deviasi Produksi
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mt-1">
            Data aktual dari database pemantauan estimasi bulan panen nanas (NSFC & NSSC), perbandingan terhadap standar panen,
            serta deviasi waktu kematangan buah per lokasi lahan.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shrink-0 shadow-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Estimasi Panen</span>
            <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summary.totalHa.toLocaleString('id-ID')} Ha
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold text-sm">
            {summary.totalLocations}
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Lokasi Panen</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">
            {summary.totalLocations} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Lokasi Terjadwal</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Kategori produksi NSFC & NSSC</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Estimasi Luas</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {summary.totalHa.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ha Netto</span>
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1 block">Luas produktif nanas 2026/2027</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Bulan Panen Terdaftar</span>
          <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 block">
            {summary.availableMonths.length} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Periode</span>
          </span>
          <span className="text-[11px] text-cyan-700 dark:text-cyan-400/80 mt-1 block">Rentang waktu panen buah</span>
        </div>
      </div>

      {/* Visual Chart: Proyeksi Panen (Ha) per Bulan */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 glass-panel shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Proyeksi Luas Panen per Bulan (Ha)</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Distribusi jadwal panen aktual dari database</p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={schedule.slice(0, 12)} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="month" stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
              <YAxis stroke={isDark ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
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
              <Bar dataKey="totalHa" name="Luas Panen (Ha)" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Harvest Projections Table (Bab 26 PRD) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel shadow-xs">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Proyeksi Jadwal Panen Nanas 2026
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({pagination.total} lokasi)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="ALL">Semua Bulan Panen</option>
              {summary.availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-56 flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="Cari lokasi / wilayah..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Wil</th>
                <th className="py-3 px-4">Lokasi</th>
                <th className="py-3 px-4 text-right">Luas Netto</th>
                <th className="py-3 px-4">Bibit & Kelas</th>
                <th className="py-3 px-4">Bulan Tanam</th>
                <th className="py-3 px-4">Bulan Panen Rencana</th>
                <th className="py-3 px-4">Status Produksi</th>
                <th className="py-3 px-4">Standard Panen</th>
                <th className="py-3 px-4 text-center">Deviasi (Bulan)</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat data panen aktual...</span>
                    </div>
                  </td>
                </tr>
              ) : lands.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    Tidak ada lokasi panen yang sesuai filter.
                  </td>
                </tr>
              ) : (
                lands.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onOpenLand(row.id)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded text-[10px] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                        {row.wilayah}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-purple-600 dark:text-purple-400 font-mono tracking-wide group-hover:underline">
                      {row.lokasi}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                      {row.luasNetto ? row.luasNetto.toFixed(2) : '-'} Ha
                    </td>
                    <td className="py-2.5 px-4">
                      {row.jenisBibit ? (
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {row.jenisBibit}{' '}
                          <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                            ({row.kelasBibit || 'Std'})
                          </span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {row.bulanTanam || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> {row.bulanPanen || '-'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="bg-purple-50 dark:bg-purple-500/10 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                        {row.statusProduksi ? row.statusProduksi.replace(/\d+/g, '').trim() : 'NSFC'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {row.stdPanen || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`text-xs font-bold inline-flex items-center gap-0.5 ${
                          (row.deviasiMonth ?? 0) < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : (row.deviasiMonth ?? 0) > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {row.deviasiMonth !== null ? `${row.deviasiMonth} Bulan` : '-'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLand(row.id);
                        }}
                        className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-500 hover:text-white dark:hover:text-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-all inline-flex items-center justify-center cursor-pointer"
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
