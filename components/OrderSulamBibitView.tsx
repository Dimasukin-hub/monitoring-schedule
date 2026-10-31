'use client';

import React from 'react';
import { Sprout, Clock, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function OrderSulamBibitView() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-300">
      <div className="relative overflow-hidden p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-sm backdrop-blur-md text-center">
        {/* Glow Element */}
        <div className="absolute top-0 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Icon Header */}
        <div className="inline-flex p-4 rounded-3xl bg-emerald-500/15 text-[#00873D] border border-emerald-500/30 shadow-inner mb-6">
          <Sprout className="w-10 h-10 stroke-[2.2] animate-bounce" />
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[#00873D] text-xs font-bold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Modul Operasional Wilayah</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          Order Sulam Bibit Tanaman
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed mb-8">
          Sub-menu ini disiapkan khusus untuk pencatatan dan pengelolaan permintaan kebutuhan sulam bibit nanas antar-wilayah. 
          Alur formulir dan integrasi stok bibit sedang dalam tahap persiapan materi operasional.
        </p>

        {/* Status Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Modul</span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Tahap Perancangan
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pondasi Database</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Siap Dihubungkan
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Fokus Aktif</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" /> Order Gorong-Gorong
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
