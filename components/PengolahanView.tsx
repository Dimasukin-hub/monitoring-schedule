'use client';

import React, { useState } from 'react';
import {
  Tractor,
  CheckCircle2,
  Clock,
  CircleDashed,
  ArrowRight,
  Layers,
  Sparkles,
} from 'lucide-react';

interface PengolahanViewProps {
  activityFunnel: Array<{
    code: string;
    name: string;
    stepOrder: number;
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
    completionRate: number;
  }>;
  onFilterByActivity?: (code: string) => void;
}

export default function PengolahanView({
  activityFunnel = [],
  onFilterByActivity,
}: PengolahanViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'EARLY' | 'MID' | 'FINAL'>('ALL');

  // Categorize activities into 3 main operational phases
  const getCategory = (order: number) => {
    if (order <= 5) return 'EARLY'; // Chopper, Dolomit
    if (order <= 16) return 'MID';   // Bajak, Subsoiler, Finishing, Ridger
    return 'FINAL';                  // Siap Tanam, Proses Tanam, Selesai Tanam
  };

  const filteredActivities = activityFunnel.filter((act) => {
    if (selectedCategory === 'ALL') return true;
    return getCategory(act.stepOrder) === selectedCategory;
  });

  const totalCompletedSum = activityFunnel.reduce((acc, curr) => acc + curr.completed, 0);
  const totalTasks = activityFunnel.reduce((acc, curr) => acc + curr.total, 0);
  const globalPrepRate = totalTasks > 0 ? Math.round((totalCompletedSum / totalTasks) * 100) : 0;

  // Pipeline stages for Bab 11 PRD flow
  const pipelineFlow = [
    { code: '01.CHOPPER', label: 'Chopper' },
    { code: '05.DOLOMIT', label: 'Dolomit' },
    { code: '11.BAJAK_AWAL', label: 'Bajak' },
    { code: '17.SUBSOILER', label: 'Subsoiler' },
    { code: '19.FINISHING_ROTARY', label: 'Finishing' },
    { code: '21.RIDGER', label: 'Ridger' },
    { code: '22.SIAP_TANAM', label: 'Siap Tanam' },
  ];

  const funnelMap = new Map(activityFunnel.map((a) => [a.code, a]));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-teal-300 dark:border-teal-500/20 glass-panel flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xs transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/15 dark:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Tractor className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
              Tahapan Aktivitas Fisik (Bab 11 PRD)
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Monitoring 19 Tahapan Aktivitas Pengolahan Tanah
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-1">
            Pantau progres operasional secara granular mulai dari tahap Chopper, Aplikasi Dolomit,
            Bajak, Subsoiler, Finishing, Ridger, hingga lokasi Siap dan Selesai Tanam.
          </p>
        </div>

        {/* Global Progress Dial */}
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shrink-0 shadow-xs">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Rata-Rata Selesai</span>
            <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">{globalPrepRate}%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/15 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-sm">
            {totalCompletedSum}
          </div>
        </div>
      </div>

      {/* Visual Pipeline Stepper Flow (Bab 11 PRD) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 glass-panel space-y-3 shadow-xs transition-colors">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" /> Alur Tahapan Pengolahan Lahan Utama
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Visualisasi hierarki alur persiapan fisik tanah per <strong>Lokasi</strong> sesuai standar operasional perkebunan.
        </p>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-[700px]">
            <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shrink-0 text-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block uppercase">Start</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">Lokasi</span>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-600 shrink-0" />

            {pipelineFlow.map((step, idx) => {
              const act = funnelMap.get(step.code);
              const rate = act?.completionRate || 0;
              const isFinished = rate >= 80;
              return (
                <React.Fragment key={step.code}>
                  <div className="flex-1 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 transition-colors flex flex-col justify-between min-w-[90px] shadow-xs">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{step.label}</span>
                      <span className={`font-mono font-bold ${isFinished ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {rate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-1">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block text-right font-mono">
                      {act?.completed || 0} Lokasi
                    </span>
                  </div>
                  {idx < pipelineFlow.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phase Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        {[
          { id: 'ALL', label: 'Semua Tahapan (19)' },
          { id: 'EARLY', label: 'Tahap 1: Sanitasi & Pengapuran' },
          { id: 'MID', label: 'Tahap 2: Pengolahan Tanah Utama' },
          { id: 'FINAL', label: 'Tahap 3: Persiapan Tanam' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === tab.id
                ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredActivities.map((act) => {
          const isHigh = act.completionRate >= 80;
          const isMid = act.completionRate >= 40 && act.completionRate < 80;

          return (
            <div
              key={act.code}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-teal-500/40 glass-panel glass-panel-hover flex flex-col justify-between transition-all shadow-xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    Tahap #{act.stepOrder}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      isHigh
                        ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                        : isMid
                        ? 'text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                        : 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20'
                    }`}
                  >
                    {act.completionRate}%
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">{act.name}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4 font-mono">{act.code}</p>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isHigh
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-400'
                        : isMid
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-400'
                        : 'bg-gradient-to-r from-amber-600 to-yellow-400'
                    }`}
                    style={{ width: `${act.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Status Breakdown Footer */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-bold">
                    {act.completed}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block">Selesai</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-bold">
                    {act.inProgress}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block">Proses</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 block font-bold">
                    {act.pending}
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 block">Belum</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
