'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Wrench, Clock, ShieldAlert, Sparkles } from 'lucide-react';

export default function PlantMaintenancePage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Wrench className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 mb-3">
            <Clock className="w-3.5 h-3.5" />
            Dalam Tahap Pengembangan
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            PLANT MAINTENANCE
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Modul pemeliharaan fasilitas pabrik, armada traktor kebun, pompa irigasi, dan jadwal inspeksi preventif saat ini sedang dalam persiapan dan integrasi sistem.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs sm:text-sm shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Halaman Portal Utama</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
