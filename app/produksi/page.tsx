'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Factory, Clock, PackageCheck, Sparkles } from 'lucide-react';

export default function ProduksiPage() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-none">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
          <Factory className="w-8 h-8" />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 mb-3">
            <Clock className="w-3.5 h-3.5" />
            Dalam Tahap Pengembangan
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            PRODUKSI
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Modul pengolahan nanas, lini pengalengan, kapasitas tonase harian, serta distribusi hasil produksi cannery saat ini sedang dalam persiapan dan integrasi sistem.
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
