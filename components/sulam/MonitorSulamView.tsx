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
  Package,
  Activity,
  PieChart as LucidePieChart,
  BarChart3,
  Percent,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const WILAYAH_LIST = ['AW01', 'AW02', 'AW03', 'AW04', 'AW05', 'AW06', 'AW07'];

// Custom Label untuk Nilai Bar
const renderCustomBarVal = (props: any) => {
  const { x, y, width, value } = props;
  if (!value || value === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
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
const renderCustomLineVal = (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;
  return (
    <text
      x={x}
      y={y - 8}
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

export default function MonitorSulamView() {
  const [loading, setLoading] = useState(true);
  const [dataRows, setDataRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // Summary & Charts State
  const [summaryCards, setSummaryCards] = useState<any>({
    order: 0,
    drop: 0,
    deviasi: 0,
    sulam: 0,
    pctDrop: 0,
    pctSulam: 0,
  });
  const [wilayahSummary, setWilayahSummary] = useState<any[]>([]);
  const [umurForcingChart, setUmurForcingChart] = useState<any[]>([]);
  const [overallDropVsSulam, setOverallDropVsSulam] = useState<any[]>([]);
  const [sebaranBibitChart, setSebaranBibitChart] = useState<any[]>([]);
  const [prosesList, setProsesList] = useState<string[]>([]);

  // Filter Bar
  const [search, setSearch] = useState('');
  const [selectedWilayah, setSelectedWilayah] = useState<string[]>([]);
  const [selectedProses, setSelectedProses] = useState<string>('ALL');
  const [isWilayahOpen, setIsWilayahOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent && dataRows.length === 0) setLoading(true);
      const wilParam =
        selectedWilayah.length > 0 && selectedWilayah.length < WILAYAH_LIST.length
          ? selectedWilayah.join(',')
          : '';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (wilParam) params.set('wilayah', wilParam);
      if (selectedProses && selectedProses !== 'ALL') params.set('proses', selectedProses);

      const res = await fetch(`/api/sulam/monitoring?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setDataRows(json.rows || []);
        if (json.summaryCards) setSummaryCards(json.summaryCards);
        if (json.wilayahSummary) setWilayahSummary(json.wilayahSummary);
        if (json.umurForcingChart) setUmurForcingChart(json.umurForcingChart);
        if (json.overallDropVsSulam) setOverallDropVsSulam(json.overallDropVsSulam);
        if (json.sebaranBibitChart) setSebaranBibitChart(json.sebaranBibitChart);
        if (json.prosesList) setProsesList(json.prosesList);
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
  }, [page, search, selectedWilayah, selectedProses]);

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
  }, [page, search, selectedWilayah, selectedProses]);

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
    <div className="space-y-6">
      {/* 1. Top Banner & Export Excel */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-600 to-emerald-700 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
              <Sprout className="w-4 h-4 text-white" />
            </span>
            <h2 className="text-base sm:text-lg font-black tracking-tight">Monitoring List Sulam</h2>
          </div>
          <p className="text-xs text-white/80 max-w-xl">
            Tabel summary dinamis dan dashboard analitik pemenuhan order, drop ritase, serta realisasi sulam bibit per wilayah.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Keterangan Proses */}
          {prosesList.length > 0 && (
            <select
              value={selectedProses}
              onChange={(e) => {
                setSelectedProses(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs transition-colors border border-white/20 cursor-pointer focus:outline-hidden"
            >
              <option value="ALL" className="text-slate-800">Semua Proses</option>
              {prosesList.map((pr) => (
                <option key={pr} value={pr} className="text-slate-800">
                  {pr}
                </option>
              ))}
            </select>
          )}

          <a
            href="/api/sulam/export"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-emerald-800 hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel</span>
          </a>
        </div>
      </div>

      {/* 2. 6 KPI Summary Cards Sesuai Permintaan */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Order */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order</span>
            <span className="p-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Package className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {summaryCards.order} <span className="text-[11px] font-normal text-slate-400 font-sans">Rit</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total permintaan rit</div>
        </div>

        {/* Card 2: Drop */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Drop</span>
            <span className="p-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Truck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {summaryCards.drop} <span className="text-[11px] font-normal text-slate-400 font-sans">Rit</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total drop ritase</div>
        </div>

        {/* Card 3: Deviasi */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Deviasi</span>
            <span className="p-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Activity className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {summaryCards.deviasi} <span className="text-[11px] font-normal text-slate-400 font-sans">Rit</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Order - Drop</div>
        </div>

        {/* Card 4: Sulam */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sulam</span>
            <span className="p-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {summaryCards.sulam} <span className="text-[11px] font-normal text-slate-400 font-sans">Rit</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total real sulam</div>
        </div>

        {/* Card 5: %Drop */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">% Drop</span>
            <span className="p-1 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Percent className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            {summaryCards.pctDrop}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Rata-rata (Total % / 7)</div>
        </div>

        {/* Card 6: %Sulam */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">% Sulam</span>
            <span className="p-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {summaryCards.pctSulam}%
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Rata-rata (Total % / 7)</div>
        </div>
      </div>

      {/* 3. Summary Monitor Sulam Per Wilayah Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Summary Monitor Sulam Per Wilayah
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {selectedProses !== 'ALL' ? `Proses: ${selectedProses}` : 'Semua Proses'}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-2xs">
          <table className="w-full text-center border-collapse text-xs whitespace-nowrap">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center w-24">Wilayah</th>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center">Order (Rit)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center">Drop (Rit)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center">Deviasi (Rit)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center">Sulam (Rit)</th>
                <th className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-center">% Drop</th>
                <th className="py-2.5 px-3 text-center">% Sulam</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-slate-800 dark:text-slate-200">
              {wilayahSummary.map((item) => (
                <tr key={item.wilayah} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 font-bold font-sans">
                    {item.wilayah}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 text-blue-600 dark:text-blue-400 font-bold">
                    {item.order}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 text-amber-600 dark:text-amber-400 font-bold">
                    {item.drop}
                  </td>
                  <td className={`py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 font-bold ${item.deviasi > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {item.deviasi}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 text-emerald-600 dark:text-emerald-400 font-bold">
                    {item.sulam}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200/70 dark:border-slate-800/70 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      {item.pctDrop}%
                    </span>
                  </td>
                  <td className="py-2 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {item.pctSulam}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Total Row */}
            <tfoot className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-white">
              <tr>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 font-sans">
                  Total
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
                  {summaryCards.order}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400">
                  {summaryCards.drop}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400">
                  {summaryCards.deviasi}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400">
                  {summaryCards.sulam}
                </td>
                <td className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 text-cyan-600 dark:text-cyan-400">
                  {summaryCards.pctDrop}%
                </td>
                <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">
                  {summaryCards.pctSulam}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. GRAFIK MONITOR SULAM: 4 VISUALISASI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik 1: Monitor Sulam Per Wilayah (Bar: Order, Drop, Sulam | Line: %Drop, %Sulam) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Grafik Monitor Sulam Per Wilayah
            </h4>
            <p className="text-[11px] text-slate-500">
              Batang: Order, Drop, Sulam (Rit) • Garis: %Drop & %Sulam
            </p>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={wilayahSummary} margin={{ top: 20, right: 15, bottom: 20, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="wilayah" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} unit=" Rit" />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: '#10b981' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                <Bar yAxisId="left" dataKey="order" name="Order" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Bar yAxisId="left" dataKey="drop" name="Drop" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Bar yAxisId="left" dataKey="sulam" name="Sulam" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={25} />
                <Line yAxisId="right" type="monotone" dataKey="pctDrop" name="% Drop" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="pctSulam" name="% Sulam" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 2: Batang Proses Sulam / Umur Forcing (Bar: %Drop | Line: %Sulam) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Grafik Batang Proses Sulam (Umur Forcing)
            </h4>
            <p className="text-[11px] text-slate-500">
              Batang: %Drop • Garis: %Sulam berdasarkan tahapan umur forcing
            </p>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={umurForcingChart} margin={{ top: 20, right: 15, bottom: 20, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="kategori" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
                <Bar dataKey="pctDrop" name="% Drop" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={40} label={renderCustomBarVal} />
                <Line type="monotone" dataKey="pctSulam" name="% Sulam" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} label={renderCustomLineVal} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 3: Batang %Drop vs %Sulam (Perbandingan Keseluruhan) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Grafik Batang %Drop vs %Sulam
            </h4>
            <p className="text-[11px] text-slate-500">
              Perbandingan keseluruhan rata-rata pencapaian %Drop dan %Sulam
            </p>
          </div>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overallDropVsSulam} margin={{ top: 25, right: 30, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid #334155',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Persentase']}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={70} label={renderCustomBarVal}>
                  {overallDropVsSulam.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafik 4: Donat Sebaran Kebutuhan Bibit / Kelas */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Grafik Donat Sebaran Kebutuhan Bibit / Kelas
            </h4>
            <p className="text-[11px] text-slate-500">
              Proporsi kebutuhan ritase bibit sulam berdasarkan jenis/kelas
            </p>
          </div>
          <div className="h-72 w-full pt-2">
            {sebaranBibitChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                Tidak ada data bibit untuk ditampilkan.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                    formatter={(val: any) => [`${val} Rit`, 'Kebutuhan']}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Pie
                    data={sebaranBibitChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {sebaranBibitChart.map((entry, index) => (
                      <Cell key={`donut-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 5. Filter Bar & Controls Untuk Main Table */}
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
            placeholder="Cari Lokasi"
            className="w-full pl-8 pr-8 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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

      {/* 6. Main Table: 17 Kolom Berurutan List Sulam */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="max-h-[640px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 uppercase font-bold tracking-wider shadow-xs">
              {/* Baris 1 Header Grup */}
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th rowSpan={2} className="py-2.5 px-2.5 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[45px]">No</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[70px]">Wilayah</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[85px]">Lokasi</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">Jenis Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[80px]">Kelas Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[100px]">Tgl Rawat</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">Tgl STD Forcing</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">Tgl F Prod</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">Tgl F Max</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[105px]">Tgl Order</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[95px]">Umur Forcing</th>
                <th colSpan={3} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-blue-50/60 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                  Permintaan Ritase
                </th>
                <th colSpan={4} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                  Monitor Drop
                </th>
                <th colSpan={5} className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                  Monitor Sulam
                </th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[140px]">Spek Bibit</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[130px]">Ket Proses</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-700/80 min-w-[120px]">Ket Mati</th>
                <th rowSpan={2} className="py-2.5 px-3 text-center min-w-[130px]">Ket Ritase</th>
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
                    <p className="text-xs font-semibold">Tidak ada data lokasi yang cocok.</p>
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
            Halaman {page} dari {totalPages}
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
