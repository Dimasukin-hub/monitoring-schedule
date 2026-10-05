'use client';

import React, { useState } from 'react';
import { Wheat, CheckCircle2, AlertTriangle, Layers, Sprout } from 'lucide-react';
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

interface BibitViewProps {
  seedSummaries: Array<{
    type: string;
    kelas: string;
    kebutuhan: number;
    potensi: number;
    realisasi: number;
    deviasi: number;
  }>;
}

export default function BibitView({ seedSummaries = [] }: BibitViewProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const filtered = selectedType === 'ALL'
    ? seedSummaries
    : seedSummaries.filter((s) => s.type.toLowerCase().includes(selectedType.toLowerCase()));

  const totalKebutuhan = filtered.reduce((a, b) => a + (b.kebutuhan || 0), 0);
  const totalPotensi = filtered.reduce((a, b) => a + (b.potensi || 0), 0);
  const totalReal = filtered.reduce((a, b) => a + (b.realisasi || 0), 0);
  const totalDeviasi = totalPotensi - totalKebutuhan;

  return (
    <div className="space-y-6">
      {/* Top Banner (Bab 25 PRD) */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-slate-50 dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border border-amber-200 dark:border-amber-500/20 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wheat className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Monitoring Bibit (Bab 25 PRD)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Kebutuhan vs Potensi Bibit (Crown & Sucker)
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mt-1">
            Data pemantauan kesiapan bibit berdasarkan sheet Potensi Tanam, Monitor BB, Pot. Crown dan Pot. Sucker
            untuk menjamin ketersediaan bibit tepat waktu per kelas dan jenis tanaman.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shrink-0 shadow-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Saldo / Selisih</span>
            <span
              className={`text-2xl font-bold ${
                totalDeviasi >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {totalDeviasi >= 0 ? '+' : ''}
              {totalDeviasi.toFixed(1)} Ha
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold text-sm">
            {totalPotensi.toFixed(0)}
          </div>
        </div>
      </div>

      {/* KPI Cards for Seed */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Kebutuhan</span>
          <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1 block">
            {totalKebutuhan.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ha</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Rencana penanaman 2026</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Total Potensi Pasokan</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {totalPotensi.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ha</span>
          </span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-1 block">Ketersediaan dari kebun bibit</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-blue-200 dark:border-blue-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Realisasi Penggunaan</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">
            {totalReal.toFixed(1)} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">Ha</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Bibit tertanam aktual</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-cyan-200 dark:border-cyan-500/30 glass-panel shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Status Keseimbangan</span>
          <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400 mt-1 block">
            {totalDeviasi >= 0 ? 'Surplus' : 'Defisit'}
          </span>
          <span className="text-[11px] text-cyan-700 dark:text-cyan-400/80 mt-1 block">
            {totalDeviasi >= 0
              ? 'Pasokan bibit mencukupi kebutuhan'
              : 'Perlu realokasi bibit antar wilayah'}
          </span>
        </div>
      </div>

      {/* Filter Tabs by Seed Type */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'ALL', label: 'Semua Sumber Bibit' },
          { id: 'Crown', label: 'Crown (Mahkota)' },
          { id: 'Sucker', label: 'Sucker (Tunas Batang)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedType === tab.id
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Comparison Chart */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 glass-panel shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4">
          Perbandingan Kebutuhan vs Potensi Bibit per Kelas (Ha)
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filtered} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} vertical={false} />
              <XAxis
                dataKey="kelas"
                stroke={isDark ? '#64748b' : '#94a3b8'}
                fontSize={11}
                tickFormatter={(val, idx) => `${filtered[idx]?.type || ''} - ${val}`}
              />
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
                formatter={(val: any) => [`${Number(val).toFixed(2)} Ha`]}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="kebutuhan" name="Kebutuhan (Ha)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="potensi" name="Potensi Bibit (Ha)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="realisasi" name="Realisasi (Ha)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table Breakdown (Bab 25 PRD) */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden glass-panel shadow-xs">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Rincian Saldo Bibit Berdasarkan Sheet Potensi Tanam
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
            Sumber data: Sheet Potensi Tanam & Monitor BB
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-slate-950/80 text-slate-700 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Sumber Bibit</th>
              <th className="py-3 px-4">Kelas</th>
              <th className="py-3 px-4 text-right">Kebutuhan (Ha)</th>
              <th className="py-3 px-4 text-right">Potensi Bibit (Ha)</th>
              <th className="py-3 px-4 text-right">Realisasi (Ha)</th>
              <th className="py-3 px-4 text-right">Deviasi (Ha)</th>
              <th className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-800 dark:text-slate-300">
            {filtered.map((s, idx) => (
              <tr key={idx} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/40">
                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">{s.type}</td>
                <td className="py-3 px-4 font-medium text-emerald-700 dark:text-emerald-400">{s.kelas}</td>
                <td className="py-3 px-4 text-right font-medium text-blue-700 dark:text-blue-300">{s.kebutuhan.toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">{s.potensi.toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">{(s.realisasi || 0).toFixed(2)}</td>
                <td
                  className={`py-3 px-4 text-right font-bold ${
                    s.deviasi >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {s.deviasi >= 0 ? '+' : ''}
                  {s.deviasi.toFixed(2)}
                </td>
                <td className="py-3 px-4 text-center">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.deviasi >= 0
                        ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                        : 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/30'
                    }`}
                  >
                    {s.deviasi >= 0 ? 'Aman' : 'Perlu Tambahan'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
